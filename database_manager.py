import pandas as pd
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, Float, String

class DatabaseManager:
    def __init__(self, db_connection_string):
        self.engine = create_engine(db_connection_string)
        self.metadata = MetaData(bind=self.engine)
    
    def create_or_update_table(self, table_name, df):
        # Check if the table exists
        if not self.engine.has_table(table_name):
            # Create the table if it doesn't exist
            self.create_table(table_name, df)
        else:
            # Reflect the existing table
            table = Table(table_name, self.metadata, autoload=True, autoload_with=self.engine, extend_existing=True)
            # Update the table if necessary
            self.update_table(table, df)
    
    def create_table(self, table_name, df):
        columns = [Column(column_name, self.get_sqlalchemy_type(df.dtypes[column_name])) for column_name in df.columns]
        table = Table(table_name, self.metadata, *columns)
        table.create(self.engine)
        return table
    
    def update_table(self, table, df):
        # Check if table columns match DataFrame columns
        existing_columns = set(column.name for column in table.columns)
        new_columns = set(df.columns)
        columns_to_add = new_columns - existing_columns
        if columns_to_add:
            for column_name in columns_to_add:
                column = Column(column_name, self.get_sqlalchemy_type(df.dtypes[column_name]))
                column.create(table)

    def get_sqlalchemy_type(self, pandas_dtype):
        if pandas_dtype == 'int64':
            return Integer
        elif pandas_dtype == 'float64':
            return Float
        else:
            return String
