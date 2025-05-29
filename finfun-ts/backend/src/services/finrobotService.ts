import axios from 'axios';
import { AppDataSource } from '../server';
import { AIStockAnalysis } from '../entities/AIStockAnalysis';
import { Repository } from 'typeorm';

export interface FinRobotAnalysisResult {
    symbol: string;
    analysis_date: string;
    analysis_type: string;
    analysis_text: string;
    success: boolean;
    error_message?: string;
}

export class FinRobotService {
    private readonly apiBaseUrl: string;
    private _aiAnalysisRepository: Repository<AIStockAnalysis> | null = null;

    constructor(apiBaseUrl: string = 'http://localhost:8000') {
        this.apiBaseUrl = apiBaseUrl;
    }

    // Lazy-load repository to avoid initialization issues
    private get aiAnalysisRepository(): Repository<AIStockAnalysis> {
        if (!this._aiAnalysisRepository) {
            if (!AppDataSource.isInitialized) {
                throw new Error('Database not initialized. Please ensure AppDataSource is initialized before using FinRobotService.');
            }
            this._aiAnalysisRepository = AppDataSource.getRepository(AIStockAnalysis);
        }
        return this._aiAnalysisRepository;
    }

    /**
     * Analyze a single stock with caching and retry logic
     * Returns cached result if fresh (< 24 hours), otherwise calls API
     */
    async analyzeStock(
        symbol: string, 
        portfolioId: number,
        analysisType: 'quick' | 'standard' | 'deep' = 'standard'
    ): Promise<AIStockAnalysis> {
        
        // Check for fresh cached analysis
        const existingAnalysis = await this.aiAnalysisRepository.findOne({
            where: { 
                stockSymbol: symbol, 
                analysisType: analysisType 
            },
            order: { analyzedAt: 'DESC' }
        });

        // If we have fresh analysis, update portfolio IDs and return
        if (existingAnalysis && existingAnalysis.isFresh()) {
            console.log(`📄 Using cached AI analysis for ${symbol} (${analysisType})`);
            
            // Update portfolio IDs to include current portfolio (simple-json handles array directly)
            const portfolioIds = existingAnalysis.portfolioIds || [];
            if (!portfolioIds.includes(portfolioId)) {
                portfolioIds.push(portfolioId);
                existingAnalysis.portfolioIds = portfolioIds;
                await this.aiAnalysisRepository.save(existingAnalysis);
            }
            
            return existingAnalysis;
        }

        // Call FinRobot API with retry logic
        console.log(`🤖 Calling FinRobot API for ${symbol} (${analysisType})`);
        
        const maxRetries = 2;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${symbol}...`);
            
            try {
                // Call FinRobot API using axios for better timeout support
                const response = await axios.get(
                    `http://localhost:8000/analyze/${symbol}`,
                    {
                        params: { analysis_type: analysisType },
                        timeout: 120000, // 2 minutes timeout
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );

                const data = response.data as FinRobotAnalysisResult;

                if (!data.success) {
                    throw new Error(data.error_message || 'Unknown error from FinRobot API');
                }

                // Create new analysis record
                const analysis = new AIStockAnalysis();
                analysis.stockSymbol = symbol;
                analysis.analysisType = analysisType;
                analysis.analysisText = data.analysis_text;
                analysis.portfolioIds = [portfolioId];
                analysis.success = true;
                analysis.errorMessage = null;
                analysis.analyzedAt = new Date();

                // Save to database
                const savedAnalysis = await this.aiAnalysisRepository.save(analysis);
                
                return savedAnalysis;

            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed for ${symbol}:`, error);
                
                if (attempt === maxRetries) {
                    // Create failed analysis record on final attempt
                    const analysis = new AIStockAnalysis();
                    analysis.stockSymbol = symbol;
                    analysis.analysisType = analysisType;
                    analysis.analysisText = '';
                    analysis.portfolioIds = [portfolioId];
                    analysis.success = false;
                    analysis.errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    analysis.analyzedAt = new Date();

                    return await this.aiAnalysisRepository.save(analysis);
                } else {
                    // Wait between retries to allow any ongoing AutoGen processes to finish
                    console.log(`⏳ Waiting 3 seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        // This should never be reached, but TypeScript requires it
        throw new Error(`Failed to analyze ${symbol} after ${maxRetries} attempts`);
    }

    /**
     * Analyze multiple stocks for a portfolio
     * Uses SEQUENTIAL processing with proper delays to avoid AutoGen conversation conflicts
     */
    async analyzePortfolioStocks(
        symbols: string[], 
        portfolioId: number,
        analysisType: 'quick' | 'standard' | 'deep' = 'standard'
    ): Promise<AIStockAnalysis[]> {
        
        console.log(`🎯 Starting AI analysis for portfolio ${portfolioId}: [${symbols.join(', ')}]`);
        
        // Process stocks SEQUENTIALLY with proper timing delays
        const results: AIStockAnalysis[] = [];
        
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            console.log(`📦 Processing stock ${i + 1}/${symbols.length}: ${symbol}`);
            
            try {
                // Use the original analyzeStock method with proper delay handling
                const result = await this.analyzeStock(symbol, portfolioId, analysisType);
                
                if (result) {
                    results.push(result);
                    console.log(`✅ AI analysis for ${symbol} saved successfully (attempt 1)`);
                } else {
                    console.log(`❌ AI analysis for ${symbol} failed after retries`);
                }
                
                // Critical: Wait sufficient time between stocks to allow AutoGen to reset
                // This prevents tool call conversation conflicts
                if (i < symbols.length - 1) {
                    console.log('⏳ Waiting 5 seconds before next stock (AutoGen reset time)...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                
            } catch (error) {
                console.error(`❌ Error analyzing ${symbol}:`, error);
                // Continue with other stocks even if one fails
            }
        }
        
        console.log(`✅ Completed AI analysis for portfolio ${portfolioId}`);
        return results;
    }

    /**
     * Get all AI analyses for a portfolio
     */
    async getPortfolioAIAnalyses(portfolioId: number): Promise<AIStockAnalysis[]> {
        return await this.aiAnalysisRepository
            .createQueryBuilder('ai')
            .where('JSON_EXTRACT(ai.portfolioIds, \'$\') LIKE :portfolioId', {
                portfolioId: `%${portfolioId}%`
            })
            .orderBy('ai.analyzedAt', 'DESC')
            .getMany();
    }

    /**
     * Check if FinRobot API is available
     */
    async checkAPIHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/health`, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.error('FinRobot API health check failed:', error);
            return false;
        }
    }

    /**
     * Clean up old AI analyses (older than 7 days)
     */
    async cleanupOldAnalyses(): Promise<void> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const result = await this.aiAnalysisRepository
            .createQueryBuilder()
            .delete()
            .where('analyzedAt < :date', { date: sevenDaysAgo })
            .execute();
            
        console.log(`🧹 Cleaned up ${result.affected} old AI analyses`);
    }
}

// Create instance factory function instead of singleton
export function createFinRobotService(apiBaseUrl?: string): FinRobotService {
    return new FinRobotService(apiBaseUrl);
}

// Export default instance for convenience (but don't instantiate immediately)
let _finRobotServiceInstance: FinRobotService | null = null;

export function getFinRobotService(): FinRobotService {
    if (!_finRobotServiceInstance) {
        _finRobotServiceInstance = new FinRobotService();
    }
    return _finRobotServiceInstance;
} 