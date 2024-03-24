import pandas as pd
import json

class StocksDataFetcher:
    def __init__(self):
        self.stocks_json = 'stocks_list.json'
        self.stocks_list = self.fetch_sp500_tickers()

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
