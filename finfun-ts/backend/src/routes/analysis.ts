import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { Portfolio, PortfolioStock } from '../entities/Portfolio';
import { StockAnalysis } from '../entities/StockAnalysis';
import { AIStockAnalysis } from '../entities/AIStockAnalysis';
import { SectorMetrics } from '../entities/SectorMetrics';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getFinRobotService } from '../services/finrobotService';
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

// Helper function to check if analysis is fresh (less than 24 hours old)
function isAnalysisFresh(analyzedAt: Date): boolean {
    const now = new Date();
    const hoursDiff = (now.getTime() - analyzedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
}

// Get all analyses
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const stockAnalysisRepository = AppDataSource.getRepository(StockAnalysis);
        const portfolioRepository = AppDataSource.getRepository(Portfolio);

        // Get current user's portfolio
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.json([]);
        }

        const currentSymbols = portfolio.stocks.map(s => s.stockSymbol);

        if (currentSymbols.length === 0) {
            return res.json([]);
        }

        // Get analyses for current user's portfolio using JSON contains
        const analyses = await stockAnalysisRepository
            .createQueryBuilder('sa')
            .where('sa.stockSymbol IN (:...symbols)', { symbols: currentSymbols })
            .getMany();

        // Filter analyses that contain this portfolio ID
        const portfolioAnalyses = analyses.filter(analysis => 
            analysis.portfolioIds && analysis.portfolioIds.includes(portfolio.id)
        );

        // Check if we have any analyses and if they're fresh
        if (portfolioAnalyses.length > 0) {
            const isFresh = isAnalysisFresh(portfolioAnalyses[0].analyzedAt);
            if (isFresh) {
                return res.json({
                    analyses: portfolioAnalyses,
                    analyzedAt: portfolioAnalyses[0].analyzedAt,
                    isFresh: true
                });
            }
        }

        // If no analyses or not fresh, trigger new analysis
        res.json({
            analyses: [],
            analyzedAt: null,
            isFresh: false,
            needsAnalysis: true
        });
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
            discountFrom52W: row['Discount from 52W High'] || null,
            price: null // Add price field to match StockData interface
        });
        return acc;
    }, {});
}

// Analyze portfolio
router.post('/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const stockAnalysisRepository = AppDataSource.getRepository(StockAnalysis);

        // Get current user's portfolio
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.status(400).json({ error: 'No portfolio found. Please create a portfolio first.' });
        }

        const currentSymbols = portfolio.stocks.map(s => s.stockSymbol);

        if (currentSymbols.length === 0) {
            return res.status(400).json({ error: 'No portfolio data found to analyze' });
        }

        // Check if we have fresh analyses for this portfolio
        const existingAnalyses = await stockAnalysisRepository
            .createQueryBuilder('sa')
            .where('sa.stockSymbol IN (:...symbols)', { symbols: currentSymbols })
            .getMany();

        // Filter analyses that contain this portfolio ID
        const portfolioAnalyses = existingAnalyses.filter(analysis => 
            analysis.portfolioIds && analysis.portfolioIds.includes(portfolio.id)
        );

        if (portfolioAnalyses.length > 0 && isAnalysisFresh(portfolioAnalyses[0].analyzedAt)) {
            return res.json({
                message: 'Using cached analysis',
                analyses: portfolioAnalyses,
                analyzedAt: portfolioAnalyses[0].analyzedAt,
                isFresh: true
            });
        }

        // Collect stock data for current user's portfolio stocks
        const stockData: StockData[] = [];
        for (const symbol of currentSymbols) {
            try {
                // Fetch quote data for current price and 52-week high
                const quote = await yahooFinance.quote(symbol);
                
                // Fetch detailed financial data
                const summary = await yahooFinance.quoteSummary(symbol, {
                    modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']
                });

                stockData.push({
                    symbol: symbol,
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
                console.error(`Error fetching data for ${symbol}:`, error);
            }
        }

        // Calculate normalized scores
        const normalizedScores = calculateNormalizedScores(stockData, stockData);

        // Save analyses
        const analyses = await Promise.all(normalizedScores.map(async score => {
            // Check if analysis already exists for this stock
            let analysis = await stockAnalysisRepository.findOne({
                where: { stockSymbol: score.symbol }
            });

            if (!analysis) {
                // Create new analysis if it doesn't exist
                analysis = new StockAnalysis();
                analysis.stockSymbol = score.symbol;
                analysis.portfolioIds = [portfolio.id];
            } else {
                // Add portfolio ID to existing analysis if not already present
                if (!analysis.portfolioIds.includes(portfolio.id)) {
                    analysis.portfolioIds.push(portfolio.id);
                }
            }

            // Update analysis data
            analysis.sector = stockData.find(s => s.symbol === score.symbol)?.sector || 'Unknown';
            analysis.healthScore = score.healthScore;
            analysis.valueScore = score.valueScore;
            analysis.totalScore = score.totalScore;
            analysis.recommendation = getRecommendation(score.totalScore);
            analysis.analyzedAt = new Date();
            
            // Save original metrics
            const stockInfo = stockData.find(s => s.symbol === score.symbol)!;
            analysis.pe = stockInfo.pe || 0;
            analysis.dividendYield = stockInfo.dividendYield || 0;
            analysis.profitMargins = stockInfo.profitMargins || 0;
            analysis.discountAllTimeHigh = stockInfo.discountFrom52W || 0;
            analysis.debtToEquity = stockInfo.debtToEquity || 0;
            analysis.price = stockInfo.price || 0;
            
            return await stockAnalysisRepository.save(analysis);
        }));

        const analyzedAt = analyses[0]?.analyzedAt || new Date();

        res.json({ 
            message: 'Analysis completed successfully', 
            analyses,
            analyzedAt: analyzedAt
        });
    } catch (error) {
        console.error('Error analyzing portfolio:', error);
        res.status(500).json({ error: 'Failed to analyze portfolio' });
    }
});

