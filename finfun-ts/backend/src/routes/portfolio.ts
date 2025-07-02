import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { Portfolio, PortfolioStock } from '../entities/Portfolio';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import csv from 'csv-parse';
import { Readable } from 'stream';
import { tickerService, TickerData } from '../services/tickerService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public ticker endpoints (no auth required)
// Ticker search endpoint
router.get('/search-tickers', async (req: Request, res: Response) => {
    try {
        const { q: query, limit } = req.query;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const searchLimit = limit && typeof limit === 'string' ? parseInt(limit) : 10;
        const results = await tickerService.searchTickers(query, searchLimit);
        
        res.json({ tickers: results });
    } catch (error) {
        console.error('Error searching tickers:', error);
        res.status(500).json({ error: 'Failed to search tickers' });
    }
});

// Ticker validation endpoint
router.get('/validate-ticker/:symbol', async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;
        
        if (!symbol) {
            return res.status(400).json({ error: 'Ticker symbol is required' });
        }

        const ticker = await tickerService.validateTicker(symbol);
        
        if (ticker) {
            res.json({ valid: true, ticker });
        } else {
            res.json({ valid: false, ticker: null });
        }
    } catch (error) {
        console.error('Error validating ticker:', error);
        res.status(500).json({ error: 'Failed to validate ticker' });
    }
});

// Apply authentication to all other portfolio routes
router.use(authenticateToken);

// Get current user's portfolio
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks']
        });

        if (!portfolio) {
            return res.json({ id: null, name: null, stocks: [] });
        }

        res.json(portfolio);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Add a stock to current user's portfolio
router.post('/add', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { stockSymbol, allocationPercentage } = req.body;
        
        if (!stockSymbol || allocationPercentage === undefined) {
            return res.status(400).json({ error: 'Stock symbol and allocation percentage are required' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const portfolioStockRepository = AppDataSource.getRepository(PortfolioStock);

        // Get or create user's portfolio
        let portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id }
        });

        if (!portfolio) {
            portfolio = new Portfolio();
            portfolio.name = `${req.user.email}'s Portfolio`;
            portfolio.userId = req.user.id;
            portfolio = await portfolioRepository.save(portfolio);
        }

        // Check if stock already exists in portfolio
        const existingStock = await portfolioStockRepository.findOne({
            where: { 
                stockSymbol: stockSymbol,
                portfolioId: portfolio.id 
            }
        });

        if (existingStock) {
            // Update existing stock
            existingStock.allocationPercentage = allocationPercentage;
            await portfolioStockRepository.save(existingStock);
            res.json(existingStock);
        } else {
            // Create new stock entry
            const portfolioStock = new PortfolioStock();
            portfolioStock.stockSymbol = stockSymbol;
            portfolioStock.allocationPercentage = allocationPercentage;
            portfolioStock.portfolioId = portfolio.id;
            
            const savedStock = await portfolioStockRepository.save(portfolioStock);
            res.json(savedStock);
        }
    } catch (error) {
        console.error('Error adding to portfolio:', error);
        res.status(500).json({ error: 'Failed to add to portfolio' });
    }
});

