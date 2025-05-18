import pandas as pd
import numpy as np

class StocksAnalyzer:
    def __init__(self):
        self.analyzed_stocks = pd.DataFrame()

    def normalize_parameter(self, parameter):
        """Normalize a parameter using z-score normalization"""
        if parameter.isnull().all():  # If all values are null
            return parameter
        mean = np.mean(parameter.dropna())
        std = np.std(parameter.dropna(), ddof=1)
        if std == 0:  # If there's no variation
            return parameter - mean
        return (parameter - mean) / std

    def calculate_scores(self, df):
        """Calculate health and value scores for stocks"""
        # Health score components and weights
        wd = 1/3  # dividend yield weight
        wp = 1/3  # profit margins weight
        wde = -1/3  # debt to equity weight (negative because lower is better)
        
        # Value score components and weights
        wpe = -0.6  # P/E ratio weight (negative because lower is better)
        wdh = 0.4  # discount from all-time high weight
        
        # Normalize metrics
        df['normalized_dividend_yield'] = self.normalize_parameter(df['dividend_yield'])
        df['normalized_debt_to_equity'] = self.normalize_parameter(df['debt_to_equity'])
        df['normalized_profit_margins'] = self.normalize_parameter(df['profit_margins'])
        df['normalized_pe'] = self.normalize_parameter(df['pe'])
        df['normalized_discount_all_time_high'] = self.normalize_parameter(df['discount_all_time_high'])

        # Calculate scores
        df['health_score'] = (
            wd * df['normalized_dividend_yield'].fillna(0) + 
            wde * df['normalized_debt_to_equity'].fillna(0) + 
            wp * df['normalized_profit_margins'].fillna(0)
        )
        
        df['value_score'] = (
            wpe * df['normalized_pe'].fillna(0) + 
            wdh * df['normalized_discount_all_time_high'].fillna(0)
        )
        
        # Calculate total score (equal weight to health and value)
        df['total_score'] = (df['health_score'] + df['value_score']) / 2
        
        # Scale scores to 0-100 range for easier interpretation
        for score_col in ['health_score', 'value_score', 'total_score']:
            if not df[score_col].isnull().all():
                min_score = df[score_col].min()
                max_score = df[score_col].max()
                if max_score != min_score:
                    df[score_col] = 50 + (df[score_col] - df[score_col].mean()) / (max_score - min_score) * 50
                else:
                    df[score_col] = 50
        
        # Generate recommendations based on total score
        df['recommendation'] = pd.cut(
            df['total_score'],
            bins=[-float('inf'), 30, 45, 65, float('inf')],
            labels=['Sell', 'Hold', 'Buy', 'Strong Buy']
        )
        
        return df

    def analyze_stocks(self, stocks_dict_by_sector, rank=None):
        """Analyze stocks in the portfolio"""
        all_stocks = []
        for sector, stocks_data in stocks_dict_by_sector.items():
            if not stocks_data:  # Skip if no valid stock data
                continue
            df = pd.DataFrame(stocks_data)
            df = self.calculate_scores(df)
            all_stocks.append(df)
        
        if all_stocks:
            self.analyzed_stocks = pd.concat(all_stocks)
            self.analyzed_stocks = self.analyzed_stocks.sort_values('total_score', ascending=False)
        
        return self.analyzed_stocks
