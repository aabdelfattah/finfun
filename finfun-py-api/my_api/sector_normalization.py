import requests
import re
from typing import List, Dict, Optional
from dataclasses import dataclass
from pathlib import Path
from finrobot.data_source.yfinance_utils import YFinanceUtils

@dataclass
class StockData:
    symbol: str
    sector: str
    dividend_yield: float
    profit_margins: Optional[float]
    debt_to_equity: Optional[float]
    pe: Optional[float]
    discount_from_52w: Optional[float]
    price: Optional[float]

async def fetch_sp500_tickers_and_sectors() -> List[Dict[str, str]]:
    """
    Fetch S&P 500 tickers and sectors from Wikipedia.
    Returns a list of dictionaries containing symbol and sector information.
    """
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    response = requests.get(url)
    text = response.text
    
    # Find the table containing S&P 500 data
    table_match = re.search(r'<table[^>]*>[\s\S]*?<\/table>', text)
    if not table_match:
        raise Exception('Could not find S&P 500 table')
    
    table = table_match.group(0)
    rows = re.findall(r'<tr>[\s\S]*?<\/tr>', table)
    stocks = []
    
    # Skip header row
    for row in rows[1:]:
        cells = re.findall(r'<td[^>]*>[\s\S]*?<\/td>', row)
        if len(cells) >= 4:
            symbol_match = re.search(r'>([^<]+)<', cells[0])
            sector_match = re.search(r'>([^<]+)<', cells[3])
            if symbol_match and sector_match:
                stocks.append({
                    'symbol': symbol_match.group(1),
                    'sector': sector_match.group(1)
                })
    
    return stocks

async def fetch_sp400_tickers_and_sectors() -> List[Dict[str, str]]:
    """
    Fetch S&P 400 tickers and sectors from Wikipedia.
    Returns a list of dictionaries containing symbol and sector information.
    """
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_400_companies'
    response = requests.get(url)
    text = response.text
    
    # Find the table containing S&P 400 data
    table_match = re.search(r'<table[^>]*>[\s\S]*?<\/table>', text)
    if not table_match:
        raise Exception('Could not find S&P 400 table')
    
    table = table_match.group(0)
    rows = re.findall(r'<tr>[\s\S]*?<\/tr>', table)
    stocks = []
    
    # Skip header row
    for row in rows[1:]:
        cells = re.findall(r'<td[^>]*>[\s\S]*?<\/td>', row)
        if len(cells) >= 4:
            symbol_match = re.search(r'>([^<]+)<', cells[0])
            sector_match = re.search(r'>([^<]+)<', cells[3])
            if symbol_match and sector_match:
                stocks.append({
                    'symbol': symbol_match.group(1),
                    'sector': sector_match.group(1)
                })
    
    return stocks

async def fetch_sp600_tickers_and_sectors() -> List[Dict[str, str]]:
    """
    Fetch S&P 600 tickers and sectors from Wikipedia.
    Returns a list of dictionaries containing symbol and sector information.
    """
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_600_companies'
    response = requests.get(url)
    text = response.text
    
    # Find the table containing S&P 600 data
    table_match = re.search(r'<table[^>]*>[\s\S]*?<\/table>', text)
    if not table_match:
        raise Exception('Could not find S&P 600 table')
    
    table = table_match.group(0)
    rows = re.findall(r'<tr>[\s\S]*?<\/tr>', table)
    stocks = []
    
    # Skip header row
    for row in rows[1:]:
        cells = re.findall(r'<td[^>]*>[\s\S]*?<\/td>', row)
        if len(cells) >= 4:
            symbol_match = re.search(r'>([^<]+)<', cells[0])
            sector_match = re.search(r'>([^<]+)<', cells[3])
            if symbol_match and sector_match:
                stocks.append({
                    'symbol': symbol_match.group(1),
                    'sector': sector_match.group(1)
                })
    
    return stocks

async def fetch_sp1500_tickers_and_sectors() -> List[Dict[str, str]]:
    """
    Fetch all S&P 1500 tickers and sectors (S&P 500 + S&P 400 + S&P 600).
    Returns a list of dictionaries containing symbol and sector information.
    """
    print('Fetching S&P 500 tickers and sectors...')
    sp500_data = await fetch_sp500_tickers_and_sectors()
    print(f"Fetched {len(sp500_data)} S&P 500 tickers.")
    
    print('Fetching S&P 400 tickers and sectors...')
    sp400_data = await fetch_sp400_tickers_and_sectors()
    print(f"Fetched {len(sp400_data)} S&P 400 tickers.")
    
    print('Fetching S&P 600 tickers and sectors...')
    sp600_data = await fetch_sp600_tickers_and_sectors()
    print(f"Fetched {len(sp600_data)} S&P 600 tickers.")
    
    # Combine all data
    all_stocks = sp500_data + sp400_data + sp600_data
    print(f"Total S&P 1500 tickers: {len(all_stocks)}")
    
    return all_stocks

