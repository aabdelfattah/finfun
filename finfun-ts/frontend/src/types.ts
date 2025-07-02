export interface PortfolioStock {
    id: number;
    stockSymbol: string;
    allocationPercentage: number;
    portfolioId: number;
    createdAt: string;
    updatedAt: string;
}

export interface Portfolio {
    id: number;
    name: string;
    userId: number;
    stocks: PortfolioStock[];
    createdAt: string;
    updatedAt: string;
}

export interface TickerData {
    symbol: string;
    name: string;
    marketCategory: string;
    etf: boolean;
}

export interface BetterAlternative {
    stockSymbol: string;
    healthScore: number;
    valueScore: number;
    totalScore: number;
    recommendation: string;
    pe: number | null;
    dividendYield: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    price: number | null;
}

export interface StockAnalysis {
    id: number;
    stockSymbol: string;
    sector: string;
    healthScore: number;
    valueScore: number;
    totalScore: number;
    recommendation: string;
    pe: number | null;
    dividendYield: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    discountAllTimeHigh: number | null;
    price: number | null;
    portfolioId: number;
    analyzedAt: string;
    betterAlternatives: BetterAlternative[];
}

export interface AnalysisResponse {
    message: string;
    analyses: StockAnalysis[];
    analyzedAt: string | null;
}

export interface SectorMetrics {
    sector: string;
    avgHealthScore: number;
    avgValueScore: number;
    avgTotalScore: number;
    stocks: {
        symbol: string;
        healthScore: number;
        valueScore: number;
        totalScore: number;
        recommendation: string;
        isInPortfolio: boolean;
    }[];
}

// AI Analysis Types
export interface AIStockAnalysis {
    id: number;
    stockSymbol: string;
    timeframe: 'Next Week' | 'Next Month';
    analysisText: string;
    portfolioIds: number[];
    success: boolean;
    errorMessage?: string;
    analyzedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface AIAnalysisResponse {
    aiAnalyses: AIStockAnalysis[];
    needsRefresh: boolean;
    totalStocks: number;
    analyzedStocks: number;
}

export interface AIAnalysisResult {
    message: string;
    aiAnalyses: AIStockAnalysis[];
    summary: {
        total: number;
        successful: number;
        failed: number;
        timeframe: string;
    };
    errors: {
        symbol: string;
        error: string;
    }[];
}

export interface EnhancedStockAnalysis {
    symbol: string;
    traditional: StockAnalysis | null;
    ai: AIStockAnalysis | null;
    hasTraditional: boolean;
    hasAI: boolean;
    needsAIAnalysis: boolean;
}

export interface EnhancedAnalysisResponse {
    enhancedAnalyses: EnhancedStockAnalysis[];
    summary: {
        totalStocks: number;
        withTraditional: number;
        withAI: number;
        needingAI: number;
    };
} 