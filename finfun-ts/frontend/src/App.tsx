import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
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
    Button,
    Menu,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import {
    AccountBalance as PortfolioIcon,
    Assessment as AnalysisIcon,
    Business as SectorIcon,
    Settings as ConfigIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    AccountCircle as AccountIcon,
    ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Portfolio } from './components/Portfolio';
import { Analysis } from './components/Analysis';
import { EnhancedAnalysis } from './components/EnhancedAnalysis';
import { SectorAnalysis } from './components/SectorAnalysis';
import { Login } from './components/Login';
import { Config } from './components/Config';
import { api } from './services/api';

const drawerWidth = 240;

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
    const { user, isLoading, isAdmin } = useAuth();

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin()) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const SectorAnalysisRoute: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                if (isAdmin()) {
                    setHasAccess(true);
                    return;
                }
                const access = await api.checkSectorAnalysisAccess();
                setHasAccess(access);
            } catch (error) {
                setHasAccess(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAccess();
    }, [isAdmin]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!hasAccess) {
        return <Navigate to="/" replace />;
    }

    return <SectorAnalysis />;
};

function AppContent() {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { user, logout, isAdmin } = useAuth();
    const [hasSectorAnalysisAccess, setHasSectorAnalysisAccess] = useState<boolean>(false);

    useEffect(() => {
        const checkAccess = async () => {
            if (isAdmin()) {
                setHasSectorAnalysisAccess(true);
                return;
            }
            try {
                const access = await api.checkSectorAnalysisAccess();
                setHasSectorAnalysisAccess(access);
            } catch (error) {
                setHasSectorAnalysisAccess(false);
            }
        };

        checkAccess();
    }, [isAdmin]);

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

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleMenuClose();
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                <Button
                                    color="inherit"
                                    onClick={handleMenuOpen}
                                    startIcon={<AccountIcon />}
                                    sx={{ color: 'white' }}
                                >
                                    {user?.email}
                                </Button>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleMenuClose}
                                >
                                    <MenuItem onClick={handleLogout}>
                                        <LogoutIcon sx={{ mr: 1 }} />
                                        Logout
                                    </MenuItem>
                                </Menu>
                            </Box>
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
                                {(isAdmin() || hasSectorAnalysisAccess) && (
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
                                )}
                                {isAdmin() && (
                                    <ListItem button component={Link} to="/config" sx={{ 
                                        '&:hover': { 
                                            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                                        }
                                    }}>
                                        <ListItemIcon>
                                            <ConfigIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Configuration" />
                                    </ListItem>
                                )}
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
                                <Route path="/login" element={<Login />} />
                                <Route path="/" element={
                                    <ProtectedRoute>
                                        <Portfolio />
                                    </ProtectedRoute>
                                } />
                                <Route path="/analysis" element={
                                    <ProtectedRoute>
                                        <EnhancedAnalysis />
                                    </ProtectedRoute>
                                } />
                                <Route path="/analysis/traditional" element={
                                    <ProtectedRoute>
                                        <Analysis />
                                    </ProtectedRoute>
                                } />
                                <Route path="/sector-analysis" element={
                                    <ProtectedRoute>
                                        <SectorAnalysisRoute />
                                    </ProtectedRoute>
                                } />
                                <Route path="/config" element={
                                    <ProtectedRoute adminOnly>
                                        <Config />
                                    </ProtectedRoute>
                                } />
                            </Routes>
                        </Container>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App; 