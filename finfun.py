import yfinance as yf
import pandas as pd
import json
import pygsheets
import json
import cProfile
import argparse
import numpy as np
from stocks_data_fetcher import StocksDataFetcher





# compresses a set of data to a normal standard deviation with mean=0 , sigma=1 and 99.7% of the points wil lie between 3 and -3
def normalize_parameter( parameter):
    mean = np.mean(parameter)
    std = np.std(parameter, ddof=1)
    return (parameter - mean) / std

def calculate_score( df):
    wd = wp = 1/3
    wde = -(1/3)
    df['normalized_dividend_yield'] = normalize_parameter(df['dividend_yield'])
    df['normalized_debt_to_equity'] = normalize_parameter(df['debt_to_equity'])
    df['normalized_profit_margins'] = normalize_parameter(df['profit_margins'])

    wpe = -0.6
    wdh = 0.4
    df['normalized_pe'] =  normalize_parameter(df['pe'])
    df['normalized_discount_all_time_high'] = normalize_parameter(df['discount_all_time_high'])

    df['health_score'] = wd * df['normalized_dividend_yield'] + wde * df['normalized_debt_to_equity'] + wp * df['normalized_profit_margins']
    df['value_score'] = wpe * df['normalized_pe'] + wdh * df['normalized_discount_all_time_high']    

    df['health_score_rank'] = df['health_score'].rank(ascending=False, method='min')
    df['value_score_rank'] = df['value_score'].rank(ascending=False, method='min')
    df['last_5_years_return_rank'] = df['last_5_years_return'].rank(ascending=False, method='min')
    df['total_rank'] = (df['health_score_rank'] + df['value_score_rank'] +  df['last_5_years_return_rank']).rank(method='min')

    return df
    


def publish_to_google_sheet(df, spreadsheet_name, sheet_name):
    # Authenticate with Pygsheets
    gc = pygsheets.authorize()

    # Open the spreadsheet and select the sheet
    sh = gc.open(spreadsheet_name)
    wks = sh.worksheet_by_title(sheet_name)

    # Update the sheet with the DataFrame
    df.fillna(0, inplace=True)
    wks.set_dataframe(df, 'A1')

def main(r):
    fetcher = StocksDataFetcher()
    sp500_stocks = fetcher.stocks_list
    data = fetcher.stocks_dict_by_sector 
    sector_dataframes ={}
    top_ranked_stocks = pd.DataFrame()  # Initialize as empty DataFrame
    for sector, stocks_data in data.items():
        df = pd.DataFrame(stocks_data)
        df = calculate_score(df)
        sector_dataframes[sector] = df
        top_ranked_stocks = pd.concat([top_ranked_stocks, df.nsmallest(r, 'total_rank')])  # Select top r ranked stocks in each sector

    # Now you have a dictionary of DataFrames with the sector as a key
    for sector, df in sector_dataframes.items():
        print(f"\nSector: {sector}")
        print(df)
    
    # Publish DataFrame to Google Sheet
    #spreadsheet_name = 'FinFun'
    #sheet_name = 'Data'
    #publish_to_google_sheet(df, spreadsheet_name, sheet_name)

    # Publish DataFrame to excel
    all_stocks_df = pd.concat(sector_dataframes.values(), ignore_index=True)
    excel_file_path = 'FinFun.xlsx'  # Path to save the Excel file
    all_stocks_df.to_excel(excel_file_path, index=False)

    # Publish top ranked stocks DataFrame to excel
    excel_file_path = 'TopRankedStocks.xlsx'
    top_ranked_stocks.to_excel(excel_file_path, index=False)

def parse_arguments():
    parser = argparse.ArgumentParser(description='Analyzes stocks according to fundamental metrics.')
    parser.add_argument('-p', '--profile', action='store_true', help='Enable profiling')
    parser.add_argument('-r', '--rank', type=int, required=True, help='Get top-ranked stocks up to specified rank')

    return parser.parse_args()

#TODO: Add publish to database
#TODO: Add integration to langchain
#TODO: Refactor to separate concerns and add some design
if __name__ == "__main__":
    args = parse_arguments()
    if args.profile:
        cProfile.run('main()', sort='cumulative')
    else:
        main(args.rank)

