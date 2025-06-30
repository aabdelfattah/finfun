from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Any
import asyncio
from pydantic import BaseModel
import uvicorn

from finrobot_api.finrobot_market_api import MarketAnalystService, AnalysisResponse
from my_api.sector_normalization import main as sector_normalization_main

app = FastAPI(
    title="FinFun API",
    description="API for financial analysis and portfolio management",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Market Analyst service
market_analyst = MarketAnalystService()

@app.get("/")
async def root():
    return {
        "message": "Welcome to FinFun API",
        "endpoints": {
            "market_analysis": "/api/analyze/{symbol}",
            "sector_normalization": "/api/sectors/normalization"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/api/analyze/{symbol}")
async def analyze_stock(
    symbol: str,
    timeframe: str = Query(
        default="Next Week", 
        description="Timeframe: Next Week or Next Month"
    )
) -> AnalysisResponse:
    """
    Analyze a stock using FinRobot's Market Analyst.
    Returns detailed analysis including predictions and key factors.
    """
    try:
        result = market_analyst.analyze_stock(symbol, timeframe)
        return AnalysisResponse(
            symbol=symbol,
            analysis_date=result.get("analysis_date", ""),
            analysis_type=timeframe,
            analysis_text=result.get("analysis_text", ""),
            success=result.get("success", False),
            error_message=result.get("error_message")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sectors/normalization")
async def get_sector_normalization():
    """
    Get sector normalization data.
    """
    try:
        result = await sector_normalization_main()
        print("\n=== Python API Sector Normalization Results ===")
        print("Number of sectors:", len(result))
        for sector in result:
            print(f"\nSector: {sector['name']}")
            print("Metrics:", sector['metrics'])
        print("===========================================\n")
        return result
    except Exception as e:
        print("Error in sector normalization:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)