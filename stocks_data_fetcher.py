import pandas as pd
import json
import yfinance as yf

class StocksDataFetcher:
    def __init__(self):
        self.stocks_json = 'stocks_list.json'
        self.stocks_list = self.fetch_sp500_tickers()
        self.stocks_dict_by_sector = self.fetch_stock_data_by_sector()

    def fetch_sp500_tickers(self, num_stocks=None):
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
    
    def fetch_local_tickers(self):
        with open(self.stocks_json, 'w') as json_file:
            local_stocks_json_data = json.load(json_file)
        return local_stocks_json_data
    
    def fetch_stock_data_by_sector(self):
        data = {}
        for stock in self.stocks_list:
            ticker = stock['ticker']
            stock_data = self.fetch_yfinance_stock_data(ticker)
            if stock_data:
                sector = stock_data['sector']
                if sector not in data:
                    data[sector] = []
                data[sector].append(stock_data)
        return data
              
    #TODO: Get sector PE and compare PE relative to Sector PE
    def fetch_yfinance_stock_historical_data(self, stock):
        hist_data = stock.history(period="max")
        hist_5y = hist_data[hist_data.index >= hist_data.index[-1] - pd.DateOffset(years=5)]
        hist_1y = hist_data[hist_data.index >= hist_data.index[-1] - pd.DateOffset(years=1)]
        return hist_5y, hist_1y, hist_data

    def calculate_last_5_years_return(self, hist_5y):
        return (hist_5y.iloc[-1]['Close'] - hist_5y.iloc[0]['Close']) / hist_5y.iloc[0]['Close']

    def fetch_yfinance_stock_data(self,ticker):
        try:
            print("Getting info for ticker "+ticker)
            stock = yf.Ticker(ticker)
            hist_5y, hist_1y, hist_alltime = self.fetch_yfinance_stock_historical_data(stock)
            last_5_years_return = self.calculate_last_5_years_return(hist_5y)

            return {
                'symbol': ticker,
                'sector': stock.info.get('sector', None),
                'price': stock.info.get('currentPrice', None),
                '52_high': hist_1y['Close'].max(),
                'all_time_high': hist_alltime['High'].max(),
                'discount_all_time_high':1 - (stock.info.get('currentPrice', None)/(hist_alltime['High'].max())),
                'pe': stock.info.get('forwardPE', None),
                'peg': stock.info.get('pegRatio', None),
                'market_cap': stock.info.get('marketCap', None),
                'dividend_yield': stock.info.get('dividendYield', 0),
                'profit_margins':stock.info.get('profitMargins', None),
                'debt_to_equity':stock.info.get('debtToEquity', None),
                'last_5_years_return': last_5_years_return,
            }
        except Exception as e:
            print(f"Error fetching data for symbol {ticker}: {e}")
            return None
