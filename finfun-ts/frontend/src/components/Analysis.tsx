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
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { StockAnalysis } from '../types';

export const Analysis: React.FC = () => {
    const [analysis, setAnalysis] = useState<StockAnalysis[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAnalysis();
    }, []);

    const loadAnalysis = async () => {
        try {
            const data = await api.getAnalysis();
            setAnalysis(data);
        } catch (error) {
            console.error('Failed to load analysis:', error);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const data = await api.performAnalysis();
            setAnalysis(data);
        } catch (error) {
            console.error('Failed to perform analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'success.main';
        if (score >= 60) return 'info.main';
        if (score >= 40) return 'warning.main';
        return 'error.main';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">Stock Analysis</Typography>
                <Button
                    variant="contained"
                    onClick={handleAnalyze}
                    disabled={loading}
                    startIcon={<RefreshIcon />}
                >
                    Analyze
                </Button>
            </Box>

            {loading && <LinearProgress sx={{ mb: 3 }} />}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell>Health Score</TableCell>
                            <TableCell>Value Score</TableCell>
                            <TableCell>Total Score</TableCell>
                            <TableCell>Recommendation</TableCell>
                            <TableCell>P/E</TableCell>
                            <TableCell>Dividend Yield</TableCell>
                            <TableCell>Profit Margins</TableCell>
                            <TableCell>Discount from ATH</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {analysis.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.stockSymbol}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={item.healthScore}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    backgroundColor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: getScoreColor(item.healthScore),
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.healthScore.toFixed(0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={item.valueScore}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    backgroundColor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: getScoreColor(item.valueScore),
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.valueScore.toFixed(0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={item.totalScore}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    backgroundColor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: getScoreColor(item.totalScore),
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.totalScore.toFixed(0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>{item.recommendation}</TableCell>
                                <TableCell>{item.pe?.toFixed(2) ?? 'N/A'}</TableCell>
                                <TableCell>
                                    {item.dividendYield
                                        ? `${(item.dividendYield * 100).toFixed(2)}%`
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    {item.profitMargins
                                        ? `${(item.profitMargins * 100).toFixed(2)}%`
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    {item.discountAllTimeHigh
                                        ? `${(item.discountAllTimeHigh * 100).toFixed(2)}%`
                                        : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}; 