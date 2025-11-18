import axios from "axios";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser } from '@json2csv/plainjs';
import { withRetry, sleep } from './rate-limiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAINTRUST_API_BASE = 'https://api.braintrust.dev/v1';

/**
 * Create organized directory structure for a project's exports
 * @param {string} baseDir - Base export directory (e.g., './exports')
 * @param {string} projectName - Name of the project
 * @returns {Object} Object with paths to datasets and experiments directories
 */
function createProjectDirectories(baseDir, projectName) {
    const safeName = sanitizeFilename(projectName);
    const projectDir = path.join(baseDir, safeName);
    const datasetsDir = path.join(projectDir, 'datasets');
    const experimentsDir = path.join(projectDir, 'experiments');
    
    // Create all directories recursively
    fs.mkdirSync(datasetsDir, { recursive: true });
    fs.mkdirSync(experimentsDir, { recursive: true });
    
    return {
        projectDir,
        datasetsDir,
        experimentsDir
    };
}

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
            const enhancedError = new Error(`API Error: ${error.response.status} - ${errorMsg}`);
            // Preserve the response object for rate limiter to detect 429s
            enhancedError.response = error.response;
            enhancedError.status = error.response.status;
            throw enhancedError;
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
            const enhancedError = new Error(`API Error: ${error.response.status} - ${errorMsg}`);
            // Preserve the response object for rate limiter to detect 429s
            enhancedError.response = error.response;
            enhancedError.status = error.response.status;
            throw enhancedError;
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
 * Get a single project by its ID
 * API: GET /v1/project/{project_id}
 * Returns: Project object
 * @param {string} apiKey - Braintrust API key
 * @param {string} projectId - Project ID to fetch
 * @returns {Promise<Object>} Project object
 * @throws {Error} If project not found or API error
 */
export async function getProjectById(apiKey, projectId) {
    try {
        const response = await makeRequest(`project/${projectId}`, apiKey);
        return response;
    } catch (error) {
        if (error.message.includes('404')) {
            throw new Error(`Project with ID "${projectId}" not found`);
        }
        console.error('Error fetching project by ID:', error.message);
        throw error;
    }
}

/**
 * Validate if a project ID exists
 * @param {string} apiKey - Braintrust API key
 * @param {string} projectId - Project ID to validate
 * @returns {Promise<boolean>} True if project exists, false otherwise
 */
