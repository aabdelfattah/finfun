import yfinance as yf
import pandas as pd
import json
import pygsheets
import json
import cProfile
import argparse
import numpy as np



def get_sp500_tickers_wikipedia(sp500_list_json):
    # Fetch S&P 500 constituents from Wikipedia
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    sp500_data = pd.read_html(url)
    sp500_df = sp500_data[0]  # The first table on the page contains S&P 500 constituents

    # Prepare data in the required format
    sp500_json_data = []
    for index, row in sp500_df.iterrows():
        ticker = row['Symbol']
        sector = row['GICS Sector']
        security_name = row['Security']
        sp500_json_data.append({"ticker": ticker, "sector": sector, "security_name": security_name})

    # Write data to JSON file
    with open(sp500_list_json, 'w') as json_file:
        json.dump(sp500_json_data, json_file, indent=4)

    print("S&P 500 tickers, sectors, and security names persisted in " + sp500_list_json + " file.")


#TODO: Get sector PE and compare PE relative to Sector PE
def get_historical_data(stock):
    hist_data = stock.history(period="max")
    hist_5y = hist_data[hist_data.index >= hist_data.index[-1] - pd.DateOffset(years=5)]
    hist_1y = hist_data[hist_data.index >= hist_data.index[-1] - pd.DateOffset(years=1)]
    return hist_5y, hist_1y, hist_data

def calculate_last_5_years_return(hist_5y):
    return (hist_5y.iloc[-1]['Close'] - hist_5y.iloc[0]['Close']) / hist_5y.iloc[0]['Close']


def normalize_parameter( parameter):
    mean = np.mean(parameter)
    std = np.std(parameter, ddof=1)
    return (parameter - mean) / std

def calculate_score( df):
    wd = wde = wp = 0.2
    df_temp={}
    df_temp['normalized_dividend_yield'] = normalize_parameter(df['dividend_yield'])
    df_temp['normalized_debt_to_equity'] = 1 - normalize_parameter(df['debt_to_equity'])
    df_temp['normalized_profit_margins'] = normalize_parameter(df['profit_margins'])

    
    wpe = 0.6
    wdh = 0.4
    df_temp['normalized_pe'] = 1 - normalize_parameter(df['pe'])
    df_temp['normalized_discount_all_time_high'] = normalize_parameter(df['discount_all_time_high'])

    df_temp['health_score'] = wd * df_temp['normalized_dividend_yield'] + wde * df_temp['normalized_debt_to_equity'] + wp * df_temp['normalized_profit_margins']
    df_temp['value_score'] = wpe * df_temp['normalized_pe'] + wdh * df_temp['normalized_discount_all_time_high']
    
    df['health_score_rank'] = df_temp['health_score'].rank(ascending=False, method='min')
    df['value_score_rank'] = df_temp['value_score'].rank(ascending=False, method='min')
    df['last_5_years_return_rank'] = df['last_5_years_return'].rank(ascending=False, method='min')

    df['total_rank'] = (df['health_score_rank'] + df['value_score_rank'] +  df['last_5_years_return_rank']).rank(method='min')

    return df
    
def get_stock_data(ticker):
    try:
        print("Getting info for ticker "+ticker)
        stock = yf.Ticker(ticker)
        hist_5y, hist_1y, hist_alltime = get_historical_data(stock)
        last_5_years_return = calculate_last_5_years_return(hist_5y)

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

def publish_to_google_sheet(df, spreadsheet_name, sheet_name):
    # Authenticate with Pygsheets
    gc = pygsheets.authorize()

    # Open the spreadsheet and select the sheet
    sh = gc.open(spreadsheet_name)
    wks = sh.worksheet_by_title(sheet_name)

    # Update the sheet with the DataFrame
    df.fillna(0, inplace=True)
    wks.set_dataframe(df, 'A1')

def main():
    get_sp500_tickers_wikipedia('sp500.json')

    with open('stocks.json') as f:
        stocks = json.load(f)
  
    data = {}
    for stock in stocks:
        ticker = stock['ticker']
        stock_data = get_stock_data(ticker)
        if stock_data:
            sector = stock_data['sector']
            if sector not in data:
                data[sector] = []
            data[sector].append(stock_data)

    sector_dataframes ={}
    for sector, stocks_data in data.items():
        df = pd.DataFrame(stocks_data)
        df = calculate_score(df)
        sector_dataframes[sector] = df
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


def parse_arguments():
    parser = argparse.ArgumentParser(description='Analyzes stocks according to fundamental metrics.')
    parser.add_argument('-p', '--profile', action='store_true', help='Enable profiling')
    return parser.parse_args()

#TODO: Add publish to database
if __name__ == "__main__":
    args = parse_arguments()
    if args.profile:
        cProfile.run('main()', sort='cumulative')
    else:
        main()

