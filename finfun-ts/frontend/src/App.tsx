import React from 'react';
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
} from '@mui/material';
import {
    AccountBalance as PortfolioIcon,
    Assessment as AnalysisIcon,
    Business as SectorIcon,
} from '@mui/icons-material';
import { Portfolio } from './components/Portfolio';
import { Analysis } from './components/Analysis';
import { SectorAnalysis } from './components/SectorAnalysis';

const drawerWidth = 240;

function App() {
    return (
        <Router>
            <Box sx={{ display: 'flex' }}>
                <CssBaseline />
                <AppBar
                    position="fixed"
                    sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
                >
                    <Toolbar>
                        <Typography variant="h6" noWrap component="div">
                            FinFun
                        </Typography>
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
                            <ListItem button component={Link} to="/">
                                <ListItemIcon>
                                    <PortfolioIcon />
                                </ListItemIcon>
                                <ListItemText primary="Portfolio" />
                            </ListItem>
                            <ListItem button component={Link} to="/analysis">
                                <ListItemIcon>
                                    <AnalysisIcon />
                                </ListItemIcon>
                                <ListItemText primary="Analysis" />
                            </ListItem>
                            <ListItem button component={Link} to="/sector-analysis">
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
    );
}

export default App; 