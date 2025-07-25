import React, { useEffect, useState } from 'react';
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
    LinearProgress,
    Collapse,
    IconButton,
    Tooltip,
    Alert,
    Stack,
} from '@mui/material';
import { Refresh as RefreshIcon, KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { StockAnalysis } from '../types';
interface AnalysisResponse {
    analyses: StockAnalysis[];
    analyzedAt: string | null;
    isFresh: boolean;
    needsAnalysis?: boolean;
    message?: string;
}

interface SectorMetrics {
    mean: number;
    stdev: number;
}

interface SectorData {
    name: string;
    metrics: {
        dividendYield: SectorMetrics;
        profitMargins: SectorMetrics;
        debtToEquity: SectorMetrics;
        pe: SectorMetrics;
        discountFrom52W: SectorMetrics;
    };
}

interface SectorAnalysisResponse {
    data: SectorData[];
    lastUpdated: string;
}

interface RowProps {
    analysis: StockAnalysis;
    sectorMetrics: SectorData[];
}

const Row: React.FC<RowProps> = ({ analysis, sectorMetrics }) => {
    const [open, setOpen] = useState(false);
    const sectorData = sectorMetrics.find(m => m.name === analysis.sector);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'success.main';
        if (score >= 60) return 'info.main';
        if (score >= 40) return 'warning.main';
        return 'error.main';
    };

    const getScoreTooltip = (score: number, type: 'health' | 'value' | 'total') => {
        const peScore = analysis.pe ? Math.max(0, 100 - (analysis.pe / (sectorData?.metrics.pe.mean || 1)) * 50) : 0;
        const dividendScore = analysis.dividendYield ? Math.min(100, (analysis.dividendYield / (sectorData?.metrics.dividendYield.mean || 0.01)) * 50) : 0;
        const profitScore = analysis.profitMargins ? Math.min(100, (analysis.profitMargins / (sectorData?.metrics.profitMargins.mean || 0.01)) * 50) : 0;
        const debtToEquityScore = analysis.debtToEquity ? Math.max(0, 100 - (analysis.debtToEquity / (sectorData?.metrics.debtToEquity.mean || 1)) * 50) : 0;
        const discountScore = analysis.discountAllTimeHigh ? Math.max(0, 100 - (analysis.discountAllTimeHigh / (sectorData?.metrics.discountFrom52W.mean || 0.5)) * 50) : 0;

        switch (type) {
            case 'health':
                return `Health Score (${score.toFixed(0)})
- Dividend Yield: ${dividendScore.toFixed(0)}
- Profit Margins: ${profitScore.toFixed(0)}
- Debt/Equity: ${debtToEquityScore.toFixed(0)}`;
            case 'value':
                return `Value Score (${score.toFixed(0)})
- P/E Ratio: ${peScore.toFixed(0)}
- Discount from 52W High: ${discountScore.toFixed(0)}`;
            case 'total':
                return `Total Score (${score.toFixed(0)})
- Health Score: ${analysis.healthScore.toFixed(0)}
- Value Score: ${analysis.valueScore.toFixed(0)}`;
        }
    };

    const getMetricColor = (value: number | null, mean: number, stdev: number, lowerIsBetter: boolean) => {
        if (value === null) return 'text.secondary';
        if (lowerIsBetter) {
            if (value < mean - stdev) return 'success.main';
            if (value > mean + stdev) return 'error.main';
        } else {
            if (value > mean + stdev) return 'success.main';
            if (value < mean - stdev) return 'error.main';
        }
        return 'warning.main';
    };

    const MetricBar = ({ value, mean, stdev, formatValue, lowerIsBetter }: { 
        value: number | null, 
        mean: number, 
        stdev: number,
        formatValue: (v: number) => string,
        lowerIsBetter: boolean
    }) => {
        if (value === null) return <Typography color="text.secondary">N/A</Typography>;

        // Calculate the percentage position of the value relative to mean ± 2 standard deviations
        const min = mean - 2 * stdev;
        const max = mean + 2 * stdev;
        const range = max - min;
        const valuePosition = ((value - min) / range) * 100;
        const meanPosition = ((mean - min) / range) * 100;

        return (
            <Box sx={{ width: '100%' }}>
                <Box sx={{ 
                    position: 'relative',
                    height: 16,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    overflow: 'hidden',
                    maxWidth: 300,
                    mx: 'auto'
                }}>
                    {/* Mean marker */}
                    <Box sx={{ 
                        position: 'absolute',
                        left: `${meanPosition}%`,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        bgcolor: 'grey.500',
                        zIndex: 1
                    }} />

                    {/* Value bar */}
                    <Box sx={{ 
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${valuePosition}%`,
                        bgcolor: getMetricColor(value, mean, stdev, lowerIsBetter),
                        opacity: 0.7,
                        transition: 'width 0.3s ease'
                    }} />

                    {/* Value marker */}
                    <Box sx={{ 
                        position: 'absolute',
                        left: `${valuePosition}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: getMetricColor(value, mean, stdev, lowerIsBetter),
                        border: '2px solid white',
                        boxShadow: 1,
                        zIndex: 2
                    }} />
                </Box>

                {/* Sector Average Label */}
                <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    mt: 0.5,
                    fontSize: '0.75rem',
                    color: 'text.secondary'
                }}>
                    <Typography variant="caption">Sector Avg: {formatValue(mean)}</Typography>
                </Box>
            </Box>
        );
    };

    return (
        <>
            <TableRow 
                hover 
                onClick={() => setOpen(!open)}
                sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
            >
                <TableCell>
                    <IconButton size="small">
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>{analysis.stockSymbol}</TableCell>
                <TableCell>{analysis.sector}</TableCell>
                <TableCell>${analysis.price?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell>
                    <Tooltip title={getScoreTooltip(analysis.healthScore, 'health')} arrow>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={analysis.healthScore}
                                    sx={{
                                        height: 10,
                                        borderRadius: 5,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: getScoreColor(analysis.healthScore),
                                        },
                                    }}
                                />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {analysis.healthScore.toFixed(0)}
                                </Typography>
                            </Box>
                        </Box>
                    </Tooltip>
                </TableCell>
                <TableCell>
                    <Tooltip title={getScoreTooltip(analysis.valueScore, 'value')} arrow>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={analysis.valueScore}
                                    sx={{
                                        height: 10,
                                        borderRadius: 5,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: getScoreColor(analysis.valueScore),
                                        },
                                    }}
                                />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {analysis.valueScore.toFixed(0)}
                                </Typography>
                            </Box>
                        </Box>
                    </Tooltip>
                </TableCell>
                <TableCell>
                    <Tooltip title={getScoreTooltip(analysis.totalScore, 'total')} arrow>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={analysis.totalScore}
                                    sx={{
                                        height: 10,
                                        borderRadius: 5,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: getScoreColor(analysis.totalScore),
                                        },
                                    }}
                                />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {analysis.totalScore.toFixed(0)}
                                </Typography>
                            </Box>
                        </Box>
                    </Tooltip>
                </TableCell>
                <TableCell>{analysis.recommendation}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Detailed Metrics
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>P/E Ratio</TableCell>
                                        <TableCell align="right">{analysis.pe?.toFixed(2) ?? 'N/A'}</TableCell>
                                        <TableCell>
                                            <MetricBar 
                                                value={analysis.pe}
                                                mean={sectorData?.metrics.pe.mean || 0}
                                                stdev={sectorData?.metrics.pe.stdev || 0}
                                                formatValue={(v) => v.toFixed(2)}
                                                lowerIsBetter={true}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Dividend Yield</TableCell>
                                        <TableCell align="right">{analysis.dividendYield ? `${(analysis.dividendYield * 100).toFixed(2)}%` : 'N/A'}</TableCell>
                                        <TableCell>
                                            <MetricBar 
                                                value={analysis.dividendYield}
                                                mean={sectorData?.metrics.dividendYield.mean || 0}
                                                stdev={sectorData?.metrics.dividendYield.stdev || 0}
                                                formatValue={(v) => `${(v * 100).toFixed(2)}%`}
                                                lowerIsBetter={false}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Profit Margins</TableCell>
                                        <TableCell align="right">{analysis.profitMargins ? `${(analysis.profitMargins * 100).toFixed(2)}%` : 'N/A'}</TableCell>
                                        <TableCell>
                                            <MetricBar 
                                                value={analysis.profitMargins}
                                                mean={sectorData?.metrics.profitMargins.mean || 0}
                                                stdev={sectorData?.metrics.profitMargins.stdev || 0}
                                                formatValue={(v) => `${(v * 100).toFixed(2)}%`}
                                                lowerIsBetter={false}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Debt/Equity</TableCell>
                                        <TableCell align="right">{analysis.debtToEquity ? analysis.debtToEquity.toFixed(2) : 'N/A'}</TableCell>
                                        <TableCell>
                                            <MetricBar 
                                                value={analysis.debtToEquity}
                                                mean={sectorData?.metrics.debtToEquity.mean || 0}
                                                stdev={sectorData?.metrics.debtToEquity.stdev || 0}
                                                formatValue={(v) => v.toFixed(2)}
                                                lowerIsBetter={true}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Discount from 52W High</TableCell>
                                        <TableCell align="right">{analysis.discountAllTimeHigh ? `${(analysis.discountAllTimeHigh * 100).toFixed(2)}%` : 'N/A'}</TableCell>
                                        <TableCell>
                                            <MetricBar 
                                                value={analysis.discountAllTimeHigh}
                                                mean={sectorData?.metrics.discountFrom52W.mean || 0}
                                                stdev={sectorData?.metrics.discountFrom52W.stdev || 0}
                                                formatValue={(v) => `${(v * 100).toFixed(2)}%`}
                                                lowerIsBetter={true}
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

