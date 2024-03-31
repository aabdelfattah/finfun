
import cProfile
import argparse
from stocks_data_fetcher import StocksDataFetcher
from stocks_analyzer import StocksAnalyzer
from results_publisher import ResultsPublisher
from database_manager import DatabaseManager


def parse_arguments():
    parser = argparse.ArgumentParser(description='Analyzes stocks according to fundamental metrics.')
    parser.add_argument('-p', '--profile', action='store_true', help='Enable profiling')
    parser.add_argument('-r', '--rank', type=int, required=True, help='Get top-ranked stocks up to specified rank')

    return parser.parse_args()

#TODO: Add publish to database
#TODO: Add integration to langchain
if __name__ == "__main__":
    args = parse_arguments()
    fetcher = StocksDataFetcher()
    stocks_dict_by_sector = fetcher.stocks_dict_by_sector
    analyzer = StocksAnalyzer()
    if args.profile:
        import cProfile
        cProfile.run('analyzer.analyze_stocks(stocks_dict_by_sector, args.rank)', sort='cumulative')
    else:
        top_ranked_stocks = analyzer.analyze_stocks(stocks_dict_by_sector, args.rank)
        ResultsPublisher.publish_results(top_ranked_stocks, output_format='excel', spreadsheet_name='top_ranked_stocks')        


         # Define your database connection string
        db_connection_string = 'sqlite:///finfun.db'
        # Initialize DatabaseManager
        db_manager = DatabaseManager(db_connection_string)
        # Publish results to SQL database
        ResultsPublisher.publish_results(top_ranked_stocks, output_format='sql', db_manager=db_manager, table_name='top_ranked_stocks')        
    