# FinFun
A web application for portfolio analysis and stock recommendations based on fundamental metrics. The app can:
- Analyze your custom stock portfolio
- Provide daily analysis and recommendations
- Track fundamental metrics and historical performance
- Generate Excel reports for detailed analysis

## Requirements
- Python 3.6 or higher
- Internet connection for fetching real-time stock data
- Modern web browser

## Setup

1. Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Unix/macOS
# or
.\venv\Scripts\activate  # On Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Running the Web Application

1. Start the web application:
```bash
python app.py
```

2. Open your browser and navigate to http://localhost:5000

3. Use the web interface to:
   - View your current portfolio
   - Upload a new portfolio
   - See daily analysis and recommendations

### Sample Portfolios

The application comes with sample portfolios for testing. To create them:

```bash
python3 -c "from portfolio_manager import PortfolioManager; PortfolioManager.create_sample_portfolios()"
```

This will create three sample portfolios in the `sample_portfolios` directory:

1. `tech_portfolio.csv`: Technology-focused portfolio
   - AAPL (Apple) - 25%
   - MSFT (Microsoft) - 25%
   - GOOGL (Google) - 20%
   - NVDA (NVIDIA) - 15%
   - AMD (Advanced Micro Devices) - 15%

2. `dividend_portfolio.csv`: Dividend-focused portfolio
   - JNJ (Johnson & Johnson) - 25%
   - PG (Procter & Gamble) - 20%
   - KO (Coca-Cola) - 20%
   - VZ (Verizon) - 20%
   - MCD (McDonald's) - 15%

3. `diversified_portfolio.csv`: Multi-sector portfolio
   - AAPL (Apple) - 12%
   - JNJ (Johnson & Johnson) - 11%
   - JPM (JPMorgan Chase) - 10%
   - XOM (Exxon Mobil) - 10%
   - HD (Home Depot) - 10%
   - DIS (Disney) - 10%
   - PG (Procter & Gamble) - 10%
   - COST (Costco) - 9%
   - NEE (NextEra Energy) - 9%
   - V (Visa) - 9%

### Creating Your Own Portfolio

Create a CSV file with the following format:
```csv
stock_symbol,allocation_percentage
AAPL,25
MSFT,25
GOOGL,20
NVDA,15
AMD,15
```

Requirements:
- Must include columns: `stock_symbol` and `allocation_percentage`
- Allocation percentages must sum to 100%

### Command Line Usage (Legacy)

The original command-line interface is still available:

```bash
python finfun.py -r n
```
where `n` is the number of top-ranked stocks to show per sector.

## Features

- Portfolio Management
  - Import portfolios from CSV files
  - Store portfolio data in SQLite database
  - Track allocation percentages

- Stock Analysis
  - Daily automated analysis
  - Fundamental metrics tracking
  - Historical performance analysis
  - Sector-based comparisons

- Reporting
  - Web-based dashboard
  - Excel report generation
  - Stock recommendations
  - Performance metrics

## Optional: Google Sheets Integration

To enable Google Sheets export:

1. Follow this [tutorial](https://pygsheets.readthedocs.io/en/latest/authorization.html) to get OAuth credentials
2. Save the credentials file as `client_secret.json` in the project directory
3. Create a sheet named `FinFun` in your Google account