import axios from 'axios';
import { Portfolio, StockAnalysis } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

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

interface User {
    id: number;
    email: string;
    role: 'admin' | 'user';
}

interface AuthResponse {
    message: string;
    token: string;
    user: User;
}

interface Config {
    id: number;
    key: string;
    value: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AnalysisResponse {
    analyses: StockAnalysis[];
    analyzedAt: string | null;
    isFresh: boolean;
    needsAnalysis?: boolean;
    message?: string;
}

function getToken(): string {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');
    return token;
}

export const api = {
    // Auth endpoints
    login: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (email: string, password: string, role?: string): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/register', { email, password, role });
        return response.data;
    },

    getCurrentUser: async (): Promise<{ user: User }> => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },

    logout: async (): Promise<{ message: string }> => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },

    // Config endpoints (admin only)
    getConfigs: async (): Promise<{ configs: Config[] }> => {
        const response = await apiClient.get('/config');
        return response.data;
    },

    updateConfig: async (key: string, value: string, description?: string): Promise<{ message: string; config: Config }> => {
        const response = await apiClient.put(`/config/${key}`, { value, description });
        return response.data;
    },

    initializeConfigs: async (): Promise<{ message: string }> => {
        const response = await apiClient.post('/config/initialize');
        return response.data;
    },

    // Portfolio endpoints
    getPortfolio: async (): Promise<Portfolio> => {
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
    async getAnalysis(): Promise<AnalysisResponse> {
        const response = await fetch(`${API_BASE_URL}/analysis`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch analysis');
        return response.json();
    },

    async performAnalysis(): Promise<AnalysisResponse> {
        const response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) throw new Error('Failed to perform analysis');
        return response.json();
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

    getSectorMetrics: async () => {
        const response = await apiClient.get('/sector-metrics');
        return response.data;
    },

    checkSectorAnalysisAccess: async (): Promise<boolean> => {
        try {
            const response = await apiClient.get('/config/allow_user_sector_analysis');
            return response.data.value === 'true';
        } catch (error) {
            return false;
        }
    },
}; 