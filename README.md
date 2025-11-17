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

- Each experiment is exported to: `experiment_<name>.csv`
- Each dataset is exported to: `dataset_<name>.csv`
- Files are saved in the `./exports` directory by default (or a custom directory you specify)
- Nested objects are flattened for better CSV representation

## Environment Variables

### Required
* `BRAINTRUST_API_KEY` - Your Braintrust API key (can be set via env var, .env file, or interactive prompt)

### Optional
* `BRAINTRUST_PROJECT_NAME` - The project name to work with (can be selected via menu)

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

## Development

This CLI is built with:
- Node.js
- Inquirer for interactive CLI prompts
- Axios for API requests
- json2csv for CSV conversion
- Chalk for colored terminal output
