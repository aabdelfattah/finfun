export interface StockData {
    symbol: string;
    sector: string;
    dividendYield: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    pe: number | null;
    discountFrom52W: number | null;
    price: number | null;
}

interface NormalizedScore {
    symbol: string;
    healthScore: number;
    valueScore: number;
    totalScore: number;
}

function normalizeParameter(values: (number | null)[], reference: (number | null)[]): number[] {
    // Use reference set for mean/std
    const validRef = reference.filter((v): v is number => v !== null);
    if (validRef.length === 0) return values.map(() => 0);
    
    const mean = validRef.reduce((a, b) => a + b, 0) / validRef.length;
    
    // Handle cases where we have insufficient data for standard deviation
    if (validRef.length <= 1) {
        return values.map(v => v === null ? 0 : v - mean);
    }
    
    const variance = validRef.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (validRef.length - 1);
    const std = Math.sqrt(variance);
    
    // Handle zero standard deviation (all values are the same)
    if (std === 0 || !isFinite(std)) {
        return values.map(v => v === null ? 0 : v - mean);
    }
    
    return values.map(v => {
        if (v === null) return 0;
        const normalized = (v - mean) / std;
        return isFinite(normalized) ? normalized : 0;
    });
}

export function calculateNormalizedScores(
    portfolioStocks: StockData[],
    referenceStocks: StockData[]
): NormalizedScore[] {
    // Extract all values for each metric from reference set
    const refDividendYields = referenceStocks.map(s => s.dividendYield);
    const refProfitMargins = referenceStocks.map(s => s.profitMargins);
    const refDebtToEquity = referenceStocks.map(s => s.debtToEquity);
    const refPERatios = referenceStocks.map(s => s.pe);
    const refDiscounts = referenceStocks.map(s => s.discountFrom52W);

    // Extract all values for each metric from portfolio
    const dividendYields = portfolioStocks.map(s => s.dividendYield);
    const profitMargins = portfolioStocks.map(s => s.profitMargins);
    const debtToEquity = portfolioStocks.map(s => s.debtToEquity);
    const peRatios = portfolioStocks.map(s => s.pe);
    const discounts = portfolioStocks.map(s => s.discountFrom52W);

    // Normalize each metric using reference set
    const normalizedDividendYields = normalizeParameter(dividendYields, refDividendYields);
    const normalizedProfitMargins = normalizeParameter(profitMargins, refProfitMargins);
    const normalizedDebtToEquity = normalizeParameter(debtToEquity, refDebtToEquity);
    const normalizedPERatios = normalizeParameter(peRatios, refPERatios);
    const normalizedDiscounts = normalizeParameter(discounts, refDiscounts);

    // Calculate raw scores for each stock
    const rawScores = portfolioStocks.map((_stock, index) => {
        // Health score components (1/3 weight each)
        const healthScore = (
            (1/3) * normalizedDividendYields[index] +
            (1/3) * normalizedProfitMargins[index] +
            (-1/3) * normalizedDebtToEquity[index]  // Negative because lower is better
        );

        // Value score components
        const valueScore = (
            (-0.6) * normalizedPERatios[index] +  // Negative because lower is better
            (0.4) * normalizedDiscounts[index]
        );

        // Total score (equal weight to health and value)
        const totalScore = (healthScore + valueScore) / 2;

        return { healthScore, valueScore, totalScore };
    });

    // Find min/max for scaling (within portfolio only)
    const minHealth = Math.min(...rawScores.map(s => s.healthScore));
    const maxHealth = Math.max(...rawScores.map(s => s.healthScore));
    const minValue = Math.min(...rawScores.map(s => s.valueScore));
    const maxValue = Math.max(...rawScores.map(s => s.valueScore));
    const minTotal = Math.min(...rawScores.map(s => s.totalScore));
    const maxTotal = Math.max(...rawScores.map(s => s.totalScore));

    // Scale scores to 0-100 range (within portfolio)
    return portfolioStocks.map((stock, index) => {
        const { healthScore, valueScore, totalScore } = rawScores[index];
        
        // Helper function to safely scale scores
        const safeScale = (score: number, min: number, max: number): number => {
            if (!isFinite(score) || !isFinite(min) || !isFinite(max)) return 50;
            if (max === min) return 50;
            const scaled = 50 + (score - min) / (max - min) * 50;
            return isFinite(scaled) ? Math.max(0, Math.min(100, scaled)) : 50;
        };
        
        const scaledHealthScore = safeScale(healthScore, minHealth, maxHealth);
        const scaledValueScore = safeScale(valueScore, minValue, maxValue);
        const scaledTotalScore = safeScale(totalScore, minTotal, maxTotal);
        
        return {
            symbol: stock.symbol,
            healthScore: scaledHealthScore,
            valueScore: scaledValueScore,
            totalScore: scaledTotalScore
        };
    });
} 