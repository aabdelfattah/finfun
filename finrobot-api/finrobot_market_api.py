#!/usr/bin/env python3
"""
FinRobot Market Analyst API
FastAPI service that provides market analysis using FinRobot's Market_Analyst agent
"""

import asyncio
import io
import sys
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime
from typing import Optional, Dict, Any
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import autogen
from finrobot.utils import get_current_date, register_keys_from_json
from finrobot.agents.workflow import SingleAssistant


app = FastAPI(
    title="FinRobot Market Analyst API",
    description="AI-powered financial market analysis using FinRobot",
    version="1.0.0"
)


class AnalysisResponse(BaseModel):
    symbol: str
    analysis_date: str
    analysis_type: str
    analysis_text: str
    success: bool
    error_message: Optional[str] = None


class MarketAnalystService:
    """Service class to handle FinRobot Market Analyst operations"""
    
    def __init__(self):
        self.assistant = None
        self._initialize_assistant()
    
    def _initialize_assistant(self):
        """Initialize the FinRobot Market Analyst agent"""
        try:
            # Configure LLM with Azure OpenAI setup
            llm_config = {
                "config_list": autogen.config_list_from_json(
                    "OAI_CONFIG_LIST",
                    filter_dict={"model": ["gpt-41"]},
                ),
                "timeout": 120,
                "temperature": 0.1,  # Lower for more consistent analysis
            }
            
            # Register API keys for financial data sources
            register_keys_from_json("config_api_keys")
            
            # Create the Market Analyst agent
            self.assistant = SingleAssistant(
                "Market_Analyst",
                llm_config,
                human_input_mode="NEVER",
                max_consecutive_auto_reply=15,
                code_execution_config={
                    "work_dir": "market_analysis",
                    "use_docker": False,
                },
            )
            print("✅ FinRobot Market Analyst initialized successfully")
            
        except Exception as e:
            print(f"❌ Error initializing Market Analyst: {e}")
            raise
    
    def analyze_stock(self, symbol: str, analysis_type: str = "standard") -> Dict[str, Any]:
        """Analyze a stock using FinRobot's Market Analyst"""
        
        if not self.assistant:
            raise RuntimeError("Market Analyst not initialized")
        
        current_date = get_current_date()
        
        # Create analysis prompt based on type
        if analysis_type == "quick":
            prompt = (
                f"Use the tools to analyze {symbol} stock on {current_date}. "
                f"Get basic company info, recent financials, and news. "
                f"Provide a brief prediction for next week with 2-3 key factors."
            )
        elif analysis_type == "deep":
            prompt = (
                f"Conduct comprehensive analysis of {symbol} stock on {current_date}. "
                f"Use all available tools to retrieve company profile, financials, and recent news. "
                f"Analyze positive developments and potential concerns with 4-6 factors. "
                f"Provide detailed prediction for next week with confidence level."
            )
        else:  # standard
            prompt = (
                f"Use all the tools provided to retrieve information available for {symbol} upon {current_date}. "
                f"Analyze the positive developments and potential concerns of {symbol} "
                f"with 2-4 most important factors respectively and keep them concise. "
                f"Most factors should be inferred from company related news. "
                f"Then make a rough prediction (e.g. up/down by 2-3%) of the {symbol} stock price movement for next week. "
                f"Provide a summary analysis to support your prediction."
            )
        
        # Capture the analysis output
        output_buffer = io.StringIO()
        error_buffer = io.StringIO()
        
        try:
            # Reset the assistant for fresh analysis
            self.assistant.reset()
            
            # Redirect stdout and stderr to capture the conversation
            with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
                self.assistant.chat(prompt)
            
            # Get the captured output
            raw_analysis = output_buffer.getvalue()
            error_output = error_buffer.getvalue()
            
            # Extract clean analysis from the raw output
            clean_analysis = self._extract_clean_analysis(raw_analysis)
            
            return {
                "success": True,
                "analysis_text": clean_analysis,
                "error_message": error_output if error_output else None
            }
            
        except Exception as e:
            return {
                "success": False,
                "analysis_text": "",
                "error_message": str(e)
            }
    
    def _extract_clean_analysis(self, raw_text: str) -> str:
        """Extract the clean analysis from the raw conversation log"""
        try:
            # Look for the pattern where the actual analysis starts
            # It usually comes after all the tool responses and before TERMINATE
            
            # First, find all the tool response sections and skip them
            lines = raw_text.split('\n')
            
            # Look for the start of the actual analysis (after all tool responses)
            analysis_start = -1
            for i, line in enumerate(lines):
                # Look for lines that indicate the start of actual analysis
                if (line.strip().startswith("Here") and 
                    any(word in line.lower() for word in ["analysis", "summary", "prediction"]) and
                    "tool" not in line.lower()):
                    analysis_start = i
                    break
                # Alternative: look for structured analysis sections
                elif (line.strip() and 
                      any(phrase in line for phrase in ["Company Overview:", "Recent Financials:", "Prediction for"])):
                    analysis_start = i
                    break
            
            if analysis_start != -1:
                # Find where the analysis ends
                analysis_end = len(lines)
                for i in range(analysis_start, len(lines)):
                    if "TERMINATE" in lines[i]:
                        analysis_end = i
                        break
                
                # Extract the analysis section
                analysis_lines = lines[analysis_start:analysis_end]
                
                # Clean up the lines
                clean_lines = []
                for line in analysis_lines:
                    line = line.strip()
                    if (line and 
                        not line.startswith("*****") and
                        not line.startswith("---") and
                        line != "Market_Analyst (to User_Proxy):"):
                        clean_lines.append(line)
                
                clean_analysis = '\n'.join(clean_lines)
                
                # If we got substantial content, return it
                if len(clean_analysis) > 100:
                    return clean_analysis
            
            # Fallback: Look for any substantial analysis text
            # Find the last substantial paragraph before TERMINATE
            if "TERMINATE" in raw_text:
                before_terminate = raw_text.split("TERMINATE")[0]
                paragraphs = before_terminate.split('\n\n')
                
                # Get the last few substantial paragraphs
                substantial_paragraphs = [p.strip() for p in paragraphs[-5:] 
                                        if len(p.strip()) > 50 and 
                                        "tool" not in p.lower() and
                                        "*****" not in p]
                
                if substantial_paragraphs:
                    return '\n\n'.join(substantial_paragraphs[-3:])  # Last 3 substantial paragraphs
            
            return "Analysis completed successfully. Please check the full response for details."
                
        except Exception as e:
            return f"Analysis completed but text extraction failed: {str(e)}"


# Initialize the service
market_service = MarketAnalystService()


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "FinRobot Market Analyst API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/analyze/{symbol}",
            "health": "/health"
        },
        "example": "GET /analyze/NVDA?analysis_type=quick"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "FinRobot Market Analyst API"
    }


@app.get("/analyze/{symbol}")
async def analyze_stock(
    symbol: str,
    analysis_type: str = Query(
        default="standard", 
        description="Analysis type: quick, standard, or deep"
    )
) -> AnalysisResponse:
    """
    Analyze a stock using FinRobot Market Analyst
    
    - **symbol**: Stock symbol (e.g., NVDA, AAPL, MSFT)
    - **analysis_type**: Type of analysis (quick, standard, deep)
    
    Examples:
    - GET /analyze/NVDA
    - GET /analyze/AAPL?analysis_type=quick  
    - GET /analyze/TSLA?analysis_type=deep
    """
    
    # Validate input
    if not symbol or len(symbol.strip()) == 0:
        raise HTTPException(status_code=400, detail="Symbol is required")
    
    symbol = symbol.upper().strip()
    analysis_type = analysis_type.lower() if analysis_type else "standard"
    
    if analysis_type not in ["standard", "quick", "deep"]:
        raise HTTPException(
            status_code=400, 
            detail="analysis_type must be one of: standard, quick, deep"
        )
    
    try:
        # Run the analysis in an executor to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            market_service.analyze_stock, 
            symbol, 
            analysis_type
        )
        
        return AnalysisResponse(
            symbol=symbol,
            analysis_date=get_current_date(),
            analysis_type=analysis_type,
            analysis_text=result["analysis_text"],
            success=result["success"],
            error_message=result["error_message"]
        )
        
    except Exception as e:
        return AnalysisResponse(
            symbol=symbol,
            analysis_date=get_current_date(),
            analysis_type=analysis_type,
            analysis_text="",
            success=False,
            error_message=f"Analysis failed: {str(e)}"
        )


if __name__ == "__main__":
    print("🤖 Starting FinRobot Market Analyst API...")
    print("📈 Visit http://localhost:8000/docs for interactive API documentation")
    print("🔗 Example: curl 'http://localhost:8000/analyze/NVDA?analysis_type=quick'")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    ) 