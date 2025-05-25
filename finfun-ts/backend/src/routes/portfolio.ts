import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { Portfolio, PortfolioStock } from '../entities/Portfolio';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import csv from 'csv-parse';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication to all portfolio routes
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

export default router; 