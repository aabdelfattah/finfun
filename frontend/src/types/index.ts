export interface PortfolioEntry {
    id: number;
    stockSymbol: string;
    allocationPercentage: number;
    createdAt: string;
    updatedAt: string;
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
    discountAllTimeHigh: number | null;
    analyzedAt: string;
} 