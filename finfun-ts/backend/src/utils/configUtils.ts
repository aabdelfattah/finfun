import { AppDataSource } from '../server';
import { Config } from '../entities/Config';

export const getConfigValue = async (key: string, defaultValue: string = ''): Promise<string> => {
    try {
        const configRepository = AppDataSource.getRepository(Config);
        const config = await configRepository.findOne({ where: { key } });
        return config ? config.value : defaultValue;
    } catch (error) {
        console.error(`Error getting config ${key}:`, error);
        return defaultValue;
    }
};

export const getBooleanConfig = async (key: string, defaultValue: boolean = false): Promise<boolean> => {
    const value = await getConfigValue(key, defaultValue.toString());
    return value.toLowerCase() === 'true';
};

export const isUserSectorAnalysisAllowed = async (): Promise<boolean> => {
    return await getBooleanConfig('allow_user_sector_analysis', true);
}; 