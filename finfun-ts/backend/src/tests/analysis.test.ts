import { calculateNormalizedScores, StockData } from '../utils/analysisUtils';
import yahooFinance from 'yahoo-finance2';
import * as XLSX from 'xlsx';
import path from 'path';

interface YahooFinanceQuote {
    sector?: string;
    dividendYield?: number;
    profitMargins?: number;
    debtToEquity?: number;
    trailingPE?: number;
    regularMarketDayHigh?: number;
    regularMarketPrice?: number;
}

describe('Stock Analysis', () => {
    it('should normalize scores within sectors correctly', () => {
        // Test data with stocks from different sectors
        const testData: StockData[] = [
            // Technology sector
            {
                symbol: 'AAPL',
                sector: 'Technology',
                dividendYield: 0.5,
                profitMargins: 0.25,
                debtToEquity: 1.5,
                pe: 30,
                discountAllTimeHigh: 0.1
            },
            {
                symbol: 'MSFT',
                sector: 'Technology',
                dividendYield: 0.8,
                profitMargins: 0.35,
                debtToEquity: 0.8,
                pe: 35,
                discountAllTimeHigh: 0.05
            },
            // Healthcare sector
            {
                symbol: 'JNJ',
                sector: 'Healthcare',
                dividendYield: 2.5,
                profitMargins: 0.20,
                debtToEquity: 0.5,
                pe: 25,
                discountAllTimeHigh: 0.15
            },
            {
                symbol: 'PFE',
                sector: 'Healthcare',
                dividendYield: 3.0,
                profitMargins: 0.15,
                debtToEquity: 0.7,
                pe: 20,
                discountAllTimeHigh: 0.20
            }
        ];

        const results = calculateNormalizedScores(testData);

        // Verify results are grouped by sector
        const techStocks = results.filter(r => 
            testData.find(d => d.symbol === r.symbol)?.sector === 'Technology'
        );
        const healthStocks = results.filter(r => 
            testData.find(d => d.symbol === r.symbol)?.sector === 'Healthcare'
        );

        // Test 1: Each sector should have its own min/max scores
        expect(techStocks.length).toBe(2);
        expect(healthStocks.length).toBe(2);

        // Test 2: Scores within each sector should be normalized
        const techScores = techStocks.map(s => s.totalScore);
        const healthScores = healthStocks.map(s => s.totalScore);

        // Check if scores are properly scaled (between 0 and 100)
        techScores.forEach(score => {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        healthScores.forEach(score => {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        // Test 3: Better performing stocks should have higher scores
        // In Technology sector, MSFT has better metrics than AAPL
        const msftScore = techStocks.find(s => s.symbol === 'MSFT')!.totalScore;
        const aaplScore = techStocks.find(s => s.symbol === 'AAPL')!.totalScore;
        expect(msftScore).toBeGreaterThanOrEqual(aaplScore);

        // In Healthcare sector, JNJ has better metrics than PFE
        const jnjScore = healthStocks.find(s => s.symbol === 'JNJ')!.totalScore;
        const pfeScore = healthStocks.find(s => s.symbol === 'PFE')!.totalScore;
        expect(jnjScore).toBeGreaterThanOrEqual(pfeScore);
    });

    it('should handle missing data gracefully', () => {
        const testData: StockData[] = [
            {
                symbol: 'TEST1',
                sector: 'Test',
                dividendYield: null,
                profitMargins: 0.25,
                debtToEquity: null,
                pe: 30,
                discountAllTimeHigh: 0.1
            },
            {
                symbol: 'TEST2',
                sector: 'Test',
                dividendYield: 0.5,
                profitMargins: null,
                debtToEquity: 1.5,
                pe: null,
                discountAllTimeHigh: null
            }
        ];

        const results = calculateNormalizedScores(testData);
        expect(results.length).toBe(2);
        
        // Verify scores are still calculated and within range
        results.forEach(result => {
            expect(result.healthScore).toBeGreaterThanOrEqual(0);
            expect(result.healthScore).toBeLessThanOrEqual(100);
            expect(result.valueScore).toBeGreaterThanOrEqual(0);
            expect(result.valueScore).toBeLessThanOrEqual(100);
            expect(result.totalScore).toBeGreaterThanOrEqual(0);
            expect(result.totalScore).toBeLessThanOrEqual(100);
        });
    });
});

describe('Stock Analysis with Real Data', () => {
    it('should normalize scores similar to Excel', async () => {
        // Sample tech stocks
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'META'];
        
        // Fetch real data
        const stocksData: StockData[] = [];
        for (const symbol of symbols) {
            const quote = await yahooFinance.quote(symbol) as YahooFinanceQuote;
            stocksData.push({
                symbol,
                sector: quote.sector || 'Technology',
                dividendYield: quote.dividendYield || null,
                profitMargins: quote.profitMargins || null,
                debtToEquity: quote.debtToEquity || null,
                pe: quote.trailingPE || null,
                discountAllTimeHigh: calculateDiscountFromATH(quote)
            });
        }

        // Calculate normalized scores
        const normalizedScores = calculateNormalizedScores(stocksData);

        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        
        // Add raw data sheet
        const rawData = stocksData.map(stock => ({
            Symbol: stock.symbol,
            Sector: stock.sector,
            'Dividend Yield': stock.dividendYield,
            'Profit Margins': stock.profitMargins,
            'Debt to Equity': stock.debtToEquity,
            'P/E Ratio': stock.pe,
            'Discount from ATH': stock.discountAllTimeHigh
        }));
        const wsRaw = XLSX.utils.json_to_sheet(rawData);
        XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw Data');

        // Add normalized scores sheet
        const normalizedData = normalizedScores.map(score => ({
            Symbol: score.symbol,
            'Health Score': score.healthScore,
            'Value Score': score.valueScore,
            'Total Score': score.totalScore
        }));
        const wsNormalized = XLSX.utils.json_to_sheet(normalizedData);
        XLSX.utils.book_append_sheet(wb, wsNormalized, 'Normalized Scores');

        // Save to Excel
        const excelPath = path.join(__dirname, 'stock_analysis.xlsx');
        XLSX.writeFile(wb, excelPath);

        // Basic validation
        normalizedScores.forEach(score => {
            expect(score.healthScore).toBeGreaterThanOrEqual(0);
            expect(score.healthScore).toBeLessThanOrEqual(100);
            expect(score.valueScore).toBeGreaterThanOrEqual(0);
            expect(score.valueScore).toBeLessThanOrEqual(100);
            expect(score.totalScore).toBeGreaterThanOrEqual(0);
            expect(score.totalScore).toBeLessThanOrEqual(100);
        });
    });
});

function calculateDiscountFromATH(quote: YahooFinanceQuote): number | null {
    if (!quote.regularMarketDayHigh || !quote.regularMarketPrice) {
        return null;
    }
    return (quote.regularMarketDayHigh - quote.regularMarketPrice) / quote.regularMarketDayHigh;
} 