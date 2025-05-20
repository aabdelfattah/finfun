import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();
const execAsync = promisify(exec);

interface SectorMetrics {
    mean: number;
    stdev: number;
}

interface StockData {
    symbol: string;
    dividendYield: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    pe: number | null;
    discountFrom52W: number | null;
}

interface SectorData {
    name: string;
    stocks: StockData[];
    metrics: {
        dividendYield: SectorMetrics;
        profitMargins: SectorMetrics;
        debtToEquity: SectorMetrics;
        pe: SectorMetrics;
        discountFrom52W: SectorMetrics;
    };
}

// Get current sector analysis
router.get('/', async (_req: Request, res: Response) => {
    try {
        const resultsPath = path.join(__dirname, '..', 'sector_analysis_results.json');
        
        // Check if we have cached results
        if (fs.existsSync(resultsPath)) {
            const data = fs.readFileSync(resultsPath, 'utf8');
            const sectorData: SectorData[] = JSON.parse(data);
            return res.json(sectorData);
        }
        
        // If no cached results, return empty array
        res.json([]);
    } catch (error) {
        console.error('Error fetching sector analysis:', error);
        res.status(500).json({ error: 'Failed to fetch sector analysis' });
    }
});

// Run new sector analysis
router.post('/run', async (_req: Request, res: Response) => {
    try {
        const scriptPath = path.join(__dirname, '..', 'sp500_sector_normalization.ts');
        const resultsPath = path.join(__dirname, '..', 'sector_analysis_results.json');
        
        // Run the analysis script
        const { stdout, stderr } = await execAsync(`npx ts-node ${scriptPath}`);
        
        if (stderr) {
            console.warn('Warning during sector analysis:', stderr);
        }

        // Find the last JSON object in the output
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in script output');
        }

        // Parse and save the results
        const sectorData: SectorData[] = JSON.parse(jsonMatch[0]);
        fs.writeFileSync(resultsPath, JSON.stringify(sectorData, null, 2));
        
        console.log('Sector analysis completed successfully');
        res.json({ message: 'Sector analysis completed successfully' });
    } catch (error) {
        console.error('Error running sector analysis:', error);
        res.status(500).json({ error: 'Failed to run sector analysis' });
    }
});

export default router; 