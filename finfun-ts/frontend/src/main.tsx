import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const AppWrapper = () => {
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: mode === 'light' ? '#0f766e' : '#2dd4bf', // Teal
                        light: mode === 'light' ? '#14b8a6' : '#5eead4',
                        dark: mode === 'light' ? '#0d9488' : '#0d9488',
                        contrastText: '#ffffff',
                    },
                    secondary: {
                        main: mode === 'light' ? '#0f766e' : '#2dd4bf', // Match primary for consistency
                        light: mode === 'light' ? '#14b8a6' : '#5eead4',
                        dark: mode === 'light' ? '#0d9488' : '#0d9488',
                        contrastText: '#ffffff',
                    },
                    background: {
                        default: mode === 'light' ? '#f8fafc' : '#0f172a',
                        paper: mode === 'light' ? '#ffffff' : '#1e293b',
                    },
                    text: {
                        primary: mode === 'light' ? '#0f172a' : '#f8fafc',
                        secondary: mode === 'light' ? '#475569' : '#cbd5e1',
                    },
                    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                    action: {
                        hover: mode === 'light' ? 'rgba(15, 118, 110, 0.04)' : 'rgba(45, 212, 191, 0.08)',
                        selected: mode === 'light' ? 'rgba(15, 118, 110, 0.08)' : 'rgba(45, 212, 191, 0.12)',
                    },
                },
                typography: {
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                    h1: {
                        fontWeight: 700,
                        fontSize: '2.5rem',
                        letterSpacing: '-0.02em',
                    },
                    h2: {
                        fontWeight: 700,
                        fontSize: '2rem',
                        letterSpacing: '-0.01em',
                    },
                    h3: {
                        fontWeight: 600,
                        fontSize: '1.75rem',
                    },
                    h4: {
                        fontWeight: 600,
                        fontSize: '1.5rem',
                    },
                    h5: {
                        fontWeight: 600,
                        fontSize: '1.25rem',
                    },
                    h6: {
                        fontWeight: 600,
                        fontSize: '1rem',
                    },
                    subtitle1: {
                        fontSize: '1rem',
                        letterSpacing: '0.00938em',
                    },
                    subtitle2: {
                        fontSize: '0.875rem',
                        letterSpacing: '0.00714em',
                    },
                    body1: {
                        fontSize: '1rem',
                        letterSpacing: '0.00938em',
                    },
                    body2: {
                        fontSize: '0.875rem',
                        letterSpacing: '0.01071em',
                    },
                    button: {
                        textTransform: 'none',
                        fontWeight: 500,
                    },
                },
                shape: {
                    borderRadius: 16,
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                borderRadius: '12px',
                                padding: '10px 20px',
                                fontWeight: 500,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: mode === 'light' 
                                        ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                        : '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
                                },
                                '&:active': {
                                    transform: 'translateY(0)',
                                },
                            },
                            contained: {
                                background: mode === 'light' 
                                    ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)'
                                    : 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
                                boxShadow: mode === 'light' 
                                    ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                                    : '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                                '&:hover': {
                                    background: mode === 'light' 
                                        ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                                        : 'linear-gradient(135deg, #5eead4 0%, #2dd4bf 100%)',
                                },
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                borderRadius: '16px',
                                boxShadow: mode === 'light' 
                                    ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                                    : '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: mode === 'light' 
                                        ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                                        : '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
                                },
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                borderRadius: '16px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                boxShadow: 'none',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                background: mode === 'light' 
                                    ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)'
                                    : 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                borderRight: '1px solid',
                                borderColor: 'divider',
                            },
                        },
                    },
                    MuiListItem: {
                        styleOverrides: {
                            root: {
                                borderRadius: '12px',
                                margin: '4px 8px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    background: mode === 'light' 
                                        ? 'rgba(15, 118, 110, 0.08)' 
                                        : 'rgba(45, 212, 191, 0.08)',
                                    transform: 'translateX(4px)',
                                },
                            },
                        },
                    },
                    MuiIconButton: {
                        styleOverrides: {
                            root: {
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'scale(1.1)',
                                    background: mode === 'light' 
                                        ? 'rgba(15, 118, 110, 0.08)' 
                                        : 'rgba(45, 212, 191, 0.08)',
                                },
                            },
                        },
                    },
                    MuiTooltip: {
                        styleOverrides: {
                            tooltip: {
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.875rem',
                                background: mode === 'light' ? '#0f172a' : '#f8fafc',
                                color: mode === 'light' ? '#f8fafc' : '#0f172a',
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App mode={mode} setMode={setMode} />
        </ThemeProvider>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppWrapper />
    </React.StrictMode>
); 