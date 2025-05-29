# 🤖 FinFun - AI-Powered Portfolio Management System

An advanced financial portfolio management platform that combines traditional financial analysis with cutting-edge AI insights powered by FinRobot and Azure OpenAI.

## 🎯 Overview

FinFun is a comprehensive portfolio management solution that provides:
- **Traditional Financial Analysis** - P/E ratios, dividend yields, health scores
- **AI-Powered Insights** - Real-time stock analysis using FinRobot and GPT-4
- **24-Hour Caching** - Intelligent caching to optimize API costs
- **Modern Architecture** - TypeScript, React, Node.js with clean separation

## 🏗️ Architecture

```
FinFun System
├── Frontend (React/TypeScript) - Port 5173
│   ├── Portfolio Management UI
│   ├── Enhanced Analysis Dashboard
│   └── AI Insights Integration
│
├── Backend (Node.js/TypeScript) - Port 3000
│   ├── Portfolio & Stock APIs
│   ├── Traditional Analysis Engine
│   ├── AI Analysis Orchestration
│   └── SQLite Database (TypeORM)
│
└── FinRobot AI API (Python/FastAPI) - Port 8000
    ├── AutoGen Multi-Agent System
    ├── Azure OpenAI Integration
    ├── Financial Data Processing
    └── Real-time Market Analysis
```

## ✨ Features

### 📊 Traditional Analysis
- **Health Score**: Based on profit margins, debt ratios, market cap
- **Value Score**: P/E ratios, discount from 52-week highs
- **Sector Normalization**: Compare stocks within their sectors
- **Risk Assessment**: Debt-to-equity, liquidity ratios

### 🤖 AI-Powered Analysis
- **Three Analysis Types**:
  - **Quick** (30s): Basic market overview and sentiment
  - **Standard** (90s): Comprehensive analysis with predictions
  - **Deep** (3min): Detailed research with technical indicators
- **Real-time Market Data**: Latest news, earnings, market sentiment
- **Price Predictions**: Next week outlook with confidence levels
- **Risk Assessment**: AI-driven risk factor analysis

### 🔧 Technical Features
- **24-Hour Caching**: Prevents redundant AI API calls
- **Sequential Processing**: Avoids AutoGen conversation conflicts
- **Error Resilience**: Individual stock failures don't block analysis
- **Real-time Updates**: Live status indicators and progress tracking

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16+)
- **Python** (3.11+)
- **Azure OpenAI API** access
- **FinnHub API** key (free tier available)

### 1. Clone & Setup
```bash
git clone https://github.com/aabdelfattah/finfun.git
cd finfun
```

### 2. Backend Setup
```bash
cd finfun-ts/backend
npm install
npm run dev  # Starts on port 3000
```

### 3. Frontend Setup
```bash
cd finfun-ts/frontend
npm install
npm run dev  # Starts on port 5173
```

### 4. FinRobot AI Setup
```bash
# Create Python virtual environment
python3.11 -m venv venv_finrobot
source venv_finrobot/bin/activate

# Install FinRobot and dependencies
cd finrobot-api
pip install -r finrobot_requirements.txt

# Configure API keys (see Configuration section)
# Edit OAI_CONFIG_LIST and config_api_keys

# Start FinRobot API
python -m uvicorn finrobot_market_api:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Access the Application
Open your browser and navigate to: **http://localhost:5173**

## ⚙️ Configuration

### API Keys Setup

Create the following files in `finrobot-api/`:

**`OAI_CONFIG_LIST`**:
```json
[
    {
        "model": "gpt-4",
        "api_key": "your-azure-openai-api-key",
        "base_url": "https://your-resource.openai.azure.com/",
        "api_type": "azure",
        "api_version": "2024-02-15-preview"
    }
]
```

**`config_api_keys`**:
```
FINNHUB_API_KEY=your-finnhub-api-key
```

> ⚠️ **Security Note**: These files are automatically ignored by git. Never commit API keys to version control.

### Environment Variables

**Backend** (optional `.env` in `finfun-ts/backend/`):
```env
PORT=3000
NODE_ENV=development
DATABASE_PATH=./finfun.db
```

## 📱 Usage Guide

### 1. Portfolio Management
- **Upload CSV**: Symbol, allocation percentage format
- **View Holdings**: Real-time portfolio breakdown
- **Track Performance**: Historical analysis data

### 2. Traditional Analysis
- Click **"Analyze Portfolio"** for traditional metrics
- View health scores, value scores, recommendations
- Export analysis results

### 3. AI Analysis
- Select analysis type: **Quick**, **Standard**, or **Deep**
- Click **"Run AI Analysis"** to get AI insights
- View combined traditional + AI analysis
- Results cached for 24 hours

### 4. Enhanced Dashboard
- **Combined View**: Traditional metrics + AI insights side-by-side
- **Status Indicators**: Cache status, analysis freshness
- **Interactive Charts**: Portfolio breakdown and scores
- **Detailed Reports**: Expandable analysis sections

## 📄 CSV Portfolio Format

```csv
symbol,allocation
AAPL,25.0
MSFT,20.0
GOOGL,15.0
AMZN,10.0
TSLA,10.0
NVDA,10.0
META,10.0
```

## 🔧 Development

### Backend Development
```bash
cd finfun-ts/backend
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
```

### Frontend Development
```bash
cd finfun-ts/frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