export const Analysis: React.FC = () => {
    const [analysis, setAnalysis] = useState<StockAnalysis[]>([]);
    const [sectorMetrics, setSectorMetrics] = useState<SectorData[]>([]);
    const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFresh, setIsFresh] = useState(false);

    useEffect(() => {
        loadAnalysis();
        loadSectorMetrics();
    }, []);

    const loadAnalysis = async () => {
        try {
            setError(null);
            const response = await api.getAnalysis();
            
            if (response.needsAnalysis) {
                // Automatically trigger analysis if needed
                await handleAnalyze();
            } else {
                setAnalysis(response.analyses);
                setAnalyzedAt(response.analyzedAt);
                setIsFresh(response.isFresh);
            }
        } catch (error) {
            console.error('Failed to load analysis:', error);
            setError('Failed to load analysis data');
        }
    };

    const loadSectorMetrics = async () => {
        try {
            const response = await api.getSectorAnalysis();
            setSectorMetrics(response.data);
        } catch (error) {
            console.error('Failed to load sector metrics:', error);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.performAnalysis();
            setAnalysis(response.analyses);
            setAnalyzedAt(response.analyzedAt);
            setIsFresh(response.isFresh);
        } catch (error) {
            console.error('Failed to perform analysis:', error);
            setError('Failed to perform analysis');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString();
    };

    return (
        <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4">Stock Analysis</Typography>
                    <Button
                        variant="contained"
                        onClick={handleAnalyze}
                        disabled={loading}
                        startIcon={<RefreshIcon />}
                    >
                        {loading ? 'Analyzing...' : 'Run New Analysis'}
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error">
                        {error}
                    </Alert>
                )}

                {loading && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 1 }}>
                            Running stock analysis...
                        </Alert>
                        <LinearProgress />
                    </Box>
                )}

                {!loading && !error && analysis.length === 0 && (
                    <Alert severity="info">
                        No stock analysis data available. Click "Run New Analysis" to generate the data.
                    </Alert>
                )}

                {!loading && !error && analysis.length > 0 && analyzedAt && (
                    <Alert severity={isFresh ? "success" : "warning"}>
                        {isFresh 
                            ? `Analysis completed successfully. Last analyzed: ${formatDate(analyzedAt)}`
                            : `Analysis data is more than 24 hours old. Last analyzed: ${formatDate(analyzedAt)}. Click "Run New Analysis" to refresh.`
                        }
                    </Alert>
                )}

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell />
                                <TableCell>Symbol</TableCell>
                                <TableCell>Sector</TableCell>
                                <TableCell>Price</TableCell>
                                <TableCell>Health Score</TableCell>
                                <TableCell>Value Score</TableCell>
                                <TableCell>Total Score</TableCell>
                                <TableCell>Recommendation</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {analysis.map((item) => (
                                <Row key={item.id} analysis={item} sectorMetrics={sectorMetrics} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Stack>
        </Box>
    );
}; 