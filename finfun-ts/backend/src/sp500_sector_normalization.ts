import yahooFinance from 'yahoo-finance2';
import * as XLSX from 'xlsx';
import path from 'path';
import { StockData } from './utils/analysisUtils';

// Example portfolio (subset of S&P 500)
const PORTFOLIO_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'META'];

// Fetch S&P 500 tickers and sectors from Wikipedia
async function fetchSP500TickersAndSectors(): Promise<{ symbol: string, sector: string }[]> {
  const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
  const response = await fetch(url);
  const text = await response.text();
  const tableMatch = text.match(/<table[^>]*>[\s\S]*?<\/table>/);
  if (!tableMatch) {
    throw new Error('Could not find S&P 500 table');
  }

  const table = tableMatch[0];
  const rows = table.match(/<tr>[\s\S]*?<\/tr>/g) || [];
  const stocks: { symbol: string; sector: string }[] = [];

  for (const row of rows.slice(1)) { // Skip header row
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? [];
    if (cells.length >= 4) { // Make sure we have enough cells
      const symbolMatch = cells[0]?.match(/>([^<]+)</);
      const sectorMatch = cells[3]?.match(/>([^<]+)</);
      if (symbolMatch?.[1] && sectorMatch?.[1]) {
        stocks.push({ 
          symbol: symbolMatch[1],
          sector: sectorMatch[1]
        });
      }
    }
  }

  return stocks;
}

async function fetchStockData(symbols: string[]): Promise<StockData[]> {
  const stocks: StockData[] = [];
  for (const symbol of symbols) {
    try {
      // Skip stocks with special characters (like BRK.B)
      if (symbol.includes('.')) {
        console.warn(`Skipping ${symbol} - special characters not supported`);
        continue;
      }

      // Fetch quote data for current price and 52-week high
      const quote = await yahooFinance.quote(symbol);
      
      // Fetch detailed financial data
      const summary = await yahooFinance.quoteSummary(symbol, {
        modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']
      });

      // Check for critical missing data
      const missingData = [];
      if (!summary.assetProfile?.sector) missingData.push('sector');
      if (summary.defaultKeyStatistics?.profitMargins === undefined) missingData.push('profit margins');
      if (summary.financialData?.debtToEquity === undefined) missingData.push('debt/equity');
      if (summary.summaryDetail?.forwardPE === undefined && summary.summaryDetail?.trailingPE === undefined) missingData.push('P/E ratio');

      if (missingData.length > 0) {
        console.warn(`Skipping ${symbol} - missing critical data: ${missingData.join(', ')}`);
        continue;
      }

      stocks.push({
        symbol,
        sector: summary.assetProfile?.sector || 'Unknown',
        dividendYield: summary.summaryDetail?.dividendYield || 0,
        profitMargins: summary.defaultKeyStatistics?.profitMargins || null,
        debtToEquity: summary.financialData?.debtToEquity || null,
        pe: summary.summaryDetail?.forwardPE || summary.summaryDetail?.trailingPE || null,
        discountFrom52W: summary.summaryDetail?.fiftyTwoWeekHigh && quote.regularMarketPrice
          ? (summary.summaryDetail.fiftyTwoWeekHigh - quote.regularMarketPrice) / summary.summaryDetail.fiftyTwoWeekHigh
          : null
      });
    } catch (e) {
      console.warn(`Failed to fetch data for ${symbol}:`, e);
    }
  }
  return stocks;
}

