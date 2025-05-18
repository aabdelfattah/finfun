from flask import Flask, render_template, request, flash, redirect, url_for
from apscheduler.schedulers.background import BackgroundScheduler
from portfolio_manager import PortfolioManager
from stocks_analyzer import StocksAnalyzer
from stocks_data_fetcher import StocksDataFetcher
import os
import datetime
import pandas as pd
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.urandom(24)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'csv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

portfolio_manager = PortfolioManager()
stocks_analyzer = StocksAnalyzer()
stocks_fetcher = StocksDataFetcher(fetch_sp500=False)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_portfolio(force_update=False):
    """Analyze portfolio stocks with option to force update"""
    portfolio_symbols = portfolio_manager.get_portfolio_symbols()
    if not portfolio_symbols:
        return None
    
    # Fetch and analyze data for portfolio stocks
    stocks_data = stocks_fetcher.fetch_stocks_data(portfolio_symbols)
    if not stocks_data:
        return None
        
    analysis_results = stocks_analyzer.analyze_stocks({'Portfolio': stocks_data})
    return analysis_results

# Schedule daily analysis
scheduler = BackgroundScheduler()
scheduler.add_job(func=lambda: analyze_portfolio(force_update=True), trigger="cron", hour=0)  # Run at midnight
scheduler.start()

@app.route('/')
def index():
    portfolio = portfolio_manager.get_current_portfolio()
    analysis = analyze_portfolio()
    return render_template('index.html', portfolio=portfolio, analysis=analysis)

@app.route('/analyze_now')
def analyze_now():
    """Force immediate analysis of the portfolio"""
    analysis = analyze_portfolio(force_update=True)
    if analysis is not None:
        flash('Portfolio analysis completed successfully', 'success')
    else:
        flash('No portfolio data available for analysis', 'warning')
    return redirect(url_for('index'))

@app.route('/upload_portfolio', methods=['GET', 'POST'])
def upload_portfolio():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['file']
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            try:
                portfolio_manager.import_portfolio(filepath)
                flash('Portfolio successfully uploaded and imported')
                os.remove(filepath)  # Clean up the uploaded file
                return redirect(url_for('index'))
            except Exception as e:
                flash(f'Error importing portfolio: {str(e)}')
                return redirect(request.url)
    return render_template('upload.html')

if __name__ == '__main__':
    app.run(debug=True) 