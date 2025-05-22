import { exec } from 'child_process';
import path from 'path';

const scriptPath = path.join(__dirname, '../sp500_sector_normalization.ts');

console.log('Updating sector reference data...');
exec(`npx ts-node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error updating sector reference data: ${error}`);
        process.exit(1);
    }
    if (stderr) {
        console.error(`Warning: ${stderr}`);
    }
    console.log(stdout);
    console.log('Sector reference data updated successfully!');
}); 