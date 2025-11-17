import fs from 'fs';
import 'dotenv/config'
import chalk from 'chalk';
import { selectMenu, inputMenu } from "./inquirer/inquirer-utils.js";
import { getMenuConfig } from "./inquirer/inquirer-config.js";
import { getApiKey, verifyApiKey } from "./braintrust/utils.js";
import { listProjects, exportProjectData, getProjectById, validateProjectId } from "./braintrust/api.js";

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
                let apiKey;
                
                // Check if an API key already exists
                if (process.env.BRAINTRUST_API_KEY && process.env.BRAINTRUST_API_KEY !== "undefined") {
                    // Show confirmation menu without displaying the key
                    const confirmConfig = {
                        message: "What would you like to do?",
                        choices: [
                            {
                                name: "Keep Current Key",
                                value: "keepKey",
                                description: "Continue using the existing API key"
                            },
                            {
                                name: "Update API Key",
                                value: "updateKey",
                                description: "Enter a new API key"
                            }
                        ]
                    };
                    
                    const confirmation = await selectMenu(confirmConfig);
                    
                    if (confirmation === "keepKey") {
                        console.log(chalk.green("\n✓ Keeping existing API key\n"));
                        break;
                    }
                    
                    // User chose to update - force prompt for new key
                    apiKey = await getApiKey(true);
                } else {
                    // No existing key - prompt normally
                    apiKey = await getApiKey();
                }
                
                // Verify the API key
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
                
                // Step 1: Ask for selection method
                const methodConfig = await getMenuConfig("selectProjectMethod");
                const selectionMethod = await selectMenu(methodConfig);
                
                if (selectionMethod === "back") {
                    break;
                }
                
                if (selectionMethod === "selectByList") {
                    // Step 2a: Select from paginated list
                    console.log(chalk.blue("\nFetching projects...\n"));
                    const projects = await listProjects(process.env.BRAINTRUST_API_KEY);
                    
                    if (!projects || projects.length === 0) {
                        console.log(chalk.yellow("\nNo projects found.\n"));
                        break;
                    }
                    
                    const projectMenuConfig = await getMenuConfig("selectProject", projects);
                    const chosenProjectJson = await selectMenu(projectMenuConfig);
                    
                    if (chosenProjectJson === "back") {
                        break;
                    }
                    
                    // Parse the JSON to get both name and ID
                    const projectData = JSON.parse(chosenProjectJson);
                    
                    // Store both name and ID
                    process.env.BRAINTRUST_PROJECT_NAME = projectData.name;
                    process.env.BRAINTRUST_PROJECT_ID = projectData.id;
                    
                    console.log(chalk.green(`\n✓ Selected project: ${projectData.name}`));
                    console.log(chalk.gray(`  Project ID: ${projectData.id}\n`));
                    
                } else if (selectionMethod === "selectById") {
                    // Step 2b: Enter project ID directly
                    let validProject = null;
                    let retryCount = 0;
                    const maxRetries = 3;
                    
                    while (!validProject && retryCount < maxRetries) {
                        const projectId = await inputMenu("Enter Project ID: ");
                        
                        if (!projectId || projectId.trim() === "") {
                            console.log(chalk.yellow("\nProject ID cannot be empty. Please try again.\n"));
                            retryCount++;
                            continue;
                        }
                        
                        console.log(chalk.blue("\nValidating project ID...\n"));
                        
                        const isValid = await validateProjectId(process.env.BRAINTRUST_API_KEY, projectId.trim());
                        
                        if (isValid) {
                            // Fetch the full project details
                            const project = await getProjectById(process.env.BRAINTRUST_API_KEY, projectId.trim());
                            
                            // Store both name and ID
                            process.env.BRAINTRUST_PROJECT_NAME = project.name;
                            process.env.BRAINTRUST_PROJECT_ID = project.id;
                            
                            console.log(chalk.green(`\n✓ Selected project: ${project.name}`));
                            console.log(chalk.gray(`  Project ID: ${project.id}\n`));
                            
                            validProject = project;
                        } else {
                            console.log(chalk.red(`\n✗ Project ID "${projectId.trim()}" not found.\n`));
                            retryCount++;
                            
                            if (retryCount < maxRetries) {
                                console.log(chalk.yellow(`You have ${maxRetries - retryCount} attempt(s) remaining.\n`));
                            } else {
                                console.log(chalk.yellow("Maximum retry attempts reached. Returning to main menu.\n"));
                            }
                        }
                    }
                }
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
                
                console.log(chalk.blue(`\n========================================`));
                console.log(chalk.blue(`  Exporting Project: ${process.env.BRAINTRUST_PROJECT_NAME}`));
                console.log(chalk.blue(`========================================`));
                console.log(chalk.gray(`Output: ${outputDir}/<project>/<datasets|experiments>/`));
                console.log(chalk.gray(`This creates an organized folder structure for your exports.\n`));
                
                // Use project ID if available (faster), otherwise use name (backward compatibility)
                const useProjectId = process.env.BRAINTRUST_PROJECT_ID && process.env.BRAINTRUST_PROJECT_ID !== "undefined";
                const projectIdentifier = useProjectId ? process.env.BRAINTRUST_PROJECT_ID : process.env.BRAINTRUST_PROJECT_NAME;
                
                await exportProjectData(
                    process.env.BRAINTRUST_API_KEY,
                    projectIdentifier,
                    outputDir,
                    useProjectId,
                    process.env.BRAINTRUST_PROJECT_NAME  // Pass project name for folder creation
                );
                
                console.log(chalk.green("\n========================================"));
                console.log(chalk.green("  ✓ Export completed successfully!"));
                console.log(chalk.green("========================================"));
                console.log(chalk.gray("Files are organized by project with separate folders"));
                console.log(chalk.gray("for datasets and experiments.\n"));
            } catch (error) {
                console.log(chalk.red(`\n✗ Error: ${error.message}\n`));
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
