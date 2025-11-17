# Braintrust CLI

A CLI tool for exporting experiments and datasets from Braintrust to CSV files. This tool helps you download all experiments and datasets from a Braintrust project for analysis, debugging, or backup purposes.

### Warning
This is a work in progress, things will be unfinished and may be broken while under development.

## App Setup

1. Locally clone the repo to your desired dev folder: `git clone <repository-url>`
2. Open cloned app folder in VS Code
3. In a terminal in VS Code you will need to install required packages via npm: `npm install`
4. You will then need to set up your Braintrust API key. More instructions below.
   * For more on dotenv check: https://www.npmjs.com/package/dotenv

## Braintrust API Key Setup

The CLI supports multiple ways to provide your Braintrust API key:

### Option 1: Environment Variable
Set the `BRAINTRUST_API_KEY` environment variable:
```bash
export BRAINTRUST_API_KEY="your_api_key_here"
```

### Option 2: .env File
Create a `.env` file in the root of the app and add:
```
BRAINTRUST_API_KEY=your_api_key_here
```

### Option 3: Interactive Prompt
If no API key is found, the CLI will prompt you to enter it when you select the "Login" option from the main menu. You can optionally save it to your `.env` file for future use.

## Getting Your Braintrust API Key

1. Log in to your Braintrust account at https://www.braintrust.dev
2. Navigate to your account settings
3. Generate or copy your API key
4. Use one of the methods above to configure it in the CLI

## Usage

1. Run the CLI: `npm start` or `node app.js`
2. If you haven't set an API key, select "Login" from the menu
3. Select a project from your Braintrust account
4. Choose "Export Project Data" to download all experiments and datasets as CSV files
5. Files will be saved to the `./exports` directory (or a custom directory you specify)

## Features

- **API Key Management**: Supports environment variables, .env files, and interactive prompts
- **Project Selection**: Browse and select from your available Braintrust projects
- **CSV Export**: Export all experiments and datasets from a project to individual CSV files
- **Organized Output**: Each experiment and dataset is saved as a separate CSV file with sanitized filenames

## Export Format

The CLI now creates an organized folder structure for better accessibility:

```
exports/
└── <project-name>/
    ├── datasets/
    │   ├── dataset1.csv
    │   └── dataset2.csv
    └── experiments/
        ├── experiment1.csv
        └── experiment2.csv
```

### Key Features:
- **Organized Structure**: Each project gets its own folder with separate subdirectories for datasets and experiments
- **Clean Filenames**: No more `dataset_` or `experiment_` prefixes - files are named directly after the dataset/experiment
- **Streaming Export**: Large datasets (250k+ rows) are processed efficiently without loading everything into memory
- **Rate Limit Handling**: Automatic retry logic with exponential backoff handles API rate limits gracefully
- **Progress Tracking**: Real-time progress updates for long-running exports
- **Nested Objects**: All nested objects are flattened for better CSV representation

## Environment Variables

### Required
* `BRAINTRUST_API_KEY` - Your Braintrust API key (can be set via env var, .env file, or interactive prompt)

### Optional
* `BRAINTRUST_PROJECT_NAME` - The project name to work with (can be selected via menu)

## Performance & Large Data Handling

This CLI is optimized to handle enterprise-scale data:

### Large Datasets (250k+ rows)
- **Streaming CSV Writes**: Data is written incrementally to disk, not loaded entirely into memory
- **Cursor-Based Pagination**: Fetches data in batches of 1,000 records
- **Memory Efficient**: Can export datasets of any size without running out of memory

### Many Experiments (100+)
- **Sequential Processing**: Exports one experiment at a time to avoid overwhelming the API
- **Progress Tracking**: Shows real-time progress as data is fetched (updates every 5,000 records)
- **Error Resilience**: If one export fails, others continue

### Rate Limiting
- **Automatic Retry**: Handles 429 (Too Many Requests) responses automatically
- **Exponential Backoff**: Waits progressively longer between retries (0.5s, 1s, 2s, 4s...)
- **Retry-After Header**: Respects server-specified retry delays
- **Configurable**: Up to 5 retry attempts with a maximum 30-second backoff

### Tips for Best Performance
1. **Stable Connection**: Ensure stable internet for long-running exports
2. **Dedicated Session**: Run exports when API traffic is lower if possible
3. **Sequential Exports**: The tool processes exports sequentially to minimize rate limiting
4. **Monitor Progress**: Watch the progress updates to track large exports

## Troubleshooting

### "No API key found"
- Make sure you've set `BRAINTRUST_API_KEY` in your environment or `.env` file
- Or use the "Login" option from the main menu to enter it interactively

### "Project not found"
- Make sure you're using the correct project name
- Verify your API key has access to the project

### "Error fetching data"
- Check your internet connection
- Verify your API key is valid and has the necessary permissions
- Make sure the Braintrust API is accessible

### "Rate limited" or "429 errors"
- The CLI automatically retries with exponential backoff
- If you see these messages, the tool is working correctly
- The export will continue after the required wait time
- Persistent rate limiting may indicate very high concurrent usage

### "Out of memory" errors
- Should not occur with the new streaming implementation
- If you encounter this, please report it as a bug
- The tool is designed to handle datasets of any size

## Development

This CLI is built with:
- Node.js
- Inquirer for interactive CLI prompts
- Axios for API requests
- json2csv for CSV conversion
- Chalk for colored terminal output
