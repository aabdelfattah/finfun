import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { AppDataSource } from '../server';
import { SectorMetrics } from '../entities/SectorMetrics';

const router = Router();
const execAsync = promisify(exec);

interface SectorMetricsData {
    mean: number;
    stdev: number;
}

interface SectorData {
    name: string;
    metrics: {
        dividendYield: SectorMetricsData;
        profitMargins: SectorMetricsData;
        debtToEquity: SectorMetricsData;
        pe: SectorMetricsData;
        discountFrom52W: SectorMetricsData;
    };
}

// Get sector analysis data
router.get('/', async (_req: Request, res: Response) => {
    try {
        const sectorMetricsRepository = AppDataSource.getRepository(SectorMetrics);
        const metrics = await sectorMetricsRepository.find();
        
        // Get the latest timestamp from any metric
        const latestTimestamp = metrics.length > 0 ? metrics[0].createdAt : null;
        
        // Group metrics by sector
        const sectorData: SectorData[] = metrics.reduce((acc: SectorData[], metric) => {
            const existingSector = acc.find(s => s.name === metric.sector);
            if (existingSector) {
                return acc;
            }
            
            acc.push({
                name: metric.sector,
                metrics: {
                    dividendYield: {
                        mean: metric.dividendYieldMean,
                        stdev: metric.dividendYieldStdev
                    },
                    profitMargins: {
                        mean: metric.profitMarginsMean,
                        stdev: metric.profitMarginsStdev
                    },
                    debtToEquity: {
                        mean: metric.debtToEquityMean,
                        stdev: metric.debtToEquityStdev
                    },
                    pe: {
                        mean: metric.peMean,
                        stdev: metric.peStdev
                    },
                    discountFrom52W: {
                        mean: metric.discountFrom52WMean,
                        stdev: metric.discountFrom52WStdev
                    }
                }
            });
            return acc;
        }, []);
        
        res.json({
            data: sectorData,
            lastUpdated: latestTimestamp
        });
    } catch (error) {
        console.error('Error fetching sector analysis:', error);
        res.status(500).json({ error: 'Failed to fetch sector analysis' });
    }
});

// Run new sector analysis
router.post('/run', async (_req: Request, res: Response) => {
    try {
        const scriptPath = path.join(__dirname, '..', 'sp500_sector_normalization.ts');
        
        // Run the analysis script
        const { stdout, stderr } = await execAsync(`npx ts-node ${scriptPath}`);
        
        if (stderr) {
            console.warn('Warning during sector analysis:', stderr);
        }

        // Extract JSON data between markers
        const apiOutputMatch = stdout.match(/API_OUTPUT_START\n([\s\S]*?)\nAPI_OUTPUT_END/);
        if (!apiOutputMatch) {
            console.error('Script output:', stdout);
            throw new Error('Could not find API output in script results');
        }

        try {
            // Parse the results
            const sectorData: SectorData[] = JSON.parse(apiOutputMatch[1]);
            
            // Save to database
            const sectorMetricsRepository = AppDataSource.getRepository(SectorMetrics);
            
            // Clear existing metrics
            await sectorMetricsRepository.clear();
            
            // Save new metrics
            for (const sector of sectorData) {
                const metrics = new SectorMetrics();
                metrics.sector = sector.name;
                metrics.dividendYieldMean = sector.metrics.dividendYield.mean;
                metrics.dividendYieldStdev = sector.metrics.dividendYield.stdev;
                metrics.profitMarginsMean = sector.metrics.profitMargins.mean;
                metrics.profitMarginsStdev = sector.metrics.profitMargins.stdev;
                metrics.debtToEquityMean = sector.metrics.debtToEquity.mean;
                metrics.debtToEquityStdev = sector.metrics.debtToEquity.stdev;
                metrics.peMean = sector.metrics.pe.mean;
                metrics.peStdev = sector.metrics.pe.stdev;
                metrics.discountFrom52WMean = sector.metrics.discountFrom52W.mean;
                metrics.discountFrom52WStdev = sector.metrics.discountFrom52W.stdev;
                
                await sectorMetricsRepository.save(metrics);
            }
            
            console.log('Sector analysis completed successfully');
            res.json({ message: 'Sector analysis completed successfully' });
        } catch (parseError) {
            console.error('Error parsing script output:', parseError);
            console.error('Raw API output:', apiOutputMatch[1]);
            throw new Error('Failed to parse script output');
        }
    } catch (error) {
        console.error('Error running sector analysis:', error);
        res.status(500).json({ error: 'Failed to run sector analysis' });
    }
});

export default router; 