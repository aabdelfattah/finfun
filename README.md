# FinFun

A financial analysis tool for stock portfolio optimization and sector-based normalization.

## Project Structure

```
finfun/
├── finfun-ts/              # TypeScript implementation
│   ├── backend/           # Backend server
│   └── frontend/          # Frontend application
├── legacy/                # Legacy implementations
│   └── python/           # Python implementation
│       ├── src/          # Source code
│       ├── templates/    # HTML templates
│       ├── sample_portfolios/  # Sample portfolio files
│       ├── requirements.txt    # Python dependencies
│       └── portfolio.db        # SQLite database
└── README.md
```

## TypeScript Implementation

The TypeScript implementation is the current active version of the project. It includes:

- Backend server with Express.js
- Frontend application with React
- Sector-based normalization analysis
- Excel export functionality

### Setup

1. Install dependencies:
```bash
cd finfun-ts
npm install
```

2. Run the development server:
```bash
npm run dev
```

## Legacy Python Implementation

The Python implementation is maintained for reference and historical purposes. It includes:

- Flask-based web server
- Sector-based normalization analysis
- Excel export functionality
- SQLite database for portfolio storage

### Setup

1. Create a virtual environment:
```bash
cd legacy/python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python src/server.py
```

## Features

- Sector-based stock normalization
- Portfolio analysis
- Excel export with detailed calculations
- Comparison between custom calculations and Excel formulas

## License

This project is licensed under the MIT License - see the LICENSE file for details.

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

## TODO: Model Improvements

### 1. Scoring Methodology
- [ ] Replace z-scores with percentile ranking for more intuitive scoring
- [ ] Implement equal weights (20% each) for all metrics
- [ ] Replace Debt/Equity with Debt/EBITDA for better leverage assessment

### 2. Performance Monitoring
- [ ] Add historical performance tracking
- [ ] Implement backtesting for 3-6 month returns
- [ ] Compare performance between "Buy" and "Hold" rated stocks
- [ ] Refine recommendation thresholds based on historical data

### 3. Sector Analysis
- [ ] Add sector-specific metric weighting
- [ ] Implement two-step classification:
  1. Rank within sectors
  2. Compare absolute fundamentals across sectors
- [ ] Add sector concentration monitoring
- [ ] Implement sector-specific metrics (e.g., growth metrics for tech)

### 4. Economic Moat Analysis
- [ ] Add Return on Invested Capital (ROIC) tracking
  - Target: >12% for 5+ years
  - Source: 10-K filings
- [ ] Monitor Gross Margin Stability
  - Target: <5% volatility over 10 years
  - Source: 10-K filings
- [ ] Track Market Share Growth
  - Focus on niche dominance
  - Source: Industry reports
- [ ] Evaluate Intangible Assets
  - Patent analysis
  - Brand value assessment
  - Sources: USPTO/Patentscope

### 5. Management Quality Assessment
- [ ] Implement Capital Allocation Score
  - Share buyback analysis
  - Acquisition ROIC tracking
- [ ] Track Insider Ownership
  - Target: >5% equity
  - Source: SEC Form 4
- [ ] Analyze Compensation Structure
  - ROIC/FCF-based incentives
  - Source: Proxy statements