// AI Analysis Endpoints

// Get AI analyses for current user's portfolio
router.get('/ai', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        
        // Get current user's portfolio
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.json({ aiAnalyses: [], message: 'No portfolio found' });
        }

        // Get AI analyses for this portfolio
        const aiAnalyses = await getFinRobotService().getPortfolioAIAnalyses(portfolio.id);
        
        // Check if we have fresh analyses
        const freshAnalyses = aiAnalyses.filter(analysis => analysis.isFresh());
        const needsRefresh = freshAnalyses.length < portfolio.stocks.length;

        res.json({
            aiAnalyses: freshAnalyses,
            needsRefresh,
            totalStocks: portfolio.stocks.length,
            analyzedStocks: freshAnalyses.length
        });

    } catch (error) {
        console.error('Error fetching AI analyses:', error);
        res.status(500).json({ error: 'Failed to fetch AI analyses' });
    }
});

// Trigger AI analysis for current user's portfolio
router.post('/ai/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { analysisType = 'standard' } = req.body;
        
        // Validate analysis type
        if (!['quick', 'standard', 'deep'].includes(analysisType)) {
            return res.status(400).json({ 
                error: 'Invalid analysis type. Must be: quick, standard, or deep' 
            });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        
        // Get current user's portfolio
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.status(400).json({ error: 'No portfolio found. Please create a portfolio first.' });
        }

        if (portfolio.stocks.length === 0) {
            return res.status(400).json({ error: 'No stocks found in portfolio.' });
        }

        // Check if FinRobot API is available
        const isAPIHealthy = await getFinRobotService().checkAPIHealth();
        if (!isAPIHealthy) {
            return res.status(503).json({ 
                error: 'FinRobot AI service is currently unavailable. Please try again later.' 
            });
        }

        const symbols = portfolio.stocks.map(stock => stock.stockSymbol);
        
        console.log(`🚀 Starting AI analysis for user ${req.user.email}'s portfolio: ${symbols.join(', ')}`);

        // Perform AI analysis with caching
        const aiAnalyses = await getFinRobotService().analyzePortfolioStocks(
            symbols, 
            portfolio.id, 
            analysisType as 'quick' | 'standard' | 'deep'
        );

        const successfulAnalyses = aiAnalyses.filter(a => a.success);
        const failedAnalyses = aiAnalyses.filter(a => !a.success);

        res.json({
            message: 'AI analysis completed',
            aiAnalyses: successfulAnalyses,
            summary: {
                total: aiAnalyses.length,
                successful: successfulAnalyses.length,
                failed: failedAnalyses.length,
                analysisType
            },
            errors: failedAnalyses.map(a => ({ 
                symbol: a.stockSymbol, 
                error: a.errorMessage 
            }))
        });

    } catch (error) {
        console.error('Error performing AI analysis:', error);
        res.status(500).json({ error: 'Failed to perform AI analysis' });
    }
});

