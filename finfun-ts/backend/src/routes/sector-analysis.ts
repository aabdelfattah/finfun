import { Router, Request, Response } from 'express';
import { AppDataSource } from '../server';
import { SectorMetrics } from '../entities/SectorMetrics';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { UserRole } from '../entities/User';
import { isUserSectorAnalysisAllowed } from '../utils/configUtils';
import axios from 'axios';

const router = Router();

interface SectorMetricsData {
    mean: number;
    stdev: number;
}

interface SectorData {
    name: string;
    metrics: {
        dividend_yield: SectorMetricsData;
        profit_margins: SectorMetricsData;
        debt_to_equity: SectorMetricsData;
        pe: SectorMetricsData;
        discount_from_52w: SectorMetricsData;
    };
}

// Get sector analysis data
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const hasAccess = await isUserSectorAnalysisAllowed();
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const sectorMetricsRepo = AppDataSource.getRepository(SectorMetrics);
        const metrics = await sectorMetricsRepo.find();

        const sectorData: SectorData[] = metrics.map(metric => ({
            name: metric.sector,
            metrics: {
                dividend_yield: {
                    mean: metric.dividendYieldMean,
                    stdev: metric.dividendYieldStdev
                },
                profit_margins: {
                    mean: metric.profitMarginsMean,
                    stdev: metric.profitMarginsStdev
                },
                debt_to_equity: {
                    mean: metric.debtToEquityMean,
                    stdev: metric.debtToEquityStdev
                },
                pe: {
                    mean: metric.peMean,
                    stdev: metric.peStdev
                },
                discount_from_52w: {
                    mean: metric.discountFrom52WMean,
                    stdev: metric.discountFrom52WStdev
                }
            }
        }));

        res.json({
            data: sectorData,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching sector analysis:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Run sector analysis (admin only)
router.post('/run', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        // Call Python API to get sector normalization data
        const response = await axios.get('http://localhost:8001/api/sectors/normalization');
        const sectorData: SectorData[] = response.data;

        console.log("\n=== Backend Received Sector Data ===");
        console.log("Number of sectors:", sectorData.length);
        sectorData.forEach(sector => {
            console.log(`\nSector: ${sector.name}`);
            console.log("Metrics:", sector.metrics);
        });
        console.log("===================================\n");

        // Save to database
        const sectorMetricsRepo = AppDataSource.getRepository(SectorMetrics);
        
        // Clear existing metrics
        await sectorMetricsRepo.clear();

        // Save new metrics
        const metrics = sectorData.map(data => {
            const metric = new SectorMetrics();
            metric.sector = data.name;
            metric.dividendYieldMean = data.metrics.dividend_yield.mean;
            metric.dividendYieldStdev = data.metrics.dividend_yield.stdev;
            metric.profitMarginsMean = data.metrics.profit_margins.mean;
            metric.profitMarginsStdev = data.metrics.profit_margins.stdev;
            metric.debtToEquityMean = data.metrics.debt_to_equity.mean;
            metric.debtToEquityStdev = data.metrics.debt_to_equity.stdev;
            metric.peMean = data.metrics.pe.mean;
            metric.peStdev = data.metrics.pe.stdev;
            metric.discountFrom52WMean = data.metrics.discount_from_52w.mean;
            metric.discountFrom52WStdev = data.metrics.discount_from_52w.stdev;
            return metric;
        });

        await sectorMetricsRepo.save(metrics);

        // Verify stored data
        const storedMetrics = await sectorMetricsRepo.find();
        console.log("\n=== Stored Database Metrics ===");
        console.log("Number of sectors in DB:", storedMetrics.length);
        storedMetrics.forEach(metric => {
            console.log(`\nSector: ${metric.sector}`);
            console.log("Metrics:", {
                dividend_yield: { mean: metric.dividendYieldMean, stdev: metric.dividendYieldStdev },
                profit_margins: { mean: metric.profitMarginsMean, stdev: metric.profitMarginsStdev },
                debt_to_equity: { mean: metric.debtToEquityMean, stdev: metric.debtToEquityStdev },
                pe: { mean: metric.peMean, stdev: metric.peStdev },
                discount_from_52w: { mean: metric.discountFrom52WMean, stdev: metric.discountFrom52WStdev }
            });
        });
        console.log("==============================\n");

        res.json({ 
            message: 'Sector analysis completed successfully',
            data: sectorData,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error running sector analysis:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router; 