async def fetch_stock_data(symbols: List[str]) -> List[StockData]:
    """
    Fetch stock data using FinRobot's YFinanceUtils.
    Returns a list of StockData objects containing financial metrics.
    """
    stocks = []
    for symbol in symbols:
        try:
            # Skip stocks with special characters (like BRK.B)
            if '.' in symbol:
                print(f"Skipping {symbol} - special characters not supported")
                continue
            
            # Get stock data using FinRobot's utilities
            stock_info = YFinanceUtils.get_stock_info(symbol)
            
            # Check for critical missing data
            missing_data = []
            if not stock_info.get('sector'): missing_data.append('sector')
            if not stock_info.get('profitMargins'): missing_data.append('profit margins')
            if not stock_info.get('debtToEquity'): missing_data.append('debt/equity')
            if not stock_info.get('forwardPE') and not stock_info.get('trailingPE'): 
                missing_data.append('P/E ratio')
            
            if missing_data:
                print(f"Skipping {symbol} - missing critical data: {', '.join(missing_data)}")
                continue
            
            # Calculate discount from 52-week high
            fifty_two_week_high = stock_info.get('fiftyTwoWeekHigh')
            current_price = stock_info.get('currentPrice')
            discount_from_52w = None
            if fifty_two_week_high and current_price:
                discount_from_52w = (fifty_two_week_high - current_price) / fifty_two_week_high
            
            stocks.append(StockData(
                symbol=symbol,
                sector=stock_info.get('sector', 'Unknown'),
                dividend_yield=stock_info.get('dividendYield', 0),
                profit_margins=stock_info.get('profitMargins'),
                debt_to_equity=stock_info.get('debtToEquity'),
                pe=stock_info.get('forwardPE') or stock_info.get('trailingPE'),
                discount_from_52w=discount_from_52w,
                price=current_price
            ))
            
        except Exception as e:
            print(f"Failed to fetch data for {symbol}: {str(e)}")
    
    return stocks

def calculate_stats(stocks: List[StockData], metric: str) -> Dict[str, float]:
    """
    Calculate mean and standard deviation for a given metric.
    """
    values = [getattr(stock, metric) for stock in stocks 
             if getattr(stock, metric) is not None]
    
    if not values:
        return {'mean': 0, 'stdev': 0}
    
    mean = sum(values) / len(values)
    stdev = (sum((x - mean) ** 2 for x in values) / len(values)) ** 0.5
    
    return {'mean': mean, 'stdev': stdev}

async def fetch_nasdaq_tickers() -> List[str]:
    """
    Load and parse the NASDAQ-listed securities file.
    Returns a list of active stock symbols (excluding ETFs).
    """
    tickers = []
    file_path = Path(__file__).parent.parent / "nasdaqlisted.txt"
    
    try:
        with open(file_path, 'r') as file:
            # Skip header line
            next(file)
            for line in file:
                parts = line.strip().split('|')
                if len(parts) >= 7:  # Ensure we have all required fields
                    # Only include active stocks (not ETFs)
                    if parts[6] == 'N' and parts[4] == 'N':  # Not ETF and active status
                        tickers.append(parts[0])
    except Exception as e:
        raise Exception(f"Error loading NASDAQ tickers: {str(e)}")
    
    return tickers

async def main(use_nasdaq: bool = False):
    """
    Main function to calculate sector normalization metrics.
    Args:
        use_nasdaq: If True, use NASDAQ tickers instead of S&P 1500
    """
    if use_nasdaq:
        # 1. Fetch NASDAQ tickers
        print('Loading NASDAQ tickers...')
        tickers = await fetch_nasdaq_tickers()
        print(f"Loaded {len(tickers)} NASDAQ tickers.")
    else:
        # 1. Fetch S&P 1500 tickers and sectors
        print('Fetching S&P 1500 tickers and sectors...')
        sp1500_data = await fetch_sp1500_tickers_and_sectors()
        tickers = [item['symbol'] for item in sp1500_data]
        print(f"Fetched {len(tickers)} S&P 1500 tickers.")
    
    # 2. Fetch stock data
    print('Fetching stock data...')
    all_stocks = await fetch_stock_data(tickers)
    print(f"Fetched data for {len(all_stocks)} stocks.")
    
    # 3. Group by sector
    sector_map = {}
    for stock in all_stocks:
        if stock.sector not in sector_map:
            sector_map[stock.sector] = []
        sector_map[stock.sector].append(stock)
    
    # Log sector distribution
    print('\nSector Distribution:')
    for sector, stocks in sector_map.items():
        print(f"{sector}: {len(stocks)} stocks")
    
    # 4. Calculate metrics for all sectors
    sector_data = []
    for sector, stocks in sector_map.items():
        metrics = {
            'dividend_yield': calculate_stats(stocks, 'dividend_yield'),
            'profit_margins': calculate_stats(stocks, 'profit_margins'),
            'debt_to_equity': calculate_stats(stocks, 'debt_to_equity'),
            'pe': calculate_stats(stocks, 'pe'),
            'discount_from_52w': calculate_stats(stocks, 'discount_from_52w')
        }
        
        sector_data.append({
            'name': sector,
            'metrics': metrics
        })
    
    return sector_data

if __name__ == '__main__':
    import asyncio
    result = asyncio.run(main())
    print('\nAPI_OUTPUT_START')
    print(result)
    print('API_OUTPUT_END') 