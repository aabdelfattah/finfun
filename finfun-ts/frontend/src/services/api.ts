import axios from 'axios';
import { PortfolioEntry, StockAnalysis } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

interface SectorAnalysisResponse {
    data: SectorData[];
    lastUpdated: string;
}

export const api = {
    // Portfolio endpoints
    getPortfolio: async (): Promise<PortfolioEntry[]> => {
        const response = await apiClient.get('/portfolio');
        return response.data;
    },

    uploadPortfolio: async (file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('file', file);
        await apiClient.post('/portfolio/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Analysis endpoints
    getAnalysis: async (): Promise<StockAnalysis[]> => {
        const response = await apiClient.get('/analysis');
        return response.data;
    },

    performAnalysis: async (): Promise<{ analyses: StockAnalysis[]; analyzedAt: string }> => {
        const response = await apiClient.post('/analysis/analyze');
        return response.data;
    },

    // Sector Analysis endpoints
    getSectorAnalysis: async (): Promise<SectorAnalysisResponse> => {
        const response = await apiClient.get('/sector-analysis');
        return response.data;
    },

    runSectorAnalysis: async (): Promise<{ message: string }> => {
        const response = await apiClient.post('/sector-analysis/run');
        return response.data;
    },
}; 