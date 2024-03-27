import pandas as pd
import numpy as np

class StocksAnalyzer:
    def __init__(self):
        self.sector_dataframes = {}
        self.top_ranked_stocks = pd.DataFrame()

    def normalize_parameter(self, parameter):
        mean = np.mean(parameter)
        std = np.std(parameter, ddof=1)
        return (parameter - mean) / std

    def calculate_score(self, df):
        wd = wp = 1 / 3
        wde = -(1 / 3)
        df['normalized_dividend_yield'] = self.normalize_parameter(df['dividend_yield'])
        df['normalized_debt_to_equity'] = self.normalize_parameter(df['debt_to_equity'])
        df['normalized_profit_margins'] = self.normalize_parameter(df['profit_margins'])

        wpe = -0.6
        wdh = 0.4
        df['normalized_pe'] = self.normalize_parameter(df['pe'])
        df['normalized_discount_all_time_high'] = self.normalize_parameter(df['discount_all_time_high'])

        df['health_score'] = wd * df['normalized_dividend_yield'] + wde * df['normalized_debt_to_equity'] + wp * \
                             df['normalized_profit_margins']
        df['value_score'] = wpe * df['normalized_pe'] + wdh * df['normalized_discount_all_time_high']

        df['health_score_rank'] = df['health_score'].rank(ascending=False, method='min')
        df['value_score_rank'] = df['value_score'].rank(ascending=False, method='min')
        df['last_5_years_return_rank'] = df['last_5_years_return'].rank(ascending=False, method='min')
        df['total_rank'] = (df['health_score_rank'] + df['value_score_rank'] + df['last_5_years_return_rank']).rank(
            method='min')

        return df

    def analyze_stocks(self, stocks_dict_by_sector, r):
        for sector, stocks_data in stocks_dict_by_sector.items():
            df = pd.DataFrame(stocks_data)
            df = self.calculate_score(df)
            self.sector_dataframes[sector] = df
            self.top_ranked_stocks = pd.concat([self.top_ranked_stocks, df.nsmallest(r, 'total_rank')])
        # Now you have a dictionary of DataFrames with the sector as a key
        for sector, df in self.sector_dataframes.items():
            print(f"\nSector: {sector}")
            print(df)
        return self.top_ranked_stocks
