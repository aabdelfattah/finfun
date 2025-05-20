import axios from 'axios';
import { PortfolioEntry, StockAnalysis } from '../types';

const API_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

    performAnalysis: async (): Promise<StockAnalysis[]> => {
        const response = await apiClient.post('/analysis/analyze');
        return response.data;
    },
}; 