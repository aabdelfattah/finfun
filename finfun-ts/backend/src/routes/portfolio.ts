import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { Portfolio } from '../entities/Portfolio';
import multer from 'multer';
import csv from 'csv-parse';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get current portfolio
router.get('/', async (_req: Request, res: Response) => {
    try {
        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        const portfolio = await portfolioRepository.find();
        res.json(portfolio);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Upload portfolio from CSV
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const portfolioRepository = AppDataSource.getRepository(Portfolio);
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

        // Clear existing portfolio
        await portfolioRepository.clear();

        // Save new portfolio entries
        const portfolioEntries = records.map(record => {
            const entry = new Portfolio();
            entry.stockSymbol = record.symbol;
            entry.allocationPercentage = record.allocation;
            return entry;
        });

        await portfolioRepository.save(portfolioEntries);
        return res.json({ message: 'Portfolio uploaded successfully' });
    } catch (error) {
        console.error('Error uploading portfolio:', error);
        return res.status(500).json({ error: 'Failed to process portfolio file' });
    }
});

export default router; 