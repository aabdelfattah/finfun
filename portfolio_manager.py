import pandas as pd
from sqlalchemy import create_engine, Column, String, Float, DateTime, PrimaryKeyConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os

Base = declarative_base()

class Portfolio(Base):
    __tablename__ = 'portfolios'
    
    id = Column(String, nullable=False)
    stock_symbol = Column(String, nullable=False)
    allocation_percentage = Column(Float, nullable=False)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    # Create a composite primary key using id and stock_symbol
    __table_args__ = (
        PrimaryKeyConstraint('id', 'stock_symbol'),
    )

class PortfolioManager:
    def __init__(self, db_url='sqlite:///portfolio.db'):
        self.engine = create_engine(db_url)
        # Create tables if they don't exist
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

    @staticmethod
    def create_sample_portfolios():
        """Create sample portfolio files for testing"""
        # Create samples directory if it doesn't exist
        os.makedirs('sample_portfolios', exist_ok=True)
        
        # Tech-focused portfolio
        tech_portfolio = pd.DataFrame({
            'stock_symbol': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'AMD'],
            'allocation_percentage': [25, 25, 20, 15, 15]
        })
        tech_portfolio.to_csv('sample_portfolios/tech_portfolio.csv', index=False)
        
        # Dividend portfolio
        dividend_portfolio = pd.DataFrame({
            'stock_symbol': ['JNJ', 'PG', 'KO', 'VZ', 'MCD'],
            'allocation_percentage': [25, 20, 20, 20, 15]
        })
        dividend_portfolio.to_csv('sample_portfolios/dividend_portfolio.csv', index=False)
        
        # Diversified portfolio
        diversified_portfolio = pd.DataFrame({
            'stock_symbol': ['AAPL', 'JNJ', 'JPM', 'XOM', 'HD', 'DIS', 'PG', 'COST', 'NEE', 'V'],
            'allocation_percentage': [12, 11, 10, 10, 10, 10, 10, 9, 9, 9]
        })
        diversified_portfolio.to_csv('sample_portfolios/diversified_portfolio.csv', index=False)
        
        print("Sample portfolios created in 'sample_portfolios' directory:")
        print("1. tech_portfolio.csv - Technology focused portfolio")
        print("2. dividend_portfolio.csv - Dividend focused portfolio")
        print("3. diversified_portfolio.csv - Diversified portfolio across sectors")

    def import_portfolio(self, file_path):
        """Import portfolio from CSV or txt file"""
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            # Assume tab or space-delimited text file
            df = pd.read_csv(file_path, delimiter=r'\s+')
        
        # Validate the dataframe has required columns
        required_columns = {'stock_symbol', 'allocation_percentage'}
        if not all(col in df.columns for col in required_columns):
            raise ValueError(f"Input file must contain columns: {required_columns}")
        
        # Validate allocations sum to 100%
        total_allocation = df['allocation_percentage'].sum()
        if not (99.5 <= total_allocation <= 100.5):  # Allow for small rounding errors
            raise ValueError(f"Portfolio allocations must sum to 100%. Current sum: {total_allocation}")

        # Clear existing portfolio
        self.session.query(Portfolio).delete()
        
        # Add new portfolio entries
        portfolio_id = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        for _, row in df.iterrows():
            portfolio_entry = Portfolio(
                id=portfolio_id,
                stock_symbol=row['stock_symbol'],
                allocation_percentage=row['allocation_percentage']
            )
            self.session.add(portfolio_entry)
        
        self.session.commit()
        return portfolio_id

    def get_current_portfolio(self):
        """Retrieve the current portfolio"""
        latest_portfolio = (
            self.session.query(Portfolio)
            .order_by(Portfolio.last_updated.desc())
            .all()
        )
        return latest_portfolio

    def get_portfolio_symbols(self):
        """Get list of stock symbols in the portfolio"""
        portfolio = self.get_current_portfolio()
        return [entry.stock_symbol for entry in portfolio] 