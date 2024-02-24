import yfinance as yf
import pandas as pd
import json
import pygsheets


#TODO: Get sector PE and compare PE relative to Sector PE
def get_stock_data(ticker):
    try:
        stock = yf.Ticker(ticker)
        hist_5y = stock.history(period="5y")
        hist_1y = stock.history(period="1y")
        hist_alltime = stock.history(period="max")

        last_5_years_return = (hist_5y.iloc[-1]['Close'] - hist_5y.iloc[0]['Close']) / hist_5y.iloc[0]['Close']

        return {
            'symbol': ticker,
            'price': stock.info.get('currentPrice', None),
            '52_high': hist_1y['Close'].max(),
            'all_time_high': hist_alltime['High'].max(),
            'pe': stock.info.get('forwardPE', None),
            'peg': stock.info.get('pegRatio', None),
            'market_cap': stock.info.get('marketCap', None),
            'dividend_yield': stock.info.get('dividendYield', None),
            'last_5_years_return': last_5_years_return
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
    with open('stocks.json') as f:
        stocks = json.load(f)

    data = []
    for stock in stocks:
        ticker = stock['ticker']
        stock_data = get_stock_data(ticker)
        if stock_data:
            data.append(stock_data)

    df = pd.DataFrame(data)
    print(df)
    
    # Publish DataFrame to Google Sheet
    spreadsheet_name = 'FinFun'
    sheet_name = 'Data'
    publish_to_google_sheet(df, spreadsheet_name, sheet_name)

    # Publish DataFrame to excel
    excel_file_path = 'FinFun.xlsx'  # Path to save the Excel file
    df.to_excel(excel_file_path, index=False)

#TODO: Add publish to database

if __name__ == "__main__":
    main()
