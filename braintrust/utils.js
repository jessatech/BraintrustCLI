import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { inputMenu } from '../inquirer/inquirer-utils.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get API key from various sources (env var, .env file, or prompt)
 */
export async function getApiKey() {
    // First, check environment variable
    if (process.env.BRAINTRUST_API_KEY && process.env.BRAINTRUST_API_KEY !== 'undefined') {
        return process.env.BRAINTRUST_API_KEY;
    }

    // Check .env file (dotenv should have loaded it, but double-check)
    if (process.env.BRAINTRUST_API_KEY && process.env.BRAINTRUST_API_KEY !== 'undefined') {
        return process.env.BRAINTRUST_API_KEY;
    }

    // If no API key found, prompt the user
    console.log(chalk.yellow('\nNo Braintrust API key found.'));
    console.log(chalk.gray('You can set it via:'));
    console.log(chalk.gray('  - Environment variable: BRAINTRUST_API_KEY'));
    console.log(chalk.gray('  - .env file: BRAINTRUST_API_KEY=your_key_here'));
    console.log(chalk.gray('  - Or enter it below\n'));

    const apiKey = await inputMenu('Enter your Braintrust API Key: ');
    
    if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required');
    }

    // Optionally save to .env file
    const envPath = path.join(process.cwd(), '.env');
    const shouldSave = await inputMenu('Save API key to .env file? (y/n): ');
    
    if (shouldSave && (shouldSave.toLowerCase() === 'y' || shouldSave.toLowerCase() === 'yes')) {
        try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
                // Remove existing BRAINTRUST_API_KEY if present
                envContent = envContent.replace(/BRAINTRUST_API_KEY=.*\n/g, '');
            }
            envContent += `BRAINTRUST_API_KEY=${apiKey.trim()}\n`;
            fs.writeFileSync(envPath, envContent);
            console.log(chalk.green('✓ API key saved to .env file'));
        } catch (error) {
            console.log(chalk.yellow('Could not save to .env file, but continuing with current session...'));
        }
    }

    return apiKey.trim();
}

/**
 * Verify API key by making a test request
 */
export async function verifyApiKey(apiKey) {
    try {
        const axios = (await import('axios')).default;
        // Use the project endpoint to verify the API key
        const response = await axios.get('https://api.braintrust.dev/v1/project', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        return response && response.status === 200;
    } catch (error) {
        return false;
    }
}

