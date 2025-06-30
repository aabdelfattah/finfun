import axios from 'axios';
import { Portfolio, StockAnalysis, AIAnalysisResponse, AIAnalysisResult, EnhancedAnalysisResponse, AIStockAnalysis } from '../types';
import { SectorData, SectorAnalysisResponse } from '../components/SectorAnalysis';

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

interface SectorMetricsResponse {
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
    async getSectorAnalysis(): Promise<SectorAnalysisResponse> {
        try {
            const response = await apiClient.get<SectorMetricsResponse>('/sector-analysis');
            return {
                data: response.data.data,
                lastUpdated: response.data.lastUpdated
            };
        } catch (error) {
            console.error('Error fetching sector analysis:', error);
            throw new Error('Failed to fetch sector analysis data');
        }
    },

    getSectorNormalization: async (): Promise<SectorData[]> => {
        const response = await fetch('http://localhost:8001/api/sectors/normalization', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to get sector normalization data');
        }
        return response.json();
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
            return response.data.config?.value === 'true';
        } catch (error) {
            console.error('Error checking sector analysis access:', error);
            return false;
        }
    },

    // AI Analysis endpoints
    getAIAnalysis: async (): Promise<AIAnalysisResponse> => {
        const response = await apiClient.get('/analysis/ai');
        return response.data;
    },

    performAIAnalysis: async (timeframe: 'Next Week' | 'Next Month' = 'Next Week'): Promise<AIAnalysisResult> => {
        const response = await apiClient.post('/analysis/ai/analyze', { timeframe });
        return response.data;
    },

    getStockAIAnalysis: async (symbol: string, timeframe: 'Next Week' | 'Next Month' = 'Next Week'): Promise<{
        aiAnalysis: AIStockAnalysis;
        isFresh: boolean;
        hasAnalysis: boolean;
    }> => {
        const response = await apiClient.get(`/analysis/ai/${symbol}`, {
            params: { timeframe }
        });
        return response.data;
    },

    getEnhancedAnalysis: async (): Promise<EnhancedAnalysisResponse> => {
        const response = await apiClient.get('/analysis/enhanced');
        return response.data;
    },

    // Combined analysis method that gets both traditional and AI analysis
    performCompleteAnalysis: async (includeAI: boolean = true, timeframe: 'Next Week' | 'Next Month' = 'Next Week'): Promise<{
        traditional: AnalysisResponse;
        ai?: AIAnalysisResult;
    }> => {
        // First perform traditional analysis
        const traditional = await api.performAnalysis();
        
        if (!includeAI) {
            return { traditional };
        }

        // Then perform AI analysis
        try {
            const ai = await api.performAIAnalysis(timeframe);
            return { traditional, ai };
        } catch (error) {
            console.warn('AI analysis failed, returning traditional analysis only:', error);
            return { traditional };
        }
    },

    // Add new method for direct FinRobot API calls
    getFinRobotAnalysis: async (symbol: string, timeframe: 'Next Week' | 'Next Month' = 'Next Week'): Promise<{
        symbol: string;
        analysis_date: string;
        analysis_type: string;
        analysis_text: string;
        success: boolean;
        error_message?: string;
    }> => {
        const response = await fetch(`http://localhost:8001/api/analyze/${symbol}?timeframe=${timeframe}`, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error('Failed to get FinRobot analysis');
        }
        return response.json();
    }
}; 