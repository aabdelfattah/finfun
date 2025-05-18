import pandas as pd
import json
import yfinance as yf
import time
import random

class StocksDataFetcher:
    def __init__(self, fetch_sp500=False):
        """
        Initialize the StocksDataFetcher
        
        Args:
            fetch_sp500 (bool): Whether to fetch SP500 data on initialization
        """
        self.stocks_json = 'stocks_list.json'
        
        if fetch_sp500:
            self.stocks_list = self.fetch_sp500_tickers()
            self.stocks_dict_by_sector = self.fetch_stock_data_by_sector()
        else:
            self.stocks_list = []
            self.stocks_dict_by_sector = {}

    def fetch_sp500_tickers(self, num_stocks=None):
        """Fetch S&P 500 tickers from Wikipedia"""
        url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        sp500_data = pd.read_html(url)
        sp500_df = sp500_data[0]
        sp500_json_data = []
        for _, row in sp500_df.iterrows():
            ticker = row['Symbol']
            sector = row['GICS Sector']
            security_name = row['Security']
            sp500_json_data.append({"ticker": ticker, "sector": sector, "security_name": security_name})

        if num_stocks:
            sp500_json_data = sp500_json_data[:num_stocks]

        with open(self.stocks_json, 'w') as json_file:
            json.dump(sp500_json_data, json_file, indent=4)
        print("S&P 500 tickers, sectors, and security names persisted in " + self.stocks_json + " file.")

        return sp500_json_data
    
    def fetch_stocks_data(self, symbols):
        """
        Fetch data for specific stock symbols
        
        Args:
            symbols (list): List of stock symbols to fetch data for
            
        Returns:
            list: List of dictionaries containing stock data
        """
        stocks_data = []
        for symbol in symbols:
            # Add small delay between requests to avoid rate limiting
            time.sleep(random.uniform(0.5, 1))
            stock_data = self.fetch_yfinance_stock_data(symbol)
            if stock_data:
                stocks_data.append(stock_data)
        return stocks_data
    
    def fetch_stock_data_by_sector(self):
        """Fetch stock data grouped by sector for SP500 stocks"""
        data = {}
        for stock in self.stocks_list:
            ticker = stock['ticker']
            # Add small delay between requests to avoid rate limiting
            time.sleep(random.uniform(0.5, 1))
            stock_data = self.fetch_yfinance_stock_data(ticker)
            if stock_data:
                sector = stock_data['sector']
                if sector not in data:
                    data[sector] = []
                data[sector].append(stock_data)
        return data
              
    def fetch_yfinance_stock_historical_data(self, stock):
        """Fetch historical data for a stock"""
        try:
            hist_data = stock.history(period="max")
            hist_5y = hist_data[hist_data.index >= hist_data.index[-1] - pd.DateOffset(years=5)]
            hist_1y = hist_data[hist_data.index >= hist_data.index[-1] - pd.DateOffset(years=1)]
            return hist_5y, hist_1y, hist_data
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return None, None, None

    def calculate_last_5_years_return(self, hist_5y):
        """Calculate 5-year return for a stock"""
        if hist_5y is None or hist_5y.empty:
            return None
        return (hist_5y.iloc[-1]['Close'] - hist_5y.iloc[0]['Close']) / hist_5y.iloc[0]['Close']

    def fetch_yfinance_stock_data(self, ticker):
        """Fetch current and historical data for a single stock"""
        try:
            print("Getting info for ticker " + ticker)
            stock = yf.Ticker(ticker)
            
            # Get stock info
            info = stock.info
            
            # Get historical data
            hist_5y, hist_1y, hist_alltime = self.fetch_yfinance_stock_historical_data(stock)
            if hist_5y is None:
                return None
                
            last_5_years_return = self.calculate_last_5_years_return(hist_5y)

            return {
                'symbol': ticker,
                'sector': info.get('sector', None),
                'price': info.get('currentPrice', None),
                '52_high': hist_1y['Close'].max() if hist_1y is not None else None,
                'all_time_high': hist_alltime['High'].max() if hist_alltime is not None else None,
                'discount_all_time_high': 1 - (info.get('currentPrice', 0)/(hist_alltime['High'].max() if hist_alltime is not None else 1)),
                'pe': info.get('forwardPE', None),
                'peg': info.get('pegRatio', None),
                'market_cap': info.get('marketCap', None),
                'dividend_yield': info.get('dividendYield', 0),
                'profit_margins': info.get('profitMargins', None),
                'debt_to_equity': info.get('debtToEquity', None),
                'last_5_years_return': last_5_years_return,
            }
        except Exception as e:
            print(f"Error fetching data for symbol {ticker}: {e}")
            return None
