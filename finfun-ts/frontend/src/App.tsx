import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Container,
    IconButton,
    useMediaQuery,
    ThemeProvider,
    createTheme,
} from '@mui/material';
import {
    AccountBalance as PortfolioIcon,
    Assessment as AnalysisIcon,
    Business as SectorIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { Portfolio } from './components/Portfolio';
import { Analysis } from './components/Analysis';
import { SectorAnalysis } from './components/SectorAnalysis';

const drawerWidth = 240;

function App() {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: mode === 'dark' ? '#7c4dff' : '#6200ea',
                        light: mode === 'dark' ? '#b47cff' : '#9d46ff',
                        dark: mode === 'dark' ? '#3f1dcb' : '#0a00b6',
                    },
                    secondary: {
                        main: mode === 'dark' ? '#00b0ff' : '#0091ea',
                        light: mode === 'dark' ? '#69e2ff' : '#64c1ff',
                        dark: mode === 'dark' ? '#0081cb' : '#0064b7',
                    },
                    background: {
                        default: mode === 'dark' ? '#121212' : '#f5f5f5',
                        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                    },
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: 8,
                                textTransform: 'none',
                                fontWeight: 600,
                                backgroundColor: mode === 'dark' ? '#7c4dff' : '#6200ea',
                                color: '#ffffff',
                                '&:hover': {
                                    backgroundColor: mode === 'dark' ? '#3f1dcb' : '#0a00b6',
                                },
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                background: mode === 'dark'
                                    ? 'linear-gradient(90deg, #1e1e1e 0%, #2d1b69 100%)'
                                    : 'linear-gradient(90deg, #6200ea 0%, #0091ea 100%)',
                                boxShadow: '0 2px 10px 0 rgba(0,0,0,0.1)',
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                                borderRight: `1px solid ${mode === 'dark' ? '#333' : '#e0e0e0'}`,
                            },
                        },
                    },
                },
            }),
        [mode],
    );

    const toggleColorMode = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeProvider theme={theme}>
            <Router>
                <Box sx={{ display: 'flex' }}>
                    <CssBaseline />
                    <AppBar
                        position="fixed"
                        sx={{ 
                            zIndex: (theme) => theme.zIndex.drawer + 1,
                            background: mode === 'dark'
                                ? 'linear-gradient(90deg, #1e1e1e 0%, #2d1b69 100%)'
                                : 'linear-gradient(90deg, #6200ea 0%, #0091ea 100%)',
                        }}
                    >
                        <Toolbar sx={{ 
                            justifyContent: 'space-between',
                            minHeight: '70px !important',
                            padding: '0 24px',
                        }}>
                            <Typography 
                                variant="h5" 
                                noWrap 
                                component="div" 
                                sx={{ 
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                FinFun
                            </Typography>
                            <IconButton 
                                onClick={toggleColorMode} 
                                color="inherit"
                                sx={{
                                    backgroundColor: mode === 'dark' 
                                        ? 'rgba(255, 255, 255, 0.1)' 
                                        : 'rgba(255, 255, 255, 0.2)',
                                    '&:hover': {
                                        backgroundColor: mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.2)' 
                                            : 'rgba(255, 255, 255, 0.3)',
                                    },
                                }}
                            >
                                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                            </IconButton>
                        </Toolbar>
                    </AppBar>
                    <Drawer
                        variant="permanent"
                        sx={{
                            width: drawerWidth,
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: drawerWidth,
                                boxSizing: 'border-box',
                            },
                        }}
                    >
                        <Toolbar />
                        <Box sx={{ overflow: 'auto' }}>
                            <List>
                                <ListItem button component={Link} to="/" sx={{ 
                                    '&:hover': { 
                                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                                    }
                                }}>
                                    <ListItemIcon>
                                        <PortfolioIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Portfolio" />
                                </ListItem>
                                <ListItem button component={Link} to="/analysis" sx={{ 
                                    '&:hover': { 
                                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                                    }
                                }}>
                                    <ListItemIcon>
                                        <AnalysisIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Analysis" />
                                </ListItem>
                                <ListItem button component={Link} to="/sector-analysis" sx={{ 
                                    '&:hover': { 
                                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                                    }
                                }}>
                                    <ListItemIcon>
                                        <SectorIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Sector Analysis" />
                                </ListItem>
                            </List>
                        </Box>
                    </Drawer>
                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            p: 3,
                            width: { sm: `calc(100% - ${drawerWidth}px)` },
                            marginLeft: `${drawerWidth}px`,
                            backgroundColor: theme.palette.background.default,
                            minHeight: '100vh',
                        }}
                    >
                        <Toolbar />
                        <Container maxWidth="lg">
                            <Routes>
                                <Route path="/" element={<Portfolio />} />
                                <Route path="/analysis" element={<Analysis />} />
                                <Route path="/sector-analysis" element={<SectorAnalysis />} />
                            </Routes>
                        </Container>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );
}

export default App; 