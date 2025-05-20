import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { Portfolio } from '../entities/Portfolio';
import { StockAnalysis } from '../entities/StockAnalysis';
import yahooFinance from 'yahoo-finance2';
import { StockData, calculateNormalizedScores } from '../utils/analysisUtils';

const router = Router();

// Define the exact shape of the Yahoo Finance quote data we need
interface YahooFinanceQuote {
    profitMargins?: number;
    dividendYield?: number;
    marketCap?: number;
    trailingPE?: number;
    regularMarketDayHigh?: number;
    regularMarketPrice?: number;
    debtToEquity?: number;
    sector?: string;
}

// Type assertion function to ensure quote has the shape we expect
function assertQuoteData(quote: any): YahooFinanceQuote {
    return {
        profitMargins: quote.profitMargins,
        dividendYield: quote.dividendYield,
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        regularMarketDayHigh: quote.regularMarketDayHigh,
        regularMarketPrice: quote.regularMarketPrice,
        debtToEquity: quote.debtToEquity,
        sector: quote.sector
    };
}

// Get latest analysis
router.get('/', async (_req: Request, res: Response) => {
    try {
        const analysisRepository = AppDataSource.getRepository(StockAnalysis);
        const analysis = await analysisRepository.find({
            order: { analyzedAt: 'DESC' }
        });
        res.json(analysis);
    } catch (error) {
        console.error('Error fetching analysis:', error);
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});

// Perform new analysis
router.post('/analyze', async (_req: Request, res: Response) => {
    try {
        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const analysisRepository = AppDataSource.getRepository(StockAnalysis);

        const portfolio = await portfolioRepository.find();
        if (!portfolio.length) {
            return res.status(400).json({ error: 'No portfolio data available' });
        }

        // Collect all stock data first
        const stocksData: StockData[] = [];
        for (const p of portfolio) {
            const rawQuote = await yahooFinance.quote(p.stockSymbol);
            const quote = assertQuoteData(rawQuote);
            
            stocksData.push({
                symbol: p.stockSymbol,
                sector: quote.sector || 'Unknown',
                dividendYield: quote.dividendYield || null,
                profitMargins: quote.profitMargins || null,
                debtToEquity: quote.debtToEquity || null,
                pe: quote.trailingPE || null,
                discountAllTimeHigh: calculateDiscountFromATH(quote)
            });
        }

        // Group stocks by sector
        const stocksBySector = stocksData.reduce((acc, stock) => {
            if (!acc[stock.sector]) {
                acc[stock.sector] = [];
            }
            acc[stock.sector].push(stock);
            return acc;
        }, {} as Record<string, StockData[]>);

        // Calculate normalized scores for each sector
        const normalizedScores = Object.entries(stocksBySector).flatMap(([_sector, sectorStocks]) => {
            // Use the same stocks as both portfolio and reference for sector-based normalization
            return calculateNormalizedScores(sectorStocks, sectorStocks);
        });

        const analysisResults = [];

        // Save analysis results
        for (const stock of normalizedScores) {
            const analysis = new StockAnalysis();
            analysis.stockSymbol = stock.symbol;
            analysis.healthScore = stock.healthScore;
            analysis.valueScore = stock.valueScore;
            analysis.totalScore = stock.totalScore;
            analysis.recommendation = getRecommendation(stock.totalScore);
            
            // Save original metrics
            const stockData = stocksData.find(s => s.symbol === stock.symbol)!;
            analysis.pe = stockData.pe || 0;
            analysis.dividendYield = stockData.dividendYield || 0;
            analysis.profitMargins = stockData.profitMargins || 0;
            analysis.discountAllTimeHigh = stockData.discountAllTimeHigh || 0;

            await analysisRepository.save(analysis);
            analysisResults.push(analysis);
        }

        return res.json(analysisResults);
    } catch (error) {
        console.error('Error performing analysis:', error);
        return res.status(500).json({ error: 'Failed to perform analysis' });
    }
});

function calculateDiscountFromATH(quote: YahooFinanceQuote): number | null {
    if (!quote.regularMarketDayHigh || !quote.regularMarketPrice) {
        return null;
    }
    return (quote.regularMarketDayHigh - quote.regularMarketPrice) / quote.regularMarketDayHigh;
}

function getRecommendation(score: number): string {
    if (score > 65) return 'Strong Buy';
    if (score >= 45) return 'Buy';
    if (score >= 30) return 'Hold';
    return 'Sell';
}

export default router; 