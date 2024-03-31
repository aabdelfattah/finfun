import pandas as pd
import pygsheets

class ResultsPublisher:
    @staticmethod
    def publish_results(df, output_format='excel', spreadsheet_name='', sheet_name='Data', db_manager=None, table_name=''):
        if output_format == 'excel':
            ResultsPublisher.publish_to_excel(df, spreadsheet_name)
        elif output_format == 'google_sheets':
            ResultsPublisher.publish_to_google_sheet(df, spreadsheet_name, sheet_name)
        elif output_format == 'sql':
            if db_manager is None or table_name == '':
                raise ValueError("For SQL output format, provide db_manager and table_name.")
            ResultsPublisher.publish_to_sql(df, db_manager, table_name)
        else:
            raise ValueError("Invalid output format. Choose either 'excel', 'google_sheets', or 'sql'.")

    @staticmethod
    def publish_to_excel(df, spreadsheet_name):
        excel_file_path = 'FinFun.xlsx'
        df.to_excel(excel_file_path, index=False)

        excel_file_path = spreadsheet_name+'.xlsx'
        df.to_excel(excel_file_path, index=False)

    @staticmethod
    def publish_to_sql(df, db_manager, table_name):
        # Create or update table based on DataFrame structure
        db_manager.create_or_update_table(table_name, df)
        
        # Insert data into the table
        db_manager.insert_data(table_name, df)

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