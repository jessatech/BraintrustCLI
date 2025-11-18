# Braintrust CLI

A command-line tool for exporting experiments and datasets from Braintrust to CSV files. Download all your project data for analysis, debugging, or backup purposes.

## Setup

1. **Install Node.js** - [Download Node.js](https://nodejs.org/) (v14 or higher)
2. **Clone the repository**
   ```bash
   git clone https://github.com/jessatech/BraintrustCLI.git
   ```
3. **Navigate to directory**
   ```bash
   cd BraintrustCLI
   ```
4. **Install dependencies**
   ```bash
   npm install
   ```
5. **Start the CLI**
   ```bash
   npm start
   ```
6. **Login with your API key** when prompted (get your key at [braintrust.dev/app/settings](https://www.braintrust.dev/app/settings?subroute=api-keys))

## 🔑 API Key Setup

The CLI supports multiple ways to provide your Braintrust API key:

### Option 1: Environment Variable (Recommended)
```bash
export BRAINTRUST_API_KEY="your_api_key_here"
```

### Option 2: .env File
Create a `.env` file in the project root:
```
BRAINTRUST_API_KEY=your_api_key_here
```

### Option 3: Interactive Prompt
If no API key is found, the CLI will prompt you to enter it. You can optionally save it to your `.env` file for future use.

### Getting Your API Key

1. Log in to [Braintrust](https://www.braintrust.dev)
2. Navigate to your account settings [API Keys](https://www.braintrust.dev/app/settings?subroute=api-keys)
3. Generate or copy your API key
4. Use one of the methods above to configure it. They app will prompt for key if not found.

## 💻 Usage

1. **Start the CLI:**
   ```bash
   npm start
   ```
   or
   ```bash
   node app.js
   ```

2. **Login** (if you haven't set an API key)

3. **Select a project** from your Braintrust account

4. **Choose "Export Project Data"** to download all experiments and datasets from your selected project.

5. **Find your files** in the `./exports` directory, or wherever specied during export

### Example Session
```
? Select an option: Export Project Data
? Select a project: My AI Project

Preparing export for project: My AI Project...
Found 3 experiment(s) and 2 dataset(s)

[1/3] Exporting experiment: baseline-test...
  → Fetched 5000 records...
  → Fetched 10000 records...
✓ Exported 12543 records

✓ Export complete!
  Project folder: exports/my_ai_project
  Experiments: exports/my_ai_project/experiments
  Datasets: exports/my_ai_project/datasets
```

## ✨ Features

- **🔐 API Key Management**: Environment variables, .env files, or interactive prompts
- **📂 Project Selection**: Browse and select from your available projects
- **📊 CSV Export**: Export experiments and datasets to individual CSV files
- **🗂️ Organized Output**: Clean folder structure with separate directories for experiments and datasets
- **⚡ Streaming Export**: Handles massive datasets (250k+ rows) efficiently
- **🔄 Rate Limit Handling**: Automatic retry with exponential backoff
- **📈 Progress Tracking**: Real-time updates during long exports
- **🎯 Proactive Throttling**: Smart pacing to avoid rate limits entirely

## 📁 Export Format

The CLI creates an organized folder structure:

```
exports/
└── my-project-name/
    ├── datasets/
    │   ├── training_data_a1b2c3d4.csv
    │   └── validation_set_e5f6g7h8.csv
    └── experiments/
        ├── baseline_test_i9j0k1l2.csv
        ├── optimized_v2_m3n4o5p6.csv
        └── production_run_q7r8s9t0.csv
```

### File Naming
- Files are named after the dataset/experiment name
- An 8-character ID suffix ensures uniqueness
- All special characters are replaced with underscores
- Names are lowercased for consistency

### Data Processing
- **Nested Objects**: Automatically flattened for CSV compatibility
- **Large Arrays**: Truncated with size information (e.g., embeddings, tokens)
- **Schema Drift**: Detected and reported if field structure changes mid-export

## ⚡ Performance & Optimization

This CLI is optimized for enterprise-scale data:

### Large Datasets (250k+ rows)
- **✅ Streaming Architecture**: Data written incrementally to disk, never fully loaded into memory
- **✅ Cursor-Based Pagination**: Fetches data in batches of 1,000 records (API maximum)
- **✅ Memory Efficient**: Can export datasets of any size without running out of memory
- **✅ Schema Sampling**: Buffers first 1,000 records to extract comprehensive headers

### Rate Limiting Strategy
- **🎯 Proactive Throttling**: 3-second delay between requests after first batch
- **🔄 Automatic Retry**: Handles 429 (Too Many Requests) with exponential backoff
- **⏱️ Smart Timing**: Respects Retry-After headers from API
- **✨ Smooth Progress**: ~20 requests/minute keeps data flowing without interruptions

### Many Experiments (100+)
- **📋 Sequential Processing**: Exports one at a time to avoid overwhelming the API
- **📊 Progress Tracking**: Updates every 1,000 records (logged every 5,000 records)
- **🛡️ Error Resilience**: If one export fails, others continue

### Performance Expectations
| Dataset Size | Estimated Time | Notes |
|-------------|----------------|-------|
| 1k records  | ~5 seconds     | No throttling |
| 10k records | ~30 seconds    | Minimal throttling |
| 50k records | ~3-4 minutes   | Full throttling active |
| 250k+ records | ~15-20 minutes | Streaming + throttling |

## 🔧 Troubleshooting

### "No API key found"
**Solution:** 
- Set `BRAINTRUST_API_KEY` in your environment or `.env` file
- Or use the "Login" option from the main menu

### "Project not found"
**Solution:**
- Verify you're using the correct project ID when selecting by ID.
- Check that your API key has access to the project
- Try selecting the project from the interactive menu instead

### "Error fetching data"
**Solution:**
- Check your internet connection
- Verify your API key is valid and has permissions
- Ensure the Braintrust API is accessible

### Rate Limiting Messages
**Behavior:**
```
⏳ Rate limited. Waiting 22 seconds...
⏳ Rate limited. Waiting 50 seconds...
```

**What this means:**
- The CLI automatically retries with exponential backoff
- This is normal behavior for very large exports but generally call spread should avoid
- The export will continue after the wait time
- Our proactive throttling minimizes these occurrences

**If persistent:**
- Very high concurrent API usage
- Consider exporting during off-peak hours
- The tool will eventually complete successfully

### "Out of memory" errors
**Should not occur** with the streaming implementation. If you encounter this:
- Please report it as a bug with dataset size information
- The tool is designed to handle datasets of any size

### Schema Drift Warnings
```
⚠ Schema drift detected: 3 new field(s) found after initial sample
⚠ New fields: metadata.version, score.confidence, tags
```

**What this means:**
- New fields appeared after the first 1,000 records
- These fields will have empty values in earlier rows
- CSV headers are locked after initial sampling for performance

**If critical:**
- Use a smaller dataset sample
- Or re-fetch the data to capture all fields

## 🛠️ Development

### Tech Stack
- **Runtime**: Node.js
- **CLI Framework**: [Inquirer.js](https://www.npmjs.com/package/inquirer) - Interactive prompts
- **HTTP Client**: [Axios](https://www.npmjs.com/package/axios) - API requests
- **CSV Generation**: [@json2csv/plainjs](https://www.npmjs.com/package/@json2csv/plainjs) - CSV conversion
- **Styling**: [Chalk](https://www.npmjs.com/package/chalk) - Colored terminal output
- **Environment**: [dotenv](https://www.npmjs.com/package/dotenv) - Environment variable management

### Project Structure
```
BraintrustCLI/
├── app.js                      # Main entry point
├── braintrust/
│   ├── api.js                  # Braintrust API client
│   ├── rate-limiter.js         # Retry & throttling logic
│   └── utils.js                # Utility functions
├── inquirer/
│   ├── inquirer-config.js      # CLI menu configuration
│   ├── inquirer-flows.js       # Interactive flows
│   └── inquirer-utils.js       # CLI helpers
└── exports/                    # Generated CSV exports
```

### Environment Variables
- `BRAINTRUST_API_KEY` (required) - Your Braintrust API key
- `BRAINTRUST_PROJECT_NAME` (optional) - Default project name

### Contributing
This is an active development project. Pull requests and issues welcome!

---

⚠️ **Note**: This project is under active development. Features and APIs may change.
