import express from 'express';
import cors from 'cors';
import portfolioRoutes from './routes/portfolio';
import analysisRoutes from './routes/analysis';
import sectorAnalysisRoutes from './routes/sector-analysis';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/sector-analysis', sectorAnalysisRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 