/**
 * Rate limiting and retry utility for Braintrust API calls
 * Handles 429 responses with exponential backoff and Retry-After header support
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} maxRetries - Maximum retry attempts (default: 5)
 * @property {number} initialBackoff - Starting backoff delay in ms (default: 500)
 * @property {number} maxBackoff - Maximum backoff delay in ms (default: 30000)
 */

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sleep with progress updates for long waits
 * Displays progress messages every 10 seconds to keep user informed
 * @param {number} ms - Milliseconds to sleep
 * @param {string} context - Context message (e.g., "Rate limited")
 * @returns {Promise<void>}
 */
export async function sleepWithProgress(ms, context = "Waiting") {
    const seconds = Math.round(ms / 1000);
    const updateInterval = 10000; // Update every 10 seconds
    
    // If wait is short (< 10s), just sleep normally
    if (ms < updateInterval) {
        await sleep(ms);
        return;
    }
    
    const startTime = Date.now();
    let elapsed = 0;
    
    // Display initial message
    console.log(`⏳ ${context}. Waiting ${seconds} seconds before retry...`);
    
    // Update progress every 10 seconds
    while (elapsed < ms) {
        const remainingMs = ms - elapsed;
        const waitTime = Math.min(updateInterval, remainingMs);
        
        await sleep(waitTime);
        elapsed = Date.now() - startTime;
        
        // Show progress if we're not done yet
        if (elapsed < ms) {
            const remainingSeconds = Math.round((ms - elapsed) / 1000);
            console.log(`  ⏳ Still waiting... ${remainingSeconds} seconds remaining`);
        }
    }
    
    console.log(`  ✓ Wait complete, retrying now...`);
}

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @param {number} initialBackoff - Initial backoff delay in ms
 * @param {number} maxBackoff - Maximum backoff delay in ms
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attemptNumber, initialBackoff, maxBackoff) {
    // Exponential: 2^attempt * initialBackoff
    const exponentialDelay = Math.pow(2, attemptNumber) * initialBackoff;
    
    // Cap at maxBackoff
    const cappedDelay = Math.min(exponentialDelay, maxBackoff);
    
    // Add jitter (random 0-25% variation) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * Math.random();
    
    return Math.floor(cappedDelay + jitter);
}

/**
 * Wrap an API call with retry logic and exponential backoff
 * Automatically handles 429 rate limit responses
 * 
 * @param {Function} apiCall - Async function that makes the API call
 * @param {RateLimitConfig} [config] - Configuration for retry behavior
 * @returns {Promise<any>} Result of the API call
 * @throws {Error} After max retries exhausted or non-retryable error
 */
export async function withRetry(apiCall, config = {}) {
    const {
        maxRetries = 5,
        initialBackoff = 500,
        maxBackoff = 30000
    } = config;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Execute the API call
            return await apiCall();
        } catch (error) {
            lastError = error;

            // Check if this is a rate limit error (429)
            const isRateLimitError = error.response?.status === 429;
            
            // Check if we should retry
            const shouldRetry = isRateLimitError || 
                               error.response?.status >= 500 || // Server errors
                               error.code === 'ECONNRESET' ||   // Connection reset
                               error.code === 'ETIMEDOUT';      // Timeout

            if (!shouldRetry || attempt === maxRetries) {
                // Don't retry or max retries reached
                throw error;
            }

            // Calculate backoff delay
            let backoffDelay;
            let useRetryAfter = false;
            
            if (isRateLimitError && error.response?.headers?.['retry-after']) {
                // Parse Retry-After header (can be decimal seconds like "0.294" or integer like "45")
                const retryAfterValue = error.response.headers['retry-after'];
                const retryAfter = parseFloat(retryAfterValue);
                
                // Validate: must be a valid number > 0
                if (!isNaN(retryAfter) && retryAfter > 0) {
                    backoffDelay = Math.ceil(retryAfter * 1000); // Convert to milliseconds, round up
                    useRetryAfter = true;
                } else {
                    // Invalid Retry-After header, silently fall back to exponential backoff
                    backoffDelay = calculateBackoff(attempt, initialBackoff, maxBackoff);
                }
            } else {
                // Use exponential backoff
                backoffDelay = calculateBackoff(attempt, initialBackoff, maxBackoff);
            }

            // Wait before retrying with progress updates
            if (useRetryAfter) {
                await sleepWithProgress(backoffDelay, "Rate limited");
            } else {
                const backoffSeconds = (backoffDelay / 1000).toFixed(1);
                if (backoffDelay >= 10000) {
                    // Long wait: use progress updates
                    await sleepWithProgress(backoffDelay, `Request failed (attempt ${attempt + 1}/${maxRetries + 1})`);
                } else {
                    // Short wait: simple message
                    console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${backoffSeconds}s...`);
                    await sleep(backoffDelay);
                }
            }
        }
    }

    // Should never reach here, but just in case
    throw lastError;
}
