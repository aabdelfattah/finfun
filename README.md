# FinFun - Stock Portfolio Analysis Tool

FinFun is a web application that helps users analyze their stock portfolio using various financial metrics and provides recommendations based on the analysis.

## Features

- Upload portfolio data via CSV file
- View current portfolio allocation
- Analyze stocks using multiple metrics:
  - Health Score (based on profit margins, dividend yield, and market cap)
  - Value Score (based on P/E ratio and discount from all-time high)
  - Total Score and recommendations
- Modern, responsive UI built with Material-UI

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- TypeORM with SQLite
- Yahoo Finance API for stock data

### Frontend
- React with TypeScript
- Material-UI for components
- React Router for navigation
- Axios for API calls

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following content:
   ```
   PORT=3000
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:5173`
2. Upload your portfolio CSV file (format: symbol,allocation)
3. View your portfolio allocation
4. Click "Analyze" to get stock analysis and recommendations

## CSV Format

The portfolio CSV file should have the following format:
```csv
symbol,allocation
AAPL,20
MSFT,30
GOOGL,50
```

## License

MIT

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
AAPL,20
MSFT,30
GOOGL,50
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