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
import { In, Not } from 'typeorm';

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
        const portfolioRepository = AppDataSource.getRepository(Portfolio);

        // Get current portfolio symbols
        const portfolio = await portfolioRepository.find();
        const currentSymbols = portfolio.map(p => p.stockSymbol);

        // Get analyses only for current portfolio stocks
        const analyses = await analysisRepository.find({
            where: {
                stockSymbol: In(currentSymbols)
            },
            order: {
                analyzedAt: 'DESC'
            }
        });

        // Delete any analyses for stocks not in current portfolio
        const analysesToDelete = await analysisRepository.find({
            where: {
                stockSymbol: Not(In(currentSymbols))
            }
        });
        if (analysesToDelete.length > 0) {
            await analysisRepository.remove(analysesToDelete);
        }

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

// Analyze portfolio
router.post('/analyze', async (_req: Request, res: Response) => {
    try {
        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const analysisRepository = AppDataSource.getRepository(StockAnalysis);

        // Get current portfolio
        const portfolio = await portfolioRepository.find();
        const currentSymbols = portfolio.map(p => p.stockSymbol);

        // Delete ALL previous analyses
        await analysisRepository.clear();

        // Collect stock data for current portfolio
        const stockData: StockData[] = [];
        for (const stock of portfolio) {
            try {
                // Fetch quote data for current price and 52-week high
                const quote = await yahooFinance.quote(stock.stockSymbol);
                
                // Fetch detailed financial data
                const summary = await yahooFinance.quoteSummary(stock.stockSymbol, {
                    modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']
                });

                stockData.push({
                    symbol: stock.stockSymbol,
                    sector: summary.assetProfile?.sector || 'Unknown',
                    dividendYield: summary.summaryDetail?.dividendYield || null,
                    profitMargins: summary.defaultKeyStatistics?.profitMargins || null,
                    debtToEquity: summary.financialData?.debtToEquity || null,
                    pe: summary.summaryDetail?.forwardPE || summary.summaryDetail?.trailingPE || null,
                    discountFrom52W: summary.summaryDetail?.fiftyTwoWeekHigh && quote.regularMarketPrice
                        ? (summary.summaryDetail.fiftyTwoWeekHigh - quote.regularMarketPrice) / summary.summaryDetail.fiftyTwoWeekHigh
                        : null,
                    price: quote.regularMarketPrice || null
                });
            } catch (error) {
                console.error(`Error fetching data for ${stock.stockSymbol}:`, error);
            }
        }

        // Calculate normalized scores
        const normalizedScores = calculateNormalizedScores(stockData, stockData);

        // Save analyses for current portfolio stocks
        const analyses = normalizedScores.map(score => {
            const analysis = new StockAnalysis();
            analysis.stockSymbol = score.symbol;
            analysis.sector = stockData.find(s => s.symbol === score.symbol)?.sector || 'Unknown';
            analysis.healthScore = score.healthScore;
            analysis.valueScore = score.valueScore;
            analysis.totalScore = score.totalScore;
            analysis.recommendation = getRecommendation(score.totalScore);
            
            // Save original metrics
            const stockInfo = stockData.find(s => s.symbol === score.symbol)!;
            analysis.pe = stockInfo.pe || 0;
            analysis.dividendYield = stockInfo.dividendYield || 0;
            analysis.profitMargins = stockInfo.profitMargins || 0;
            analysis.discountAllTimeHigh = stockInfo.discountFrom52W || 0;
            analysis.debtToEquity = stockInfo.debtToEquity || 0;
            analysis.price = stockInfo.price || 0;
            
            return analysis;
        });

        const savedAnalyses = await analysisRepository.save(analyses);
        const analyzedAt = savedAnalyses[0]?.analyzedAt || new Date();

        res.json({ 
            message: 'Analysis completed successfully', 
            analyses: savedAnalyses,
            analyzedAt: analyzedAt
        });
    } catch (error) {
        console.error('Error analyzing portfolio:', error);
        res.status(500).json({ error: 'Failed to analyze portfolio' });
    }
});

export default router; 