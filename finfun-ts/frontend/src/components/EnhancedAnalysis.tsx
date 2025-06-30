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
    Chip,
    Tab,
    Tabs,
    Card,
    CardContent,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import {
    Refresh as RefreshIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    Psychology as PsychologyIcon,
    TrendingUp as TrendingUpIcon,
    Timeline as TimelineIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { StockAnalysis, AIStockAnalysis, EnhancedStockAnalysis, EnhancedAnalysisResponse } from '../types';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`analysis-tabpanel-${index}`}
            aria-labelledby={`analysis-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

interface EnhancedRowProps {
    analysis: EnhancedStockAnalysis;
    onViewAI: (symbol: string, aiAnalysis: AIStockAnalysis) => void;
}

const EnhancedRow: React.FC<EnhancedRowProps> = ({ analysis, onViewAI }) => {
    const [open, setOpen] = useState(false);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'success.main';
        if (score >= 60) return 'info.main';
        if (score >= 40) return 'warning.main';
        return 'error.main';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getAIAnalysisStatus = () => {
        if (!analysis.hasAI) {
            return <Chip label="No AI Analysis" size="small" color="default" />;
        }
        
        if (analysis.needsAIAnalysis) {
            return <Chip label="AI Analysis Stale" size="small" color="warning" />;
        }
        
        return <Chip label="AI Analysis Fresh" size="small" color="success" />;
    };

    const getFinalAnalysis = (analysisText: string): string => {
        // Split the text by "Market_Analyst (to User_Proxy):"
        const parts = analysisText.split('Market_Analyst (to User_Proxy):');
        // Get the last part (final summary)
        const finalPart = parts[parts.length - 1].trim();
        // Extract everything up to the word "terminate"
        const summaryEndIndex = finalPart.toLowerCase().indexOf('terminate');
        if (summaryEndIndex === -1) {
            return finalPart; // If no "terminate" found, return the whole part
        }
        return finalPart.substring(0, summaryEndIndex).trim();
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
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                            {analysis.symbol}
                        </Typography>
                        {getAIAnalysisStatus()}
                    </Box>
                </TableCell>
                <TableCell>
                    {analysis.traditional?.sector || 'Unknown'}
                </TableCell>
                <TableCell>
                    ${analysis.traditional?.price?.toFixed(2) ?? 'N/A'}
                </TableCell>
                <TableCell>
                    {analysis.hasTraditional ? (
                        <Tooltip title={`Health Score: ${analysis.traditional!.healthScore.toFixed(1)}`} arrow>
                            <Box>
                                <Typography variant="body2" color={getScoreColor(analysis.traditional!.healthScore)}>
                                    {analysis.traditional!.healthScore.toFixed(1)}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ) : (
                        <Typography color="text.secondary">N/A</Typography>
                    )}
                </TableCell>
                <TableCell>
                    {analysis.hasTraditional ? (
                        <Tooltip title={`Value Score: ${analysis.traditional!.valueScore.toFixed(1)}`} arrow>
                            <Box>
                                <Typography variant="body2" color={getScoreColor(analysis.traditional!.valueScore)}>
                                    {analysis.traditional!.valueScore.toFixed(1)}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ) : (
                        <Typography color="text.secondary">N/A</Typography>
                    )}
                </TableCell>
                <TableCell>
                    {analysis.hasTraditional ? (
                        <Tooltip title={`Total Score: ${analysis.traditional!.totalScore.toFixed(1)}`} arrow>
                            <Box>
                                <Typography variant="body2" color={getScoreColor(analysis.traditional!.totalScore)}>
                                    {analysis.traditional!.totalScore.toFixed(1)}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ) : (
                        <Typography color="text.secondary">N/A</Typography>
                    )}
                </TableCell>
                <TableCell>
                    {analysis.hasTraditional ? (
                        <Chip 
                            label={analysis.traditional!.recommendation} 
                            size="small" 
                            color={
                                analysis.traditional!.recommendation === 'BUY' ? 'success' :
                                analysis.traditional!.recommendation === 'HOLD' ? 'warning' : 'error'
                            }
                        />
                    ) : (
                        <Typography color="text.secondary">N/A</Typography>
                    )}
                </TableCell>
                <TableCell>
                    {analysis.hasAI ? (
                        <Button
                            startIcon={<PsychologyIcon />}
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewAI(analysis.symbol, analysis.ai!);
                            }}
                        >
                            View AI
                        </Button>
                    ) : (
                        <Typography color="text.secondary">N/A</Typography>
                    )}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Detailed Metrics for {analysis.symbol}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {analysis.hasTraditional && (
                                    <Card sx={{ minWidth: 300 }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Traditional Analysis
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                <Typography variant="body2">P/E Ratio:</Typography>
                                                <Typography variant="body2">{analysis.traditional!.pe?.toFixed(2) ?? 'N/A'}</Typography>
                                                
                                                <Typography variant="body2">Dividend Yield:</Typography>
                                                <Typography variant="body2">{analysis.traditional!.dividendYield ? `${(analysis.traditional!.dividendYield * 100).toFixed(2)}%` : 'N/A'}</Typography>
                                                
                                                <Typography variant="body2">Profit Margins:</Typography>
                                                <Typography variant="body2">{analysis.traditional!.profitMargins ? `${(analysis.traditional!.profitMargins * 100).toFixed(2)}%` : 'N/A'}</Typography>
                                                
                                                <Typography variant="body2">Debt/Equity:</Typography>
                                                <Typography variant="body2">{analysis.traditional!.debtToEquity?.toFixed(2) ?? 'N/A'}</Typography>
                                                
                                                <Typography variant="body2">Analyzed:</Typography>
                                                <Typography variant="body2">{formatDate(analysis.traditional!.analyzedAt)}</Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {analysis.hasAI && (
                                    <Card sx={{ minWidth: 400 }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" gutterBottom>
                                                AI Analysis Preview
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Timeframe: {analysis.ai!.timeframe}
                                            </Typography>
                                            <Box sx={{ 
                                                maxHeight: 400, 
                                                overflow: 'auto',
                                                '&::-webkit-scrollbar': {
                                                    width: '8px',
                                                },
                                                '&::-webkit-scrollbar-track': {
                                                    background: '#f1f1f1',
                                                    borderRadius: '4px',
                                                },
                                                '&::-webkit-scrollbar-thumb': {
                                                    background: '#888',
                                                    borderRadius: '4px',
                                                    '&:hover': {
                                                        background: '#555',
                                                    },
                                                },
                                                '& .markdown-body': {
                                                    fontFamily: 'inherit',
                                                    fontSize: '0.875rem',
                                                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                                                        marginTop: 1,
                                                        marginBottom: 0.5,
                                                        fontSize: '1rem',
                                                    },
                                                    '& p': {
                                                        marginBottom: 0.5,
                                                    },
                                                    '& ul, & ol': {
                                                        paddingLeft: 2,
                                                        marginBottom: 0.5,
                                                    },
                                                    '& li': {
                                                        marginBottom: 0.25,
                                                    },
                                                    '& code': {
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                        padding: '1px 3px',
                                                        borderRadius: 1,
                                                        fontSize: '0.8rem',
                                                    },
                                                    '& pre': {
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                        padding: 1,
                                                        borderRadius: 1,
                                                        overflowX: 'auto',
                                                        fontSize: '0.8rem',
                                                    },
                                                }
                                            }}>
                                                <ReactMarkdown>
                                                    {getFinalAnalysis(analysis.ai!.analysisText)}
                                                </ReactMarkdown>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Analyzed: {formatDate(analysis.ai!.analyzedAt)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                )}
                            </Box>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

interface AIAnalysisDialogProps {
    open: boolean;
    onClose: () => void;
    symbol: string;
    aiAnalysis: AIStockAnalysis | null;
}

const AIAnalysisDialog: React.FC<AIAnalysisDialogProps> = ({ open, onClose, symbol, aiAnalysis }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PsychologyIcon />
                    AI Analysis for {symbol}
                </Box>
            </DialogTitle>
            <DialogContent>
                {aiAnalysis ? (
                    <>
                        <Box sx={{ mb: 2 }}>
                            <Chip 
                                label={`${aiAnalysis.timeframe} Analysis`} 
                                color="primary" 
                                size="small" 
                            />
                            {aiAnalysis.success ? (
                                <Chip 
                                    label="Successful" 
                                    color="success" 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                />
                            ) : (
                                <Chip 
                                    label="Failed" 
                                    color="error" 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>
                        
                        <Typography variant="subtitle2" gutterBottom>
                            Analysis Date: {new Date(aiAnalysis.analyzedAt).toLocaleString()}
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                            {aiAnalysis.analysisText}
                        </Typography>
                        
                        {aiAnalysis.errorMessage && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                Error: {aiAnalysis.errorMessage}
                            </Alert>
                        )}
                    </>
                ) : (
                    <Typography>No AI analysis available</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export const EnhancedAnalysis: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [enhancedData, setEnhancedData] = useState<EnhancedAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiAnalyzing, setAIAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState<'Next Week' | 'Next Month'>('Next Week');
    const [selectedAI, setSelectedAI] = useState<{ symbol: string; analysis: AIStockAnalysis } | null>(null);

    useEffect(() => {
        loadEnhancedData();
    }, []);

    const loadEnhancedData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getEnhancedAnalysis();
            setEnhancedData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load analysis data');
        } finally {
            setLoading(false);
        }
    };

    const handleTraditionalAnalysis = async () => {
        setAnalyzing(true);
        setError(null);
        try {
            await api.performAnalysis();
            await loadEnhancedData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform traditional analysis');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleAIAnalysis = async () => {
        setAIAnalyzing(true);
        setError(null);
        try {
            await api.performAIAnalysis(timeframe);
            await loadEnhancedData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform AI analysis');
        } finally {
            setAIAnalyzing(false);
        }
    };

    const handleCompleteAnalysis = async () => {
        setAnalyzing(true);
        setAIAnalyzing(true);
        setError(null);
        try {
            await api.performCompleteAnalysis(true, timeframe);
            await loadEnhancedData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform complete analysis');
        } finally {
            setAnalyzing(false);
            setAIAnalyzing(false);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleViewAI = (symbol: string, aiAnalysis: AIStockAnalysis) => {
        setSelectedAI({ symbol, analysis: aiAnalysis });
    };

    const handleCloseAIDialog = () => {
        setSelectedAI(null);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Paper sx={{ mb: 3, p: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Enhanced Portfolio Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Traditional financial metrics combined with AI-powered market insights
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button 
                        variant="contained" 
                        startIcon={analyzing ? <CircularProgress size={20} /> : <TrendingUpIcon />}
                        onClick={handleTraditionalAnalysis}
                        disabled={analyzing}
                    >
                        {analyzing ? 'Analyzing...' : 'Run Traditional Analysis'}
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Timeframe</InputLabel>
                        <Select
                            value={timeframe}
                            label="Timeframe"
                            onChange={(e) => setTimeframe(e.target.value as 'Next Week' | 'Next Month')}
                        >
                            <MenuItem value="Next Week">Next Week</MenuItem>
                            <MenuItem value="Next Month">Next Month</MenuItem>
                        </Select>
                    </FormControl>

                    <Button 
                        variant="contained" 
                        color="secondary"
                        startIcon={aiAnalyzing ? <CircularProgress size={20} /> : <PsychologyIcon />}
                        onClick={handleAIAnalysis}
                        disabled={aiAnalyzing}
                    >
                        {aiAnalyzing ? 'AI Analyzing...' : 'Run AI Analysis'}
                    </Button>

                    <Button 
                        variant="contained" 
                        color="primary"
                        startIcon={(analyzing || aiAnalyzing) ? <CircularProgress size={20} /> : <TimelineIcon />}
                        onClick={handleCompleteAnalysis}
                        disabled={analyzing || aiAnalyzing}
                    >
                        {(analyzing || aiAnalyzing) ? 'Analyzing...' : 'Run Complete Analysis'}
                    </Button>

                    <Button 
                        startIcon={<RefreshIcon />}
                        onClick={loadEnhancedData}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>

                {enhancedData && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Portfolio Summary: {enhancedData.summary.totalStocks} stocks, 
                            {' '}{enhancedData.summary.withTraditional} with traditional analysis, 
                            {' '}{enhancedData.summary.withAI} with AI analysis
                            {enhancedData.summary.needingAI > 0 && (
                                <span style={{ color: 'orange' }}>
                                    {' '}({enhancedData.summary.needingAI} need AI refresh)
                                </span>
                            )}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {enhancedData && enhancedData.enhancedAnalyses.length > 0 ? (
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
                                <TableCell>AI Analysis</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {enhancedData.enhancedAnalyses.map((analysis) => (
                                <EnhancedRow 
                                    key={analysis.symbol} 
                                    analysis={analysis} 
                                    onViewAI={handleViewAI}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        No portfolio data available
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Please upload a portfolio first, then run the analysis.
                    </Typography>
                </Paper>
            )}

            <AIAnalysisDialog 
                open={!!selectedAI}
                onClose={handleCloseAIDialog}
                symbol={selectedAI?.symbol || ''}
                aiAnalysis={selectedAI?.analysis || null}
            />
        </Box>
    );
}; 