export async function validateProjectId(apiKey, projectId) {
    try {
        await getProjectById(apiKey, projectId);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Fetch all experiments for a project
 * API: GET /v1/experiment?project_id={project_id}
 * Returns: { objects: Experiment[] }
 * @param {string} apiKey - Braintrust API key
 * @param {string} projectNameOrId - Project name or ID
 * @param {boolean} isId - If true, treat projectNameOrId as an ID (skip lookup)
 */
export async function fetchExperiments(apiKey, projectNameOrId, isId = false) {
    try {
        console.log(`Fetching experiments for project: ${projectNameOrId}...`);
        
        let projectId;
        
        if (isId) {
            // Use the provided ID directly
            projectId = projectNameOrId;
        } else {
            // Look up the project by name
            const projects = await listProjects(apiKey);
            const project = projects.find(p => p.name === projectNameOrId || p.id === projectNameOrId);
            
            if (!project) {
                throw new Error(`Project "${projectNameOrId}" not found`);
            }
            projectId = project.id;
        }

        // Fetch experiments for the project using query parameter
        const response = await makeRequest('experiment', apiKey, {
            project_id: projectId
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
 * @param {string} apiKey - Braintrust API key
 * @param {string} projectNameOrId - Project name or ID
 * @param {boolean} isId - If true, treat projectNameOrId as an ID (skip lookup)
 */
export async function fetchDatasets(apiKey, projectNameOrId, isId = false) {
    try {
        console.log(`Fetching datasets for project: ${projectNameOrId}...`);
        
        let projectId;
        
        if (isId) {
            // Use the provided ID directly
            projectId = projectNameOrId;
        } else {
            // Look up the project by name
            const projects = await listProjects(apiKey);
            const project = projects.find(p => p.name === projectNameOrId || p.id === projectNameOrId);
            
            if (!project) {
                throw new Error(`Project "${projectNameOrId}" not found`);
            }
            projectId = project.id;
        }

        // Fetch datasets for the project using query parameter
        const response = await makeRequest('dataset', apiKey, {
            project_id: projectId
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
 * Fetch all records from an experiment using pagination with streaming support
 * API: POST /v1/experiment/{experiment_id}/fetch
 * Yields batches of events for memory-efficient processing
 * @param {string} apiKey - Braintrust API key
 * @param {string} experimentId - Experiment ID
 * @param {Function} [onProgress] - Optional progress callback
 * @returns {AsyncGenerator} Yields batches of events
 */
export async function* fetchExperimentRecordsWithPagination(apiKey, experimentId, onProgress) {
    let cursor = null;
    let hasMore = true;
    let totalFetched = 0;
    let lastLoggedCount = 0;
    
    try {
        while (hasMore) {
            const requestBody = {
                limit: 1000, // Records per request
            };
            
            if (cursor) {
                requestBody.cursor = cursor;
            }
            
            // Log progress before each API call if we have new records to show
            // This ensures progress is visible before any rate limit pause
            if (totalFetched > 0 && totalFetched !== lastLoggedCount) {
                console.log(`  → Fetched ${totalFetched} records...`);
                lastLoggedCount = totalFetched;
            }
            
            // Wrap API call with retry logic
            const response = await withRetry(
                () => makePostRequest(`experiment/${experimentId}/fetch`, apiKey, requestBody),
                { maxRetries: 4, initialBackoff: 2000, maxBackoff: 120000 }
            );
            
            // Braintrust API returns { events: [...], cursor: "..." }
            if (response && response.events && response.events.length > 0) {
                totalFetched += response.events.length;
                
                if (onProgress) {
                    onProgress(totalFetched);
                }
                
                // Yield batch of events
                yield response.events;
            }
            
            // Check if there's more data
            cursor = response?.cursor;
            hasMore = cursor && response.events && response.events.length > 0;
            
            // Proactive throttling: Add delay to avoid rate limits
            // Sleep only occurs if the API call succeeds and the loop continues
            // Start after first batch to prevent burst from consuming rate limit
            if (hasMore && totalFetched >= 1000) {
                await sleep(3000); // 3 second delay with buffer for timing drift
            }
        }
    } catch (error) {
        console.error(`Error fetching records for experiment ${experimentId}:`, error.message);
        throw error;
    }
}

/**
 * Fetch all records from an experiment using pagination (legacy, loads all into memory)
 * API: POST /v1/experiment/{experiment_id}/fetch
 * Returns: { events: Event[], cursor: string }
 */
export async function fetchExperimentRecords(apiKey, experimentId) {
    const allEvents = [];
    
    try {
        for await (const batch of fetchExperimentRecordsWithPagination(apiKey, experimentId)) {
            allEvents.push(...batch);
        }
        return allEvents;
    } catch (error) {
        console.error(`Error fetching records for experiment ${experimentId}:`, error.message);
        throw error;
    }
}

/**
 * Fetch all records from a dataset using pagination with streaming support
 * API: POST /v1/dataset/{dataset_id}/fetch
 * Yields batches of records for memory-efficient processing
 * @param {string} apiKey - Braintrust API key
 * @param {string} datasetId - Dataset ID
 * @param {Function} [onProgress] - Optional progress callback
 * @returns {AsyncGenerator} Yields batches of records
 */
export async function* fetchDatasetRecordsWithPagination(apiKey, datasetId, onProgress) {
    let cursor = null;
    let hasMore = true;
    let totalFetched = 0;
    let lastLoggedCount = 0;
    
    try {
        while (hasMore) {
            const requestBody = {
                limit: 1000, // Records per request
            };
            
            if (cursor) {
                requestBody.cursor = cursor;
            }
            
            // Log progress before each API call if we have new records to show
            // This ensures progress is visible before any rate limit pause
            if (totalFetched > 0 && totalFetched !== lastLoggedCount) {
                console.log(`  → Fetched ${totalFetched} records...`);
                lastLoggedCount = totalFetched;
            }
            
            // Wrap API call with retry logic
            const response = await withRetry(
                () => makePostRequest(`dataset/${datasetId}/fetch`, apiKey, requestBody),
                { maxRetries: 4, initialBackoff: 2000, maxBackoff: 120000 }
            );
            
            // Braintrust API returns { events: [...], cursor: "..." } for datasets too
            const records = response?.events || response?.records || [];
            
            if (records.length > 0) {
                totalFetched += records.length;
                
                if (onProgress) {
                    onProgress(totalFetched);
                }
                
                // Yield batch of records
                yield records;
            }
            
            // Check if there's more data
            cursor = response?.cursor;
            hasMore = cursor && records.length > 0;
            
            // Proactive throttling: Add delay to avoid rate limits
            // Start after first batch to prevent burst from consuming rate limit
            if (hasMore && totalFetched >= 1000) {
                await sleep(3000); // 3 second delay with buffer for timing drift
            }
        }
    } catch (error) {
        console.error(`Error fetching records for dataset ${datasetId}:`, error.message);
        throw error;
    }
}

/**
 * Fetch all records from a dataset (legacy, loads all into memory)
 * API: POST /v1/dataset/{dataset_id}/fetch
 * Returns: Array of records
 */
export async function fetchDatasetRecords(apiKey, datasetId) {
    const allRecords = [];
    
    try {
        for await (const batch of fetchDatasetRecordsWithPagination(apiKey, datasetId)) {
            allRecords.push(...batch);
        }
        return allRecords;
    } catch (error) {
        console.error(`Error fetching records for dataset ${datasetId}:`, error.message);
        throw error;
    }
}

/**
 * Stream records to CSV file without loading all into memory
 * Handles large datasets efficiently (e.g., 250k+ rows)
 * 
 * Uses adaptive streaming with schema drift detection:
 * - Buffers first 1000 records to extract comprehensive headers
 * - Monitors for schema changes during streaming
 * - Warns user if new fields appear after initial sample
 * 
 * @param {Array|AsyncIterator} records - Records to export (array or async iterator)
 * @param {string} filePath - Output file path
 * @param {Function} [onProgress] - Optional callback for progress updates
 * @returns {Object} Object with recordCount, hadTruncation, and schemaDriftDetected flags
 */
async function streamCSVToFile(records, filePath, onProgress) {
    const INITIAL_BUFFER_SIZE = 1000;
    const buffer = [];
    let recordCount = 0;
    let headers = null;
    let hadTruncation = false;
    let schemaDriftDetected = false;
    let isBuffering = true;
    
    try {
        // Check if records is an async iterator or array
        const isAsyncIterable = records[Symbol.asyncIterator];
        const recordsToProcess = isAsyncIterable ? records : [records];
        
        for await (const batch of recordsToProcess) {
            // Handle both single records and batches
            const recordsArray = Array.isArray(batch) ? batch : [batch];
            
            if (recordsArray.length === 0) continue;
            
            // Phase 1: Buffer initial records to extract comprehensive headers
            if (isBuffering) {
                buffer.push(...recordsArray);
                
                // Once we have enough samples, extract headers and write initial batch
                if (buffer.length >= INITIAL_BUFFER_SIZE) {
                    // Flatten all buffered records
                    const flattenedBuffer = buffer.map(item => {
                        const flattened = flattenObject(item);
                        // Check if any field was truncated
                        for (const value of Object.values(flattened)) {
                            if (typeof value === 'string' && 
                                (value.includes('truncated for export') || 
                                 value.includes('Error serializing'))) {
                                hadTruncation = true;
                            }
                        }
                        return flattened;
                    });
                    
                    // Extract all unique headers from the buffer
                    const headerSet = new Set();
                    flattenedBuffer.forEach(record => {
                        Object.keys(record).forEach(key => headerSet.add(key));
                    });
                    headers = Array.from(headerSet).sort(); // Sort for consistency
                    
                    // Write initial batch with comprehensive headers
                    const parser = new Parser({ fields: headers });
                    const csv = parser.parse(flattenedBuffer);
                    fs.writeFileSync(filePath, csv, 'utf8');
                    
                    recordCount = flattenedBuffer.length;
                    isBuffering = false;
                    buffer.splice(0); // Clear buffer to free memory
                    
                    if (onProgress) {
                        onProgress(recordCount);
                    }
                }
                continue;
            }
            
            // Phase 2: Stream remaining records with schema drift detection
            const flattenedRecords = recordsArray.map(item => {
                const flattened = flattenObject(item);
                // Check if any field was truncated
                for (const value of Object.values(flattened)) {
                    if (typeof value === 'string' && 
                        (value.includes('truncated for export') || 
                         value.includes('Error serializing'))) {
                        hadTruncation = true;
                    }
                }
                return flattened;
            });
            
            // Detect if new fields appeared that weren't in our initial sample
            const newFields = [];
            flattenedRecords.forEach(record => {
                Object.keys(record).forEach(key => {
                    if (!headers.includes(key) && !newFields.includes(key)) {
                        newFields.push(key);
                    }
                });
            });
            
            // Warn user if schema drift detected
            if (newFields.length > 0 && !schemaDriftDetected) {
                schemaDriftDetected = true;
                console.log('');
                console.log(`  ⚠ Schema drift detected: ${newFields.length} new field(s) found after initial sample`);
                console.log(`  ⚠ New fields: ${newFields.join(', ')}`);
                console.log(`  ⚠ These fields will have empty values in the CSV for consistency`);
                console.log(`  ⚠ Consider using a smaller dataset or re-fetching if all fields are critical`);
                console.log('');
            }
            
            // Append records with existing headers (new fields will be omitted)
            const parser = new Parser({ header: false, fields: headers });
            const csv = parser.parse(flattenedRecords);
            fs.appendFileSync(filePath, '\n' + csv, 'utf8');
            
            recordCount += flattenedRecords.length;
            
            if (onProgress) {
                onProgress(recordCount);
            }
        }
        
        // Handle case where we buffered records but never reached INITIAL_BUFFER_SIZE
        if (isBuffering && buffer.length > 0) {
            const flattenedBuffer = buffer.map(item => flattenObject(item));
            
            // Extract headers from what we have
            const headerSet = new Set();
            flattenedBuffer.forEach(record => {
                Object.keys(record).forEach(key => headerSet.add(key));
            });
            headers = Array.from(headerSet).sort();
            
            // Write all buffered records
            const parser = new Parser({ fields: headers });
            const csv = parser.parse(flattenedBuffer);
            fs.writeFileSync(filePath, csv, 'utf8');
            
            recordCount = flattenedBuffer.length;
        }
        
        if (recordCount === 0) {
            console.log(`No data to export to ${filePath}`);
        } else {
            console.log(`✓ Exported ${recordCount} records to ${filePath}`);
            if (hadTruncation) {
                console.log(`  ⚠ Note: Some large array fields were truncated (embeddings, tokens, etc.)`);
            }
            if (schemaDriftDetected) {
                console.log(`  ⚠ Note: Schema drift was detected - some fields may be incomplete`);
            }
        }
        
        return { recordCount, hadTruncation, schemaDriftDetected };
    } catch (error) {
        console.error(`Error streaming CSV to ${filePath}:`, error.message);
        throw error;
    }
}

/**
 * Convert data to CSV and save to file (legacy method for backward compatibility)
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
 * Handles large arrays and complex data structures safely
 */
function flattenObject(obj, prefix = '', result = {}) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                flattenObject(obj[key], newKey, result);
            } else if (Array.isArray(obj[key])) {
                try {
                    // Limit array stringification to prevent memory issues
                    // Large arrays (e.g., embeddings, tokens) can cause "Invalid array length" errors
                    if (obj[key].length > 1000) {
                        result[newKey] = `[Array with ${obj[key].length} items - truncated for export]`;
                    } else {
                        const stringified = JSON.stringify(obj[key]);
                        // Check if stringified result is too large (>100KB)
                        if (stringified.length > 100000) {
                            result[newKey] = `[Array data too large (${Math.round(stringified.length / 1024)}KB) - truncated for export]`;
                        } else {
                            result[newKey] = stringified;
                        }
                    }
                } catch (error) {
                    // Handle JSON.stringify errors (circular references, etc.)
                    result[newKey] = `[Error serializing array: ${error.message}]`;
                    console.warn(`Warning: Could not serialize array field "${newKey}": ${error.message}`);
                }
            } else {
                result[newKey] = obj[key];
            }
        }
    }
    return result;
}

/**
 * Export all experiments and datasets to CSV files with new organized structure
 * @param {string} apiKey - Braintrust API key
 * @param {string} projectNameOrId - Project name or ID
 * @param {string} outputDir - Output directory for exports
 * @param {boolean} isId - If true, treat projectNameOrId as an ID (skip lookup)
 * @param {string} projectName - Optional project name for folder creation (used when isId is true)
 */
export async function exportProjectData(apiKey, projectNameOrId, outputDir = './exports', isId = false, projectName = null) {
    try {
        // Use provided project name for display and folder creation, or fall back to projectNameOrId
        const displayName = projectName || projectNameOrId;
        console.log(`\nPreparing export for project: ${displayName}...`);
        
        // Fetch experiments and datasets with isId flag (validate project exists first)
        const experiments = await fetchExperiments(apiKey, projectNameOrId, isId);
        const datasets = await fetchDatasets(apiKey, projectNameOrId, isId);

        console.log(`\nFound ${experiments.length} experiment(s) and ${datasets.length} dataset(s)\n`);

        // Only create directories if we have data to export
        if (experiments.length === 0 && datasets.length === 0) {
            console.log('No data to export. Skipping directory creation.');
            return;
        }

        // Create organized directory structure using project name (not ID)
        const { projectDir, datasetsDir, experimentsDir } = createProjectDirectories(outputDir, displayName);
        console.log(`Created directory structure: ${projectDir}`);

        // Export each experiment using streaming
        let experimentCount = 0;
        for (const experiment of experiments) {
            try {
                experimentCount++;
                const safeName = sanitizeFilename(experiment.name || experiment.id, experiment.id);
                const filePath = path.join(experimentsDir, `${safeName}.csv`);
                
                console.log(`[${experimentCount}/${experiments.length}] Exporting experiment: ${experiment.name || experiment.id}...`);
                
                // Use streaming for efficient memory usage
                // Note: Progress logging is handled within fetchExperimentRecordsWithPagination
                const recordIterator = fetchExperimentRecordsWithPagination(apiKey, experiment.id);
                
                await streamCSVToFile(recordIterator, filePath);
            } catch (error) {
                console.error(`✗ Failed to export experiment ${experiment.name || experiment.id}:`, error.message);
            }
        }

        // Export each dataset using streaming
        let datasetCount = 0;
        for (const dataset of datasets) {
            try {
                datasetCount++;
                const safeName = sanitizeFilename(dataset.name || dataset.id, dataset.id);
                const filePath = path.join(datasetsDir, `${safeName}.csv`);
                
                console.log(`[${datasetCount}/${datasets.length}] Exporting dataset: ${dataset.name || dataset.id}...`);
                
                // Use streaming for efficient memory usage
                // Note: Progress logging is handled within fetchDatasetRecordsWithPagination
                const recordIterator = fetchDatasetRecordsWithPagination(apiKey, dataset.id);
                
                await streamCSVToFile(recordIterator, filePath);
            } catch (error) {
                console.error(`✗ Failed to export dataset ${dataset.name || dataset.id}:`, error.message);
            }
        }

        console.log(`\n✓ Export complete!`);
        console.log(`  Project folder: ${projectDir}`);
        console.log(`  Experiments: ${experimentsDir}`);
        console.log(`  Datasets: ${datasetsDir}`);
    } catch (error) {
        console.error('Error exporting project data:', error.message);
        throw error;
    }
}

/**
 * Sanitize filename to remove invalid characters and ensure uniqueness
 * @param {string} name - The name to sanitize
 * @param {string} [id] - Optional ID to append for uniqueness
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(name, id = null) {
    // Replace non-alphanumeric characters with underscores
    let sanitized = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // Collapse consecutive underscores and trim leading/trailing underscores
    sanitized = sanitized.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    
    // If sanitized name is empty or only underscores, use fallback
    if (!sanitized || sanitized === '' || /^_*$/.test(sanitized)) {
        sanitized = id ? id.substring(0, 8) : 'unnamed';
    }
    
    // Append first 8 characters of ID to ensure uniqueness
    if (id) {
        const idSuffix = id.substring(0, 8);
        return `${sanitized}_${idSuffix}`;
    }
    return sanitized;
}
