import * as fs from 'fs';
import * as path from 'path';

interface TickerData {
    symbol: string;
    name: string;
    marketCategory: string;
    etf: boolean;
}

class TickerService {
    private tickers: TickerData[] = [];
    private initialized = false;

    async initialize() {
        if (this.initialized) return;

        try {
            // Path to nasdaqlisted.txt - correct path to reach the Python API directory
            const tickerFilePath = path.join(__dirname, '../../../../finfun-py-api/nasdaqlisted.txt');
            const fileContent = fs.readFileSync(tickerFilePath, 'utf-8');
            
            const lines = fileContent.split('\n');
            // Skip header line and last empty line
            for (let i = 1; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line) {
                    const columns = line.split('|');
                    if (columns.length >= 7) {
                        this.tickers.push({
                            symbol: columns[0].trim(),
                            name: columns[1].trim(),
                            marketCategory: columns[2].trim(),
                            etf: columns[6].trim() === 'Y'
                        });
                    }
                }
            }
            
            this.initialized = true;
            console.log(`Loaded ${this.tickers.length} tickers from NASDAQ list`);
        } catch (error) {
            console.error('Failed to load ticker data:', error);
            throw new Error('Failed to initialize ticker service');
        }
    }

    async searchTickers(query: string, limit: number = 10): Promise<TickerData[]> {
        await this.initialize();
        
        if (!query || query.length === 0) return [];
        
        const upperQuery = query.toUpperCase();
        const results: TickerData[] = [];
        
        // Exact matches first
        for (const ticker of this.tickers) {
            if (ticker.symbol === upperQuery) {
                results.push(ticker);
                break;
            }
        }
        
        // Then prefix matches
        for (const ticker of this.tickers) {
            if (ticker.symbol.startsWith(upperQuery) && ticker.symbol !== upperQuery) {
                results.push(ticker);
                if (results.length >= limit) break;
            }
        }
        
        // Then name matches if we still have space
        if (results.length < limit) {
            for (const ticker of this.tickers) {
                if (results.find(r => r.symbol === ticker.symbol)) continue;
                
                if (ticker.name.toUpperCase().includes(upperQuery)) {
                    results.push(ticker);
                    if (results.length >= limit) break;
                }
            }
        }
        
        return results;
    }

    async validateTicker(symbol: string): Promise<TickerData | null> {
        await this.initialize();
        
        const upperSymbol = symbol.toUpperCase();
        return this.tickers.find(ticker => ticker.symbol === upperSymbol) || null;
    }

    async getAllTickers(): Promise<TickerData[]> {
        await this.initialize();
        return [...this.tickers];
    }
}

export const tickerService = new TickerService();
export { TickerData }; 