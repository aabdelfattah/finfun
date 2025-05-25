import express from 'express';
import { AppDataSource } from '../server';
import { Config } from '../entities/Config';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Apply authentication and admin requirement to all config routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all config settings
router.get('/', async (req: AuthRequest, res) => {
    try {
        const configRepository = AppDataSource.getRepository(Config);
        const configs = await configRepository.find();
        
        res.json({ configs });
    } catch (error) {
        console.error('Get configs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific config by key
router.get('/:key', async (req: AuthRequest, res) => {
    try {
        const { key } = req.params;
        const configRepository = AppDataSource.getRepository(Config);
        const config = await configRepository.findOne({ where: { key } });
        
        if (!config) {
            return res.status(404).json({ error: 'Config not found' });
        }
        
        res.json({ config });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update or create config setting
router.put('/:key', async (req: AuthRequest, res) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;
        
        if (!value) {
            return res.status(400).json({ error: 'Value is required' });
        }
        
        const configRepository = AppDataSource.getRepository(Config);
        let config = await configRepository.findOne({ where: { key } });
        
        if (config) {
            // Update existing config
            config.value = value;
            if (description !== undefined) {
                config.description = description;
            }
        } else {
            // Create new config
            config = new Config();
            config.key = key;
            config.value = value;
            config.description = description;
        }
        
        await configRepository.save(config);
        
        res.json({
            message: 'Config updated successfully',
            config
        });
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete config setting
router.delete('/:key', async (req: AuthRequest, res) => {
    try {
        const { key } = req.params;
        const configRepository = AppDataSource.getRepository(Config);
        const config = await configRepository.findOne({ where: { key } });
        
        if (!config) {
            return res.status(404).json({ error: 'Config not found' });
        }
        
        await configRepository.remove(config);
        
        res.json({ message: 'Config deleted successfully' });
    } catch (error) {
        console.error('Delete config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize default configs
router.post('/initialize', async (req: AuthRequest, res) => {
    try {
        const configRepository = AppDataSource.getRepository(Config);
        
        // Check if sector analysis access config exists
        const sectorAnalysisConfig = await configRepository.findOne({ 
            where: { key: 'allow_user_sector_analysis' } 
        });
        
        if (!sectorAnalysisConfig) {
            const config = new Config();
            config.key = 'allow_user_sector_analysis';
            config.value = 'true';
            config.description = 'Allow normal users to access sector analysis page';
            await configRepository.save(config);
        }
        
        res.json({ message: 'Default configs initialized' });
    } catch (error) {
        console.error('Initialize configs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 