// Get AI analysis for a specific stock
router.get('/ai/:symbol', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { symbol } = req.params;
        const { analysisType = 'standard' } = req.query;

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const aiAnalysisRepository = AppDataSource.getRepository(AIStockAnalysis);
        
        // Get current user's portfolio to verify they have this stock
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.status(400).json({ error: 'No portfolio found' });
        }

        const hasStock = portfolio.stocks.some(stock => 
            stock.stockSymbol.toUpperCase() === symbol.toUpperCase()
        );

        if (!hasStock) {
            return res.status(400).json({ 
                error: 'Stock not found in your portfolio' 
            });
        }

        // Get the most recent AI analysis for this stock
        const aiAnalysis = await aiAnalysisRepository.findOne({
            where: { 
                stockSymbol: symbol.toUpperCase(), 
                analysisType: analysisType as string
            },
            order: { analyzedAt: 'DESC' }
        });

        if (!aiAnalysis) {
            return res.json({ 
                message: 'No AI analysis found. Please run portfolio analysis first.',
                hasAnalysis: false
            });
        }

        res.json({
            aiAnalysis,
            isFresh: aiAnalysis.isFresh(),
            hasAnalysis: true
        });

    } catch (error) {
        console.error('Error fetching AI analysis for stock:', error);
        res.status(500).json({ error: 'Failed to fetch AI analysis' });
    }
});

// Combined endpoint: Get both traditional and AI analyses
router.get('/enhanced', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const stockAnalysisRepository = AppDataSource.getRepository(StockAnalysis);
        
        // Get current user's portfolio
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.json({ 
                traditional: [], 
                ai: [], 
                message: 'No portfolio found' 
            });
        }

        const currentSymbols = portfolio.stocks.map(s => s.stockSymbol);

        if (currentSymbols.length === 0) {
            return res.json({ 
                traditional: [], 
                ai: [], 
                message: 'No stocks in portfolio' 
            });
        }

        // Get traditional analyses
        const traditionalAnalyses = await stockAnalysisRepository
            .createQueryBuilder('sa')
            .where('sa.stockSymbol IN (:...symbols)', { symbols: currentSymbols })
            .getMany();

        const portfolioTraditionalAnalyses = traditionalAnalyses.filter(analysis => 
            analysis.portfolioIds && analysis.portfolioIds.includes(portfolio.id)
        );

        // Get AI analyses
        const aiAnalyses = await getFinRobotService().getPortfolioAIAnalyses(portfolio.id);
        const freshAiAnalyses = aiAnalyses.filter(analysis => analysis.isFresh());

        // Combine data by stock symbol
        const enhancedAnalyses = currentSymbols.map(symbol => {
            const traditional = portfolioTraditionalAnalyses.find(a => a.stockSymbol === symbol);
            const ai = freshAiAnalyses.find(a => a.stockSymbol === symbol);
            
            return {
                symbol,
                traditional: traditional || null,
                ai: ai || null,
                hasTraditional: !!traditional,
                hasAI: !!ai,
                needsAIAnalysis: !ai || !ai.isFresh()
            };
        });

        res.json({
            enhancedAnalyses,
            summary: {
                totalStocks: currentSymbols.length,
                withTraditional: enhancedAnalyses.filter(e => e.hasTraditional).length,
                withAI: enhancedAnalyses.filter(e => e.hasAI).length,
                needingAI: enhancedAnalyses.filter(e => e.needsAIAnalysis).length
            }
        });

    } catch (error) {
        console.error('Error fetching enhanced analyses:', error);
        res.status(500).json({ error: 'Failed to fetch enhanced analyses' });
    }
});

// Individual AI stock analysis endpoint
router.get('/ai/stock/:symbol', authenticateToken, async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const analysisType = (req.query.analysisType as string) || 'quick';
        
        // Validate analysis type
        if (!['quick', 'standard', 'deep'].includes(analysisType)) {
            return res.status(400).json({ 
                error: 'Invalid analysis type. Must be quick, standard, or deep' 
            });
        }

        console.log(`🔍 Individual AI analysis request for ${symbol} (${analysisType})`);

        const finRobotService = getFinRobotService();
        
        // Use portfolio ID 0 for individual stock analysis
        const result = await finRobotService.analyzeStock(symbol, 0, analysisType as any);
        
        res.json({
            symbol: result.stockSymbol,
            analysisType: result.analysisType,
            analysisText: result.analysisText,
            success: result.success,
            errorMessage: result.errorMessage,
            analyzedAt: result.analyzedAt,
            cached: result.isFresh()
        });

    } catch (error) {
        console.error('Error in individual AI stock analysis:', error);
        res.status(500).json({ 
            error: 'Failed to analyze stock',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 