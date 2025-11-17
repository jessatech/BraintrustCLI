import fs from 'fs';
import 'dotenv/config'
import chalk from 'chalk';
import { selectMenu, inputMenu } from "./inquirer/inquirer-utils.js";
import { getMenuConfig } from "./inquirer/inquirer-config.js";
import { getApiKey, verifyApiKey } from "./braintrust/utils.js";
import { listProjects, exportProjectData } from "./braintrust/api.js";

let menu = "main"
let menuChoice = "";

console.log(chalk.blue("Braintrust CLI"));
console.log(chalk.gray("Loading...\n"));

// Check for API key on startup
if(!process.env.BRAINTRUST_API_KEY || process.env.BRAINTRUST_API_KEY === "undefined") {
    console.log(chalk.yellow("No API key found. You'll be prompted to enter one when needed.\n"));
} else {
    console.log(chalk.green("API key found in environment\n"));
}

while(menuChoice !== "exit") {
    let menuConfig = await getMenuConfig(menu);
    menuChoice = await selectMenu(menuConfig);
    
    switch (menuChoice) {
        case "login":
            try {
                const apiKey = await getApiKey();
                const isValid = await verifyApiKey(apiKey);
                
                if (isValid) {
                    process.env.BRAINTRUST_API_KEY = apiKey;
                    console.log(chalk.green("\n✓ API key verified and saved\n"));
                } else {
                    console.log(chalk.red("\n✗ Invalid API key. Please try again.\n"));
                }
            } catch (error) {
                console.log(chalk.red(`\nError: ${error.message}\n`));
            }
            break;
            
        case "selectProject":
            try {
                if (!process.env.BRAINTRUST_API_KEY || process.env.BRAINTRUST_API_KEY === "undefined") {
                    console.log(chalk.yellow("\nPlease login first to set your API key.\n"));
                    break;
                }
                
                console.log(chalk.blue("\nFetching projects...\n"));
                const projects = await listProjects(process.env.BRAINTRUST_API_KEY);
                
                if (!projects || projects.length === 0) {
                    console.log(chalk.yellow("\nNo projects found.\n"));
                    break;
                }
                
                menuConfig = await getMenuConfig("selectProject", projects);
                let chosenProject = await selectMenu(menuConfig);
                
                if (chosenProject === "back") {
                    break;
                }
                
                process.env.BRAINTRUST_PROJECT_NAME = chosenProject;
                console.log(chalk.green(`\n✓ Selected project: ${chosenProject}\n`));
            } catch (error) {
                console.log(chalk.red(`\nError: ${error.message}\n`));
            }
            break;
            
        case "exportData":
            try {
                if (!process.env.BRAINTRUST_API_KEY || process.env.BRAINTRUST_API_KEY === "undefined") {
                    console.log(chalk.yellow("\nPlease login first to set your API key.\n"));
                    break;
                }
                
                if (!process.env.BRAINTRUST_PROJECT_NAME || process.env.BRAINTRUST_PROJECT_NAME === "undefined") {
                    console.log(chalk.yellow("\nPlease select a project first.\n"));
                    break;
                }
                
                const outputDir = await inputMenu("Enter output directory (default: ./exports): ") || "./exports";
                
                console.log(chalk.blue(`\nExporting data for project: ${process.env.BRAINTRUST_PROJECT_NAME}`));
                console.log(chalk.blue(`Output directory: ${outputDir}\n`));
                
                await exportProjectData(
                    process.env.BRAINTRUST_API_KEY,
                    process.env.BRAINTRUST_PROJECT_NAME,
                    outputDir
                );
                
                console.log(chalk.green("\n✓ Export completed successfully!\n"));
            } catch (error) {
                console.log(chalk.red(`\nError: ${error.message}\n`));
            }
            break;
            
        case "exit":
            console.log(chalk.blue("\nGoodbye!\n"));
            menuChoice = "exit"
            break;
            
        default:
            break;
    }
}