### Database Management
The system uses SQLite with TypeORM. Database migrations run automatically on startup.

To clear AI analysis cache for testing:
```bash
cd finfun-ts/backend
sqlite3 finfun.db "DELETE FROM ai_stock_analysis;"
```

## 🛠️ API Documentation

### Backend API Endpoints

#### Portfolio Management
- `GET /api/portfolios` - Get user portfolios
- `POST /api/portfolios` - Create/update portfolio
- `POST /api/portfolios/upload` - Upload CSV portfolio

#### Traditional Analysis
- `GET /api/analysis` - Get cached analysis
- `POST /api/analysis/analyze` - Run traditional analysis

#### AI Analysis
- `GET /api/analysis/ai` - Get AI analysis cache status
- `POST /api/analysis/ai/analyze` - Run AI analysis
- `GET /api/analysis/ai/stock/:symbol` - Individual stock AI analysis
- `GET /api/analysis/enhanced` - Combined traditional + AI analysis

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### FinRobot API Endpoints
- `GET /health` - Health check
- `GET /analyze/{symbol}?analysis_type=quick|standard|deep` - Stock analysis

## 🔒 Security & Privacy

- **API Keys**: Stored locally, ignored by git
- **Authentication**: JWT-based user sessions
- **Rate Limiting**: Built-in protection against API abuse
- **Data Privacy**: No sensitive data stored in database
- **HTTPS Ready**: Production deployment supports SSL

## 🚀 Deployment

### Production Build
```bash
# Backend
cd finfun-ts/backend
npm run build
npm start

# Frontend
cd finfun-ts/frontend
npm run build
# Serve dist/ with your preferred static server

# FinRobot API
cd finrobot-api
python -m uvicorn finrobot_market_api:app --host 0.0.0.0 --port 8000
```

### Docker Support
Coming soon - Dockerized deployment for easy production setup.

## 🧪 Testing

```bash
# Backend tests
cd finfun-ts/backend
npm test

# Frontend tests
cd finfun-ts/frontend
npm test

# Integration tests
node test_backend_integration.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📋 Roadmap

### TODO: Model Improvements

#### 1. Scoring Methodology
- [ ] Replace z-scores with percentile ranking for more intuitive scoring
- [ ] Implement equal weights (20% each) for all metrics
- [ ] Replace Debt/Equity with Debt/EBITDA for better leverage assessment

#### 2. Performance Monitoring
- [ ] Add historical performance tracking
- [ ] Implement backtesting for 3-6 month returns
- [ ] Compare performance between "Buy" and "Hold" rated stocks
- [ ] Refine recommendation thresholds based on historical data

#### 3. Sector Analysis
- [ ] Add sector-specific metric weighting
- [ ] Implement two-step classification:
  1. Rank within sectors
  2. Compare absolute fundamentals across sectors
- [ ] Add sector concentration monitoring
- [ ] Implement sector-specific metrics (e.g., growth metrics for tech)

#### 4. Economic Moat Analysis
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

#### 5. Management Quality Assessment
- [ ] Implement Capital Allocation Score
  - Share buyback analysis
  - Acquisition ROIC tracking
- [ ] Track Insider Ownership
  - Target: >5% equity
  - Source: SEC Form 4
- [ ] Analyze Compensation Structure
  - ROIC/FCF-based incentives
  - Source: Proxy statements

#### 6. Technical Infrastructure
- [ ] Docker containerization
- [ ] Real-time WebSocket updates
- [ ] Machine learning prediction models
- [ ] Mobile app (React Native)
- [ ] Multi-currency support
- [ ] Advanced charting and visualization

## ❓ Troubleshooting

### Common Issues

**"Database is locked" error**:
```bash
# Stop all services and restart backend
cd finfun-ts/backend
npm run dev
```

**AI Analysis not working**:
1. Check API keys in `finrobot-api/` directory
2. Verify FinRobot API is running on port 8000
3. Check backend logs for connection errors

**Frontend not loading**:
1. Ensure backend is running on port 3000
2. Check CORS configuration
3. Verify API endpoints are accessible

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/aabdelfattah/finfun/issues)
- **Documentation**: [Wiki](https://github.com/aabdelfattah/finfun/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/aabdelfattah/finfun/discussions)

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FinRobot**: AI-powered financial analysis platform
- **AutoGen**: Multi-agent conversation framework
- **Azure OpenAI**: GPT-4 language model
- **Yahoo Finance**: Financial data provider
- **FinnHub**: Real-time market data

---

**Made with ❤️ and 🤖 AI** | **FinFun v2.0** | **Built for the future of finance**