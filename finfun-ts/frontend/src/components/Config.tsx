import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    FormControlLabel,
    Alert,
    Button,
    CircularProgress,
    Divider,
} from '@mui/material';
import { api } from '../services/api';

interface Config {
    id: number;
    key: string;
    value: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export const Config: React.FC = () => {
    const [configs, setConfigs] = useState<Config[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            setLoading(true);
            const response = await api.getConfigs();
            setConfigs(response.configs);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to load configurations');
        } finally {
            setLoading(false);
        }
    };

    const initializeConfigs = async () => {
        try {
            setSaving(true);
            await api.initializeConfigs();
            setSuccess('Default configurations initialized successfully');
            await loadConfigs();
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to initialize configurations');
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = async (key: string, value: string, description?: string) => {
        try {
            setSaving(true);
            await api.updateConfig(key, value, description);
            setSuccess('Configuration updated successfully');
            await loadConfigs();
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to update configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleSectorAnalysisToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.checked ? 'true' : 'false';
        updateConfig(
            'allow_user_sector_analysis',
            newValue,
            'Allow normal users to access sector analysis page'
        );
    };

    const getSectorAnalysisValue = (): boolean => {
        const config = configs.find(c => c.key === 'allow_user_sector_analysis');
        return config?.value === 'true';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Application Configuration
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Manage application settings and permissions.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        User Permissions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <FormControlLabel
                        control={
                            <Switch
                                checked={getSectorAnalysisValue()}
                                onChange={handleSectorAnalysisToggle}
                                disabled={saving}
                            />
                        }
                        label="Allow normal users to access Sector Analysis"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        When enabled, normal users can view and access the sector analysis page. 
                        When disabled, only administrators can access this feature.
                    </Typography>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        System Actions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Button
                        variant="outlined"
                        onClick={initializeConfigs}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} /> : null}
                    >
                        Initialize Default Configurations
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Creates default configuration entries if they don't exist.
                    </Typography>
                </CardContent>
            </Card>

            {configs.length > 0 && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Current Configurations
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        {configs.map((config) => (
                            <Box key={config.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    {config.key}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Value: {config.value}
                                </Typography>
                                {config.description && (
                                    <Typography variant="body2" color="text.secondary">
                                        Description: {config.description}
                                    </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    Last updated: {new Date(config.updatedAt).toLocaleString()}
                                </Typography>
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}; 