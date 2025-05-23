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
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { PortfolioEntry } from '../types';

export const Portfolio: React.FC = () => {
    const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            const data = await api.getPortfolio();
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await api.uploadPortfolio(file);
            await loadPortfolio();
        } catch (error) {
            console.error('Failed to upload portfolio:', error);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">Portfolio</Typography>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={<UploadIcon />}
                >
                    Upload CSV
                    <input
                        type="file"
                        hidden
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell align="right">Allocation (%)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {portfolio.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>{entry.stockSymbol}</TableCell>
                                <TableCell align="right">
                                    {entry.allocationPercentage.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}; 