import yahooFinance from 'yahoo-finance2';
import * as XLSX from 'xlsx';
import path from 'path';
import { calculateNormalizedScores, StockData } from './utils/analysisUtils';

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
      if (symbolMatch && sectorMatch) {
        const symbol = symbolMatch[1];
        const sector = sectorMatch[1];
        if (symbol && sector) {
          stocks.push({ symbol, sector });
        }
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
        discountFrom52W: quote.regularMarketDayHigh && quote.regularMarketPrice
          ? (quote.regularMarketDayHigh - quote.regularMarketPrice) / quote.regularMarketDayHigh
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

  // 4. Fetch portfolio data
  const portfolioStocks = allStocks.filter(s => PORTFOLIO_TICKERS.includes(s.symbol));
  if (portfolioStocks.length === 0) {
    console.error('No portfolio stocks found in S&P 500 data.');
    return;
  }
  const sector = portfolioStocks[0].sector;
  const referenceSet = sectorMap[sector];
  if (!referenceSet || referenceSet.length < 2) {
    console.error('Not enough reference stocks in the same sector.');
    return;
  }

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

  // 5. Normalize portfolio stocks against sector reference set
  const normalizedScores = calculateNormalizedScores(portfolioStocks, referenceSet);

  // 6. Output to Excel
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

  // Calculate our means and standard deviations
  const calculateStats = (metric: keyof StockData) => {
    const values = referenceSet
      .map(s => s[metric])
      .filter((v): v is number => v !== null && v !== undefined);
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    
    return { mean, stdDev };
  };

  const stats = {
    dividendYield: calculateStats('dividendYield'),
    profitMargins: calculateStats('profitMargins'),
    debtToEquity: calculateStats('debtToEquity'),
    pe: calculateStats('pe'),
    discountFrom52W: calculateStats('discountFrom52W')
  };

  // Add our calculated summary rows
  refData.push({
    Symbol: 'OUR MEAN',
    Sector: '',
    'Dividend Yield': { t: 'n', v: stats.dividendYield.mean },
    'Profit Margins': { t: 'n', v: stats.profitMargins.mean },
    'Debt to Equity': { t: 'n', v: stats.debtToEquity.mean },
    'P/E Ratio': { t: 'n', v: stats.pe.mean },
    'Discount from 52W High': { t: 'n', v: stats.discountFrom52W.mean }
  });

  refData.push({
    Symbol: 'OUR STDEV',
    Sector: '',
    'Dividend Yield': { t: 'n', v: stats.dividendYield.stdDev },
    'Profit Margins': { t: 'n', v: stats.profitMargins.stdDev },
    'Debt to Equity': { t: 'n', v: stats.debtToEquity.stdDev },
    'P/E Ratio': { t: 'n', v: stats.pe.stdDev },
    'Discount from 52W High': { t: 'n', v: stats.discountFrom52W.stdDev }
  });

  // Add empty rows for Excel formulas
  refData.push({
    Symbol: 'EXCEL MEAN',
    Sector: '',
    'Dividend Yield': { t: 'n', v: 0 },
    'Profit Margins': { t: 'n', v: null },
    'Debt to Equity': { t: 'n', v: null },
    'P/E Ratio': { t: 'n', v: null },
    'Discount from 52W High': { t: 'n', v: null }
  });

  refData.push({
    Symbol: 'EXCEL STDEV',
    Sector: '',
    'Dividend Yield': { t: 'n', v: 0 },
    'Profit Margins': { t: 'n', v: null },
    'Debt to Equity': { t: 'n', v: null },
    'P/E Ratio': { t: 'n', v: null },
    'Discount from 52W High': { t: 'n', v: null }
  });

  const wsRef = XLSX.utils.json_to_sheet(refData);
  
  // Add Excel formulas after creating the sheet
  const lastRow = refData.length;
  const excelMeanRow = lastRow - 1;
  const excelStdevRow = lastRow;

  // Add Excel formulas for means
  wsRef[`C${excelMeanRow + 1}`] = { t: 'n', f: 'AVERAGE(C2:C' + (lastRow - 3) + ')' };
  wsRef[`D${excelMeanRow + 1}`] = { t: 'n', f: 'AVERAGE(D2:D' + (lastRow - 3) + ')' };
  wsRef[`E${excelMeanRow + 1}`] = { t: 'n', f: 'AVERAGE(E2:E' + (lastRow - 3) + ')' };
  wsRef[`F${excelMeanRow + 1}`] = { t: 'n', f: 'AVERAGE(F2:F' + (lastRow - 3) + ')' };
  wsRef[`G${excelMeanRow + 1}`] = { t: 'n', f: 'AVERAGE(G2:G' + (lastRow - 3) + ')' };

  // Add Excel formulas for standard deviations
  wsRef[`C${excelStdevRow + 1}`] = { t: 'n', f: 'STDEV(C2:C' + (lastRow - 3) + ')' };
  wsRef[`D${excelStdevRow + 1}`] = { t: 'n', f: 'STDEV(D2:D' + (lastRow - 3) + ')' };
  wsRef[`E${excelStdevRow + 1}`] = { t: 'n', f: 'STDEV(E2:E' + (lastRow - 3) + ')' };
  wsRef[`F${excelStdevRow + 1}`] = { t: 'n', f: 'STDEV(F2:F' + (lastRow - 3) + ')' };
  wsRef[`G${excelStdevRow + 1}`] = { t: 'n', f: 'STDEV(G2:G' + (lastRow - 3) + ')' };

  // Set column widths for better readability
  const colWidths = [
    { wch: 10 },  // Symbol
    { wch: 15 },  // Sector
    { wch: 15 },  // Raw values (5 columns)
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 }
  ];
  wsRef['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsRef, 'Sector Reference');

  // Add normalized scores with better formatting
  const normalizedData = normalizedScores.map(score => ({
    Symbol: score.symbol,
    'Health Score': { t: 'n', v: score.healthScore },
    'Value Score': { t: 'n', v: score.valueScore },
    'Total Score': { t: 'n', v: score.totalScore }
  }));
  const wsNorm = XLSX.utils.json_to_sheet(normalizedData);
  XLSX.utils.book_append_sheet(wb, wsNorm, 'Portfolio Normalized');

  // Add comparison sheet with Excel formulas for z-scores
  const comparisonData = portfolioStocks.map(stock => {
    // Get raw numeric values for Excel formulas
    const rawValues = {
      dividendYield: stock.dividendYield || 0,
      profitMargins: stock.profitMargins || 0,
      debtToEquity: stock.debtToEquity || 0,
      pe: stock.pe || 0,
      discountFrom52W: stock.discountFrom52W || 0
    };

    // Create Excel formulas that handle N/A values
    const createZScoreFormula = (value: number, refCol: string) => {
      if (value === 0) {
        return { t: 's', v: 'N/A' }; // Return N/A as string if no data
      }
      return {
        t: 'n',
        f: `STANDARDIZE(${value},AVERAGE('Sector Reference'!${refCol}:${refCol}),STDEV('Sector Reference'!${refCol}:${refCol}))`
      };
    };

    // Calculate our z-scores
    const ourZScore = (value: number, refCol: string) => {
      if (value === 0) return null;
      const refValues = referenceSet.map(s => {
        switch(refCol) {
          case 'C': return s.dividendYield || 0;
          case 'D': return s.profitMargins || 0;
          case 'E': return s.debtToEquity || 0;
          case 'F': return s.pe || 0;
          case 'G': return s.discountFrom52W || 0;
          default: return 0;
        }
      }).filter(v => v !== 0);
      
      const mean = refValues.reduce((a, b) => a + b, 0) / refValues.length;
      const stdDev = Math.sqrt(refValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / refValues.length);
      
      return (value - mean) / stdDev;
    };

    return {
      Symbol: stock.symbol,
      'Dividend Yield': { t: 'n', v: stock.dividendYield || 0 },
      'Our Dividend Yield Z-Score': { t: 'n', v: ourZScore(rawValues.dividendYield, 'C') },
      'Excel Dividend Yield Z-Score': createZScoreFormula(rawValues.dividendYield, 'C'),
      'Profit Margins': { t: 'n', v: stock.profitMargins || null },
      'Our Profit Margins Z-Score': { t: 'n', v: ourZScore(rawValues.profitMargins, 'D') },
      'Excel Profit Margins Z-Score': createZScoreFormula(rawValues.profitMargins, 'D'),
      'Debt to Equity': { t: 'n', v: stock.debtToEquity || null },
      'Our Debt to Equity Z-Score': { t: 'n', v: ourZScore(rawValues.debtToEquity, 'E') },
      'Excel Debt to Equity Z-Score': createZScoreFormula(rawValues.debtToEquity, 'E'),
      'P/E Ratio': { t: 'n', v: stock.pe || null },
      'Our P/E Ratio Z-Score': { t: 'n', v: ourZScore(rawValues.pe, 'F') },
      'Excel P/E Ratio Z-Score': createZScoreFormula(rawValues.pe, 'F'),
      'Discount from 52W High': { t: 'n', v: stock.discountFrom52W || null },
      'Our Discount Z-Score': { t: 'n', v: ourZScore(rawValues.discountFrom52W, 'G') },
      'Excel Discount Z-Score': createZScoreFormula(rawValues.discountFrom52W, 'G')
    };
  });

  const wsComparison = XLSX.utils.json_to_sheet(comparisonData);
  
  // Set column widths for better readability
  const colWidthsComparison = [
    { wch: 10 },  // Symbol
    { wch: 15 },  // Dividend Yield
    { wch: 20 },  // Our Dividend Yield Z-Score
    { wch: 20 },  // Excel Dividend Yield Z-Score
    { wch: 15 },  // Profit Margins
    { wch: 20 },  // Our Profit Margins Z-Score
    { wch: 20 },  // Excel Profit Margins Z-Score
    { wch: 15 },  // Debt to Equity
    { wch: 20 },  // Our Debt to Equity Z-Score
    { wch: 20 },  // Excel Debt to Equity Z-Score
    { wch: 15 },  // P/E Ratio
    { wch: 20 },  // Our P/E Ratio Z-Score
    { wch: 20 },  // Excel P/E Ratio Z-Score
    { wch: 20 },  // Discount from 52W High
    { wch: 20 },  // Our Discount Z-Score
    { wch: 20 }   // Excel Discount Z-Score
  ];
  wsComparison['!cols'] = colWidthsComparison;

  XLSX.utils.book_append_sheet(wb, wsComparison, 'Z-Score Comparison');

  const excelPath = path.join(__dirname, 'portfolio_sector_normalization.xlsx');
  XLSX.writeFile(wb, excelPath);
  console.log(`\nResults written to ${excelPath}`);

  // Output sector data as JSON for the API
  const sectorData = Object.entries(sectorMap).map(([sector]) => {
    const metrics = {
      dividendYield: calculateStats('dividendYield'),
      profitMargins: calculateStats('profitMargins'),
      debtToEquity: calculateStats('debtToEquity'),
      pe: calculateStats('pe'),
      discountFrom52W: calculateStats('discountFrom52W')
    };

    return {
      name: sector,
      metrics: {
        dividendYield: { mean: metrics.dividendYield.mean, stdev: metrics.dividendYield.stdDev },
        profitMargins: { mean: metrics.profitMargins.mean, stdev: metrics.profitMargins.stdDev },
        debtToEquity: { mean: metrics.debtToEquity.mean, stdev: metrics.debtToEquity.stdDev },
        pe: { mean: metrics.pe.mean, stdev: metrics.pe.stdDev },
        discountFrom52W: { mean: metrics.discountFrom52W.mean, stdev: metrics.discountFrom52W.stdDev }
      }
    };
  });

  // Log the data structure before stringifying
  console.log('\nSector data structure:');
  console.log(JSON.stringify(sectorData, null, 2));

  // Output JSON data for the API (single line)
  console.log('\nAPI_OUTPUT_START');
  console.log(JSON.stringify(sectorData));
  console.log('API_OUTPUT_END');
}

main().catch(console.error); 