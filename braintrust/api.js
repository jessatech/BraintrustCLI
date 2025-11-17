import axios from "axios";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser } from '@json2csv/plainjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAINTRUST_API_BASE = 'https://api.braintrust.dev/v1';

/**
 * Make an authenticated GET request to the Braintrust API
 */
async function makeRequest(endpoint, apiKey, params = {}) {
    try {
        const url = new URL(`${BRAINTRUST_API_BASE}/${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await axios.get(url.toString(), {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            const errorMsg = error.response.data?.message || error.response.statusText;
            throw new Error(`API Error: ${error.response.status} - ${errorMsg}`);
        }
        throw error;
    }
}

/**
 * Make an authenticated POST request to the Braintrust API
 */
async function makePostRequest(endpoint, apiKey, data = {}) {
    try {
        const url = `${BRAINTRUST_API_BASE}/${endpoint}`;
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            const errorMsg = error.response.data?.message || error.response.statusText;
            throw new Error(`API Error: ${error.response.status} - ${errorMsg}`);
        }
        throw error;
    }
}

/**
 * List all available projects
 * API: GET /v1/project
 * Returns: { objects: Project[] }
 */
export async function listProjects(apiKey) {
    try {
        const response = await makeRequest('project', apiKey);
        
        // Braintrust API returns { objects: [...] }
        if (response && response.objects) {
            return Array.isArray(response.objects) ? response.objects : [response.objects];
        }
        
        // Fallback for different response structures
        if (Array.isArray(response)) {
            return response;
        }
        if (response && response.data) {
            return Array.isArray(response.data) ? response.data : [response.data];
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching projects:', error.message);
        throw error;
    }
}

/**
 * Fetch all experiments for a project
 * API: GET /v1/experiment?project_id={project_id}
 * Returns: { objects: Experiment[] }
 */
export async function fetchExperiments(apiKey, projectName) {
    try {
        console.log(`Fetching experiments for project: ${projectName}...`);
        
        // First, get the project ID
        const projects = await listProjects(apiKey);
        const project = projects.find(p => p.name === projectName || p.id === projectName);
        
        if (!project) {
            throw new Error(`Project "${projectName}" not found`);
        }

        // Fetch experiments for the project using query parameter
        const response = await makeRequest('experiment', apiKey, {
            project_id: project.id
        });

        // Braintrust API returns { objects: [...] }
        if (response && response.objects) {
            return Array.isArray(response.objects) ? response.objects : [response.objects];
        }
        
        // Fallback for different response structures
        if (Array.isArray(response)) {
            return response;
        }
        if (response && response.data) {
            return Array.isArray(response.data) ? response.data : [response.data];
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching experiments:', error.message);
        throw error;
    }
}

/**
 * Fetch all datasets for a project
 * API: GET /v1/dataset?project_id={project_id}
 * Returns: { objects: Dataset[] }
 */
export async function fetchDatasets(apiKey, projectName) {
    try {
        console.log(`Fetching datasets for project: ${projectName}...`);
        
        // First, get the project ID
        const projects = await listProjects(apiKey);
        const project = projects.find(p => p.name === projectName || p.id === projectName);
        
        if (!project) {
            throw new Error(`Project "${projectName}" not found`);
        }

        // Fetch datasets for the project using query parameter
        const response = await makeRequest('dataset', apiKey, {
            project_id: project.id
        });

        // Braintrust API returns { objects: [...] }
        if (response && response.objects) {
            return Array.isArray(response.objects) ? response.objects : [response.objects];
        }
        
        // Fallback for different response structures
        if (Array.isArray(response)) {
            return response;
        }
        if (response && response.data) {
            return Array.isArray(response.data) ? response.data : [response.data];
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching datasets:', error.message);
        throw error;
    }
}

/**
 * Fetch all records from an experiment using pagination
 * API: POST /v1/experiment/{experiment_id}/fetch
 * Returns: { events: Event[], cursor: string }
 */
export async function fetchExperimentRecords(apiKey, experimentId) {
    try {
        let allEvents = [];
        let cursor = null;
        let hasMore = true;
        
        // Fetch all events with pagination
        while (hasMore) {
            const requestBody = {
                limit: 1000, // Maximum records per request
            };
            
            if (cursor) {
                requestBody.cursor = cursor;
            }
            
            const response = await makePostRequest(`experiment/${experimentId}/fetch`, apiKey, requestBody);
            
            // Braintrust API returns { events: [...], cursor: "..." }
            if (response && response.events) {
                allEvents = allEvents.concat(response.events);
            }
            
            // Check if there's more data
            cursor = response?.cursor;
            hasMore = cursor && response.events && response.events.length > 0;
        }
        
        return allEvents;
    } catch (error) {
        console.error(`Error fetching records for experiment ${experimentId}:`, error.message);
        throw error;
    }
}

/**
 * Fetch all records from a dataset
 * API: GET /v1/dataset/{dataset_id} or POST /v1/dataset/{dataset_id}/fetch
 * Returns: Dataset object with records array
 */
export async function fetchDatasetRecords(apiKey, datasetId) {
    try {
        // First try to get the dataset object
        let dataset = null;
        try {
            dataset = await makeRequest(`dataset/${datasetId}`, apiKey);
        } catch (error) {
            // If GET fails, try POST fetch endpoint (similar to experiments)
            try {
                const response = await makePostRequest(`dataset/${datasetId}/fetch`, apiKey, {
                    limit: 1000
                });
                if (response && response.records) {
                    return Array.isArray(response.records) ? response.records : [response.records];
                }
            } catch (err) {
                throw new Error(`Failed to fetch dataset records: ${error.message}`);
            }
        }
        
        // Extract records from dataset object
        if (dataset && dataset.records) {
            return Array.isArray(dataset.records) ? dataset.records : [dataset.records];
        }
        if (dataset && dataset.data) {
            return Array.isArray(dataset.data) ? dataset.data : [dataset.data];
        }
        
        // If no records found, return the dataset object itself as a single record
        return dataset ? [dataset] : [];
    } catch (error) {
        console.error(`Error fetching records for dataset ${datasetId}:`, error.message);
        throw error;
    }
}

/**
 * Convert data to CSV and save to file
 */
function saveToCSV(data, filePath) {
    if (!data || data.length === 0) {
        console.log(`No data to export to ${filePath}`);
        return;
    }

    try {
        // Flatten nested objects for better CSV representation
        const flattenedData = data.map(item => flattenObject(item));
        
        const parser = new Parser();
        const csv = parser.parse(flattenedData);
        
        fs.writeFileSync(filePath, csv, 'utf8');
        console.log(`✓ Exported ${data.length} records to ${filePath}`);
    } catch (error) {
        console.error(`Error saving CSV to ${filePath}:`, error.message);
        throw error;
    }
}

/**
 * Flatten nested objects for CSV export
 */
function flattenObject(obj, prefix = '', result = {}) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                flattenObject(obj[key], newKey, result);
            } else if (Array.isArray(obj[key])) {
                result[newKey] = JSON.stringify(obj[key]);
            } else {
                result[newKey] = obj[key];
            }
        }
    }
    return result;
}

/**
 * Export all experiments and datasets to CSV files
 */
export async function exportProjectData(apiKey, projectName, outputDir = './exports') {
    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Fetch experiments and datasets
        const experiments = await fetchExperiments(apiKey, projectName);
        const datasets = await fetchDatasets(apiKey, projectName);

        console.log(`\nFound ${experiments.length} experiments and ${datasets.length} datasets\n`);

        // Export each experiment
        for (const experiment of experiments) {
            try {
                const records = await fetchExperimentRecords(apiKey, experiment.id);
                const safeName = sanitizeFilename(experiment.name || experiment.id);
                const filePath = path.join(outputDir, `experiment_${safeName}.csv`);
                saveToCSV(records, filePath);
            } catch (error) {
                console.error(`Failed to export experiment ${experiment.id}:`, error.message);
            }
        }

        // Export each dataset
        for (const dataset of datasets) {
            try {
                const records = await fetchDatasetRecords(apiKey, dataset.id);
                const safeName = sanitizeFilename(dataset.name || dataset.id);
                const filePath = path.join(outputDir, `dataset_${safeName}.csv`);
                saveToCSV(records, filePath);
            } catch (error) {
                console.error(`Failed to export dataset ${dataset.id}:`, error.message);
            }
        }

        console.log(`\n✓ Export complete! Files saved to ${outputDir}`);
    } catch (error) {
        console.error('Error exporting project data:', error.message);
        throw error;
    }
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