// Upload portfolio from CSV for current user
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const portfolioStockRepository = AppDataSource.getRepository(PortfolioStock);
        const fileContent = req.file.buffer.toString();
        const records: { symbol: string; allocation: number }[] = [];

        // Parse CSV
        await new Promise((resolve, reject) => {
            Readable.from(fileContent)
                .pipe(csv.parse({ 
                    columns: true, 
                    skip_empty_lines: true,
                    trim: true,
                    cast: true
                }))
                .on('data', (data: any) => {
                    // Handle both column name formats
                    const symbol = data.symbol || data.stock_symbol;
                    const allocation = data.allocation || data.allocation_percentage;
                    
                    if (symbol && !isNaN(parseFloat(allocation))) {
                        records.push({
                            symbol: symbol,
                            allocation: parseFloat(allocation)
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (records.length === 0) {
            return res.status(400).json({ error: 'No valid records found in CSV file' });
        }

        // Get or create user's portfolio
        let portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id }
        });

        if (!portfolio) {
            portfolio = new Portfolio();
            portfolio.name = `${req.user.email}'s Portfolio`;
            portfolio.userId = req.user.id;
            portfolio = await portfolioRepository.save(portfolio);
        }

        // Clear existing stocks in portfolio
        await portfolioStockRepository.delete({ portfolioId: portfolio.id });

        // Save new portfolio stocks
        const portfolioStocks = records.map(record => {
            const stock = new PortfolioStock();
            stock.stockSymbol = record.symbol;
            stock.allocationPercentage = record.allocation;
            stock.portfolioId = portfolio!.id;
            return stock;
        });

        await portfolioStockRepository.save(portfolioStocks);
        return res.json({ message: 'Portfolio uploaded successfully', portfolioId: portfolio.id });
    } catch (error) {
        console.error('Error uploading portfolio:', error);
        return res.status(500).json({ error: 'Failed to process portfolio file' });
    }
});

// Add stock with ticker validation
router.post('/add-ticker', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { symbol } = req.body;
        
        if (!symbol) {
            return res.status(400).json({ error: 'Ticker symbol is required' });
        }

        // Validate ticker exists
        const tickerData = await tickerService.validateTicker(symbol);
        if (!tickerData) {
            return res.status(400).json({ error: 'Invalid ticker symbol' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const portfolioStockRepository = AppDataSource.getRepository(PortfolioStock);

        // Get or create user's portfolio
        let portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id }
        });

        if (!portfolio) {
            portfolio = new Portfolio();
            portfolio.name = `${req.user.email}'s Portfolio`;
            portfolio.userId = req.user.id;
            portfolio = await portfolioRepository.save(portfolio);
        }

        // Check if stock already exists in portfolio
        const existingStock = await portfolioStockRepository.findOne({
            where: { 
                stockSymbol: tickerData.symbol.toUpperCase(),
                portfolioId: portfolio.id 
            }
        });

        if (existingStock) {
            return res.status(400).json({ 
                error: 'Stock already exists in portfolio',
                existingStock: existingStock
            });
        }

        // Create new stock entry with default allocation
        const portfolioStock = new PortfolioStock();
        portfolioStock.stockSymbol = tickerData.symbol.toUpperCase();
        portfolioStock.allocationPercentage = 10.0; // Default allocation percentage
        portfolioStock.portfolioId = portfolio.id;
        
        const savedStock = await portfolioStockRepository.save(portfolioStock);
        
        res.json({ 
            message: 'Stock added to portfolio successfully',
            stock: savedStock,
            tickerInfo: tickerData
        });
    } catch (error) {
        console.error('Error adding ticker to portfolio:', error);
        res.status(500).json({ error: 'Failed to add ticker to portfolio' });
    }
});

// Remove stock from portfolio
router.delete('/stocks/:stockId', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { stockId } = req.params;
        
        if (!stockId || isNaN(Number(stockId))) {
            return res.status(400).json({ error: 'Valid stock ID is required' });
        }

        const portfolioStockRepository = AppDataSource.getRepository(PortfolioStock);
        const portfolioRepository = AppDataSource.getRepository(Portfolio);

        // First, verify the stock belongs to the user's portfolio
        const stock = await portfolioStockRepository.findOne({
            where: { id: Number(stockId) },
            relations: ['portfolio']
        });

        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        // Verify the portfolio belongs to the current user
        const portfolio = await portfolioRepository.findOne({
            where: { id: stock.portfolioId, userId: req.user.id }
        });

        if (!portfolio) {
            return res.status(403).json({ error: 'Unauthorized to remove this stock' });
        }

        // Remove the stock
        await portfolioStockRepository.remove(stock);
        
        res.json({ message: 'Stock removed successfully' });
    } catch (error) {
        console.error('Error removing stock from portfolio:', error);
        res.status(500).json({ error: 'Failed to remove stock from portfolio' });
    }
});

export default router; 