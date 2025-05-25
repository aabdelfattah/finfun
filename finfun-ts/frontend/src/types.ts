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