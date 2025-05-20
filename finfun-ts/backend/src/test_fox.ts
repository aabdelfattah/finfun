import yahooFinance from 'yahoo-finance2';

async function fetchFOXData() {
  try {
    // Fetch quote data
    const quote = await yahooFinance.quote('FOX');
    console.log('\nQuote Data:');
    console.log(JSON.stringify(quote, null, 2));

    // Fetch detailed financial data
    const summary = await yahooFinance.quoteSummary('FOX', {
      modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']
    });
    console.log('\nSummary Data:');
    console.log(JSON.stringify(summary, null, 2));

  } catch (e) {
    console.error('Error fetching FOX data:', e);
  }
}

fetchFOXData(); 