async function main() {
  // 1. Fetch S&P 500 tickers and sectors from Wikipedia
  console.log('Fetching S&P 500 tickers and sectors from Wikipedia...');
  const sp500Data = await fetchSP500TickersAndSectors();
  const SP500_TICKERS = sp500Data.map(item => item.symbol);
  console.log(`Fetched ${SP500_TICKERS.length} S&P 500 tickers.`);

  // 2. Fetch all S&P 500 stock data
  console.log('Fetching S&P 500 stock data...');
  const allStocks = await fetchStockData(SP500_TICKERS);
  console.log(`Fetched data for ${allStocks.length} stocks.`);

  // 3. Group by sector
  const sectorMap: Record<string, StockData[]> = {};
  for (const stock of allStocks) {
    if (!sectorMap[stock.sector]) sectorMap[stock.sector] = [];
    sectorMap[stock.sector].push(stock);
  }

  // Log sector distribution
  console.log('\nSector Distribution:');
  Object.entries(sectorMap).forEach(([sector, stocks]) => {
    console.log(`${sector}: ${stocks.length} stocks`);
  });

  // 4. Calculate metrics for all sectors
  const sectorData = Object.entries(sectorMap).map(([sector, stocks]) => {
    const metrics = {
      dividendYield: calculateStats(stocks, 'dividendYield'),
      profitMargins: calculateStats(stocks, 'profitMargins'),
      debtToEquity: calculateStats(stocks, 'debtToEquity'),
      pe: calculateStats(stocks, 'pe'),
      discountFrom52W: calculateStats(stocks, 'discountFrom52W')
    };

    return {
      name: sector,
      metrics
    };
  });

  // 5. For debugging: Calculate metrics for portfolio stocks
  const portfolioStocks = allStocks.filter(s => PORTFOLIO_TICKERS.includes(s.symbol));
  if (portfolioStocks.length > 0) {
    const sector = portfolioStocks[0].sector;
    const referenceSet = sectorMap[sector];
    
    // Debug print: show reference set details for comparison with Excel
    console.log(`\nReference set for sector: ${sector}`);
    console.log(`Number of tickers in reference set: ${referenceSet.length}`);
    console.log('Tickers in reference set:', referenceSet.map(s => s.symbol).join(', '));

    // Add detailed logging for Communication Services sector
    if (sector === 'Communication Services') {
      console.log('\n=== Detailed Calculations for Communication Services ===');
      
      // Log calculations for each metric
      const metrics = [
        { name: 'Profit Margins', key: 'profitMargins' as keyof StockData },
        { name: 'Debt to Equity', key: 'debtToEquity' as keyof StockData },
        { name: 'Dividend Yield', key: 'dividendYield' as keyof StockData },
        { name: 'Discount from 52W High', key: 'discountFrom52W' as keyof StockData }
      ];

      metrics.forEach(({ name, key }) => {
        const refValues = referenceSet
          .map(stock => stock[key])
          .filter((val): val is number => val !== undefined && val !== null);
        
        const mean = refValues.reduce((a, b) => a + b, 0) / refValues.length;
        const stdDev = Math.sqrt(refValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / refValues.length);
        
        console.log(`\n${name} Calculations:`);
        console.log(`Raw values: ${refValues.map(v => v.toFixed(4)).join(', ')}`);
        console.log(`Mean: ${mean.toFixed(4)}`);
        console.log(`Standard Deviation: ${stdDev.toFixed(4)}`);
        
        // Calculate and log z-score for each stock in the reference set
        console.log('\nZ-scores for each stock:');
        referenceSet.forEach(stock => {
          const value = stock[key];
          if (typeof value === 'number') {
            const zScore = (value - mean) / stdDev;
            console.log(`${stock.symbol}: ${zScore.toFixed(4)}`);
          }
        });
      });
    }

    // 6. Output to Excel for debugging
    const wb = XLSX.utils.book_new();
    
    // Add raw data sheet with better formatting
    const rawData = portfolioStocks.map(stock => ({
      Symbol: stock.symbol,
      Sector: stock.sector,
      'Dividend Yield': { t: 'n', v: stock.dividendYield || 0 },
      'Profit Margins': { t: 'n', v: stock.profitMargins || null },
      'Debt to Equity': { t: 'n', v: stock.debtToEquity || null },
      'P/E Ratio': { t: 'n', v: stock.pe || null },
      'Discount from 52W High': { t: 'n', v: stock.discountFrom52W || null }
    }));
    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Portfolio Raw');

    // Add reference set with better formatting
    const refData = referenceSet.map(stock => ({
      Symbol: stock.symbol,
      Sector: stock.sector,
      'Dividend Yield': { t: 'n', v: stock.dividendYield || 0 },
      'Profit Margins': { t: 'n', v: stock.profitMargins || null },
      'Debt to Equity': { t: 'n', v: stock.debtToEquity || null },
      'P/E Ratio': { t: 'n', v: stock.pe || null },
      'Discount from 52W High': { t: 'n', v: stock.discountFrom52W || null }
    }));
    const wsRef = XLSX.utils.json_to_sheet(refData);
    XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Set');

    // Save the workbook
    const excelPath = path.join(__dirname, 'sector_analysis_debug.xlsx');
    XLSX.writeFile(wb, excelPath);
    console.log(`\nExcel file saved to: ${excelPath}`);
  }

  // 7. Output JSON for API
  console.log('\nAPI_OUTPUT_START');
  console.log(JSON.stringify(sectorData));
  console.log('API_OUTPUT_END');
}

// Helper function to calculate statistics for a metric
function calculateStats(stocks: StockData[], metric: keyof StockData) {
  const values = stocks
    .map(stock => stock[metric])
    .filter((val): val is number => val !== undefined && val !== null);
  
  if (values.length === 0) {
    return { mean: 0, stdev: 0 };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);

  return { mean, stdev };
}

main().catch(console.error); 