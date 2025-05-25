import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Portfolio, PortfolioStock } from './entities/Portfolio';
import { StockAnalysis } from './entities/StockAnalysis';
import { SectorMetrics } from './entities/SectorMetrics';
import { User } from './entities/User';
import { Config } from './entities/Config';
import portfolioRoutes from './routes/portfolio';
import analysisRoutes from './routes/analysis';
import sectorAnalysisRoutes from './routes/sector-analysis';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "finfun.db",
    synchronize: true,
    logging: true,
    entities: [Portfolio, PortfolioStock, StockAnalysis, SectorMetrics, User, Config],
    migrations: [],
    subscribers: [],
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/sector-analysis', sectorAnalysisRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Initialize database and start server
async function startServer() {
    try {
        await AppDataSource.initialize();
        console.log("Database connection established");

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Error during server initialization:", error);
        process.exit(1);
    }
}

startServer(); 