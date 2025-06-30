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
                system_message="You are a financial market analyst. Provide detailed analysis with all your thought process and tool usage visible in the output.",
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
                # Enable verbose mode for more detailed output
                self.assistant.verbose = True
                # Get the chat history
                chat_history = self.assistant.chat(prompt)
            
            # Get the captured output
            raw_analysis = output_buffer.getvalue()
            error_output = error_buffer.getvalue()
            
            # Include both the raw analysis, chat history, and any error output
            full_output = f"Raw Analysis:\n{raw_analysis}\n"
            if chat_history:
                full_output += f"\nChat History:\n{chat_history}\n"
            if error_output:
                full_output += f"\nError Output:\n{error_output}"
            
            return {
                "success": True,
                "analysis_text": full_output,
                "error_message": error_output if error_output else None
            }
            
        except Exception as e:
            return {
                "success": False,
                "analysis_text": "",
                "error_message": str(e)
            }


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
    print("📈 Visit http://localhost:8001/docs for interactive API documentation")
    print("🔗 Example: curl 'http://localhost:8001/analyze/NVDA?analysis_type=quick'")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info"
    ) 