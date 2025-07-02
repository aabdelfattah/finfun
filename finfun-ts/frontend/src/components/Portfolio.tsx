import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    TextField,
    Autocomplete,
    Chip,
    Alert,
    IconButton,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { 
    Add as AddIcon, 
    Delete as DeleteIcon,
    Upload as UploadIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { api } from '../services/api';
import { Portfolio as PortfolioType, TickerData } from '../types';
import { debounce } from 'lodash';

export const Portfolio: React.FC = () => {
    const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tickerSuggestions, setTickerSuggestions] = useState<TickerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedTicker, setSelectedTicker] = useState<TickerData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCsvUpload, setShowCsvUpload] = useState(false);

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            const data = await api.getPortfolio();
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            setError('Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            if (!query || query.length < 1) {
                setTickerSuggestions([]);
                return;
            }

            try {
                setSearchLoading(true);
                const response = await api.searchTickers(query, 10);
                setTickerSuggestions(response.tickers);
            } catch (error) {
                console.error('Failed to search tickers:', error);
                setTickerSuggestions([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300),
        []
    );

    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    const handleAddTicker = async (ticker: TickerData) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            await api.addTickerToPortfolio(ticker.symbol);
            setSuccess(`Successfully added ${ticker.symbol} to your portfolio!`);
            
            // Reload portfolio to show the new stock
            await loadPortfolio();
            
            // Clear search
            setSearchQuery('');
            setSelectedTicker(null);
            setTickerSuggestions([]);
        } catch (error: any) {
            console.error('Failed to add ticker:', error);
            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else {
                setError('Failed to add ticker to portfolio');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStock = async (stockId: number) => {
        try {
            setLoading(true);
            await api.removeFromPortfolio(stockId);
            await loadPortfolio();
            setSuccess('Stock removed from portfolio');
        } catch (error) {
            console.error('Failed to remove stock:', error);
            setError('Failed to remove stock from portfolio');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            await api.uploadPortfolio(file);
            await loadPortfolio();
            setShowCsvUpload(false);
            setSuccess('Portfolio uploaded successfully!');
        } catch (error) {
            console.error('Failed to upload portfolio:', error);
            setError('Failed to upload portfolio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                    {portfolio?.name || 'Portfolio'}
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => setShowCsvUpload(true)}
                    size="small"
                >
                    Upload CSV
                </Button>
            </Box>

            {/* Error/Success Messages */}
            {error && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 2 }} 
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}
            {success && (
                <Alert 
                    severity="success" 
                    sx={{ mb: 2 }} 
                    onClose={() => setSuccess(null)}
                >
                    {success}
                </Alert>
            )}

            {/* Ticker Search Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <SearchIcon sx={{ mr: 1 }} />
                    Add Stocks to Portfolio
                </Typography>
                
                <Autocomplete
                    options={tickerSuggestions}
                    getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
                    value={selectedTicker}
                    onChange={(_, newValue) => {
                        if (newValue) {
                            handleAddTicker(newValue);
                        }
                    }}
                    inputValue={searchQuery}
                    onInputChange={(_, newInputValue) => {
                        setSearchQuery(newInputValue);
                    }}
                    loading={searchLoading}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Search for stocks (e.g., AAPL, Apple, Microsoft...)"
                            variant="outlined"
                            fullWidth
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    {option.symbol}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {option.name}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {option.etf && (
                                    <Chip label="ETF" size="small" color="primary" />
                                )}
                                <Chip 
                                    label={option.marketCategory} 
                                    size="small" 
                                    variant="outlined" 
                                />
                            </Box>
                        </Box>
                    )}
                    noOptionsText={searchQuery.length > 0 ? "No matching tickers found" : "Start typing to search..."}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Search by ticker symbol (e.g., AAPL) or company name (e.g., Apple). Click on a result to add it to your portfolio.
                </Typography>
            </Paper>

            {/* Portfolio Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell align="right">Allocation (%)</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : portfolio?.stocks?.length ? (
                            portfolio.stocks.map((stock) => (
                                <TableRow key={stock.id}>
                                    <TableCell>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                            {stock.stockSymbol}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {stock.allocationPercentage.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleRemoveStock(stock.id)}
                                            disabled={loading}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <Box sx={{ py: 4 }}>
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No stocks in portfolio
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Use the search box above to add stocks to your portfolio
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* CSV Upload Dialog */}
            <Dialog open={showCsvUpload} onClose={() => setShowCsvUpload(false)}>
                <DialogTitle>Upload Portfolio CSV</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Upload a CSV file with columns: symbol, allocation
                    </Typography>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        style={{ width: '100%' }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCsvUpload(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 