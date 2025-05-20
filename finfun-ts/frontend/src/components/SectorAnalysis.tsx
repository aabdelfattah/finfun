import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    Stack,
    LinearProgress
} from '@mui/material';
import { api } from '../services/api';

interface SectorMetrics {
    mean: number;
    stdev: number;
}

interface StockData {
    symbol: string;
    dividendYield: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    pe: number | null;
    discountFrom52W: number | null;
}

interface SectorData {
    name: string;
    stocks: StockData[];
    metrics: {
        dividendYield: SectorMetrics;
        profitMargins: SectorMetrics;
        debtToEquity: SectorMetrics;
        pe: SectorMetrics;
        discountFrom52W: SectorMetrics;
    };
}

export const SectorAnalysis: React.FC = () => {
    const [sectorData, setSectorData] = useState<SectorData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [runningAnalysis, setRunningAnalysis] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');

    const fetchSectorData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getSectorAnalysis();
            setSectorData(data);
            if (data.length > 0) {
                setLastUpdated(new Date());
            }
        } catch (err: any) {
            setError('Failed to fetch sector analysis data');
            console.error(err);
            setSectorData([]);
        } finally {
            setLoading(false);
        }
    };

    const runAnalysis = async () => {
        try {
            setRunningAnalysis(true);
            setError(null);
            setProgressMessage('Starting sector analysis...');
            
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setProgressMessage(prev => {
                    if (prev.includes('Fetching stock data')) {
                        return 'Processing sector data...';
                    } else if (prev.includes('Processing sector data')) {
                        return 'Calculating metrics...';
                    } else if (prev.includes('Calculating metrics')) {
                        return 'Finalizing results...';
                    }
                    return 'Fetching stock data...';
                });
            }, 5000);

            await api.runSectorAnalysis();
            clearInterval(progressInterval);
            setProgressMessage('');
            await fetchSectorData();
        } catch (err) {
            setError('Failed to run sector analysis');
            console.error(err);
        } finally {
            setRunningAnalysis(false);
        }
    };

    useEffect(() => {
        fetchSectorData();
    }, []);

    const formatMetric = (value: number | null) => {
        if (value === null) return 'N/A';
        return value.toFixed(2);
    };

    const formatPercentage = (value: number | null) => {
        if (value === null) return 'N/A';
        return `${(value * 100).toFixed(2)}%`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h4">Sector Analysis</Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={runAnalysis}
                        disabled={runningAnalysis}
                    >
                        {runningAnalysis ? 'Running Analysis...' : 'Run New Analysis'}
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error">
                        {error}
                    </Alert>
                )}

                {runningAnalysis && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 1 }}>
                            {progressMessage}
                        </Alert>
                        <LinearProgress />
                    </Box>
                )}

                {!runningAnalysis && !error && sectorData.length === 0 && (
                    <Alert severity="info">
                        No sector analysis data available. Click "Run New Analysis" to generate the data.
                    </Alert>
                )}

                {!runningAnalysis && !error && sectorData.length > 0 && lastUpdated && (
                    <Alert severity="success">
                        Analysis completed successfully. Last updated: {formatDate(lastUpdated)}
                    </Alert>
                )}

                {sectorData.length > 0 && sectorData.map((sector) => (
                    <Card key={sector.name} sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                {sector.name}
                            </Typography>

                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Sector Metrics
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Metric</TableCell>
                                                    <TableCell align="right">Mean</TableCell>
                                                    <TableCell align="right">Std Dev</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell>Dividend Yield</TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentage(sector.metrics.dividendYield.mean)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentage(sector.metrics.dividendYield.stdev)}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Profit Margins</TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentage(sector.metrics.profitMargins.mean)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentage(sector.metrics.profitMargins.stdev)}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Debt to Equity</TableCell>
                                                    <TableCell align="right">
                                                        {formatMetric(sector.metrics.debtToEquity.mean)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatMetric(sector.metrics.debtToEquity.stdev)}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>P/E Ratio</TableCell>
                                                    <TableCell align="right">
                                                        {formatMetric(sector.metrics.pe.mean)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatMetric(sector.metrics.pe.stdev)}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Discount from 52W High</TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentage(sector.metrics.discountFrom52W.mean)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentage(sector.metrics.discountFrom52W.stdev)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Top Stocks
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Symbol</TableCell>
                                                    <TableCell align="right">Dividend Yield</TableCell>
                                                    <TableCell align="right">Profit Margins</TableCell>
                                                    <TableCell align="right">Debt/Equity</TableCell>
                                                    <TableCell align="right">P/E Ratio</TableCell>
                                                    <TableCell align="right">52W High Discount</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sector.stocks.map((stock) => (
                                                    <TableRow key={stock.symbol}>
                                                        <TableCell>{stock.symbol}</TableCell>
                                                        <TableCell align="right">{formatPercentage(stock.dividendYield)}</TableCell>
                                                        <TableCell align="right">{formatPercentage(stock.profitMargins)}</TableCell>
                                                        <TableCell align="right">{formatMetric(stock.debtToEquity)}</TableCell>
                                                        <TableCell align="right">{formatMetric(stock.pe)}</TableCell>
                                                        <TableCell align="right">{formatPercentage(stock.discountFrom52W)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                ))}
            </Stack>
        </Box>
    );
}; 