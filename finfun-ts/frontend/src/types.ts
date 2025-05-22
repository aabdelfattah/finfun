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
    healthScore: number;
    valueScore: number;
    totalScore: number;
    recommendation: string;
    pe: number | null;
    dividendYield: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    price: number | null;
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