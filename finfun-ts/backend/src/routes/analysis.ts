import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { Portfolio } from '../entities/Portfolio';
import { StockAnalysis } from '../entities/StockAnalysis';
import { SectorMetrics } from '../entities/SectorMetrics';
import yahooFinance from 'yahoo-finance2';
import { StockData, calculateNormalizedScores } from '../utils/analysisUtils';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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

// Helper function to assert quote data has the required shape
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

// Helper function to calculate discount from all-time high
function calculateDiscountFromATH(quote: YahooFinanceQuote): number | null {
    if (!quote.regularMarketDayHigh || !quote.regularMarketPrice) {
        return null;
    }
    return (quote.regularMarketDayHigh - quote.regularMarketPrice) / quote.regularMarketDayHigh;
}

// Helper function to get recommendation based on total score
function getRecommendation(totalScore: number): string {
    if (totalScore >= 80) return 'Strong Buy';
    if (totalScore >= 60) return 'Buy';
    if (totalScore >= 40) return 'Hold';
    if (totalScore >= 20) return 'Sell';
    return 'Strong Sell';
}

// Get all analyses
router.get('/', async (_req: Request, res: Response) => {
    try {
        const analysisRepository = AppDataSource.getRepository(StockAnalysis);
        const analyses = await analysisRepository.find({
            order: {
                analyzedAt: 'DESC'
            }
        });
        res.json(analyses);
    } catch (error) {
        console.error('Error fetching analyses:', error);
        res.status(500).json({ error: 'Failed to fetch analyses' });
    }
});

// Load sector reference data from Excel
function loadSectorReferenceData(): Record<string, StockData[]> {
    const excelPath = path.join(__dirname, 'sp500_sector_normalization.xlsx');
    if (!fs.existsSync(excelPath)) {
        throw new Error('Sector reference data not found. Please run sp500_sector_normalization.ts first.');
    }

    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Sector Reference'];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Group stocks by sector
    return data.reduce((acc: Record<string, StockData[]>, row: any) => {
        const sector = row.Sector;
        if (!acc[sector]) {
            acc[sector] = [];
        }
        acc[sector].push({
            symbol: row.Symbol,
            sector: sector,
            dividendYield: row['Dividend Yield'] || null,
            profitMargins: row['Profit Margins'] || null,
            debtToEquity: row['Debt to Equity'] || null,
            pe: row['P/E Ratio'] || null,
            discountAllTimeHigh: row['Discount from 52W High'] || null
        });
        return acc;
    }, {});
}

// Perform new analysis
router.post('/analyze', async (_req: Request, res: Response) => {
    try {
        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const analysisRepository = AppDataSource.getRepository(StockAnalysis);
        const sectorMetricsRepository = AppDataSource.getRepository(SectorMetrics);

        const portfolio = await portfolioRepository.find();
        if (!portfolio.length) {
            return res.status(400).json({ error: 'No portfolio data available' });
        }

        // Load sector metrics
        const sectorMetrics = await sectorMetricsRepository.find();
        const metricsBySector = sectorMetrics.reduce((acc, metric) => {
            acc[metric.sector] = metric;
            return acc;
        }, {} as Record<string, SectorMetrics>);

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
                discountFrom52W: calculateDiscountFromATH(quote)
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

        // Calculate normalized scores for each sector using stored metrics
        const normalizedScores = Object.entries(stocksBySector).flatMap(([sector, sectorStocks]) => {
            const sectorMetric = metricsBySector[sector];
            if (!sectorMetric) {
                console.warn(`No metrics found for sector: ${sector}`);
                return calculateNormalizedScores(sectorStocks, sectorStocks); // Fallback to portfolio-only normalization
            }

            // Create reference set from sector metrics
            const referenceSet: StockData[] = [{
                symbol: 'REFERENCE',
                sector: sector,
                dividendYield: sectorMetric.dividendYieldMean,
                profitMargins: sectorMetric.profitMarginsMean,
                debtToEquity: sectorMetric.debtToEquityMean,
                pe: sectorMetric.peMean,
                discountFrom52W: sectorMetric.discountFrom52WMean
            }];

            return calculateNormalizedScores(sectorStocks, referenceSet);
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
            analysis.discountAllTimeHigh = stockData.discountFrom52W || 0;

            await analysisRepository.save(analysis);
            analysisResults.push(analysis);
        }

        return res.json(analysisResults);
    } catch (error) {
        console.error('Error performing analysis:', error);
        return res.status(500).json({ error: 'Failed to perform analysis' });
    }
});

export default router; 