import pandas as pd
import pygsheets

class ResultsPublisher:
    @staticmethod
    def publish_results(df, output_format='excel', spreadsheet_name='TopRankedStocks', sheet_name='Data'):
        if output_format == 'excel':
            ResultsPublisher.publish_to_excel(df, spreadsheet_name)
        elif output_format == 'google_sheets':
            ResultsPublisher.publish_to_google_sheet(df, spreadsheet_name, sheet_name)
        else:
            raise ValueError("Invalid output format. Choose either 'excel' or 'google_sheets'.")

    @staticmethod
    def publish_to_excel(df, spreadsheet_name):
        excel_file_path = spreadsheet_name+'.xlsx'
        df.to_excel(excel_file_path, index=False)

    @staticmethod
    def publish_to_google_sheet(df, spreadsheet_name, sheet_name):
        # Authenticate with Pygsheets
        gc = pygsheets.authorize()

        # Open the spreadsheet and select the sheet
        sh = gc.open(spreadsheet_name)
        wks = sh.worksheet_by_title(sheet_name)

        # Update the sheet with the DataFrame
        df.fillna(0, inplace=True)
        wks.set_dataframe(df, 'A1')