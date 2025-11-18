import { Separator } from "@inquirer/prompts";
import chalk from "chalk";

const motdMessage = chalk.cyanBright(
    "Welcome to Braintrust CLI, a tool for exporting experiments and datasets!"
);

let mainMenuConfig = {
    message: `${motdMessage}\n\nSelect an option`,
    choices: []
}

const theme = {
    style: {
        separator: (text) => chalk.green(text),
    },
    decorator: (text) => chalk.yellow(text),
}

export async function getMenuConfig(menu, apiResponse = "None") {
    switch (menu) {
        case "main":
            if(!process.env.BRAINTRUST_API_KEY || process.env.BRAINTRUST_API_KEY === "undefined"){
                mainMenuConfig.choices = [
                    new Separator(theme.decorator(" =") + theme.style.separator(" Braintrust CLI ") + theme.decorator("= ")),
                    {
                        name: "Login",
                        value: "login",
                        description: "Enter your Braintrust API Key"
                    },
                    {
                        name: "Exit",
                        value: "exit",
                        description: "Exit CLI"
                    }
                ]
            } else if (!process.env.BRAINTRUST_PROJECT_NAME || process.env.BRAINTRUST_PROJECT_NAME === "undefined") {
                mainMenuConfig.choices = [
                    new Separator(theme.decorator(" =") + theme.style.separator(" Braintrust CLI ") + theme.decorator("= ")),
                    {
                        name: "Login / Update API Key",
                        value: "login",
                        description: "Enter or update your Braintrust API Key"
                    },
                    {
                        name: "Select Project",
                        value: "selectProject",
                        description: "Select a project to work with"
                    },
                    {
                        name: "Exit",
                        value: "exit",
                        description: "Exit CLI"
                    }
                ]
            } else {
                // Display current project in header when one is selected
                const projectDisplay = process.env.BRAINTRUST_PROJECT_NAME && process.env.BRAINTRUST_PROJECT_NAME !== "undefined" 
                    ? ` Braintrust CLI | Project: ${process.env.BRAINTRUST_PROJECT_NAME} `
                    : " Braintrust CLI ";
                mainMenuConfig.choices = [
                    new Separator(theme.decorator(" =") + theme.style.separator(projectDisplay) + theme.decorator("= ")),
                    {
                        name: "Login / Update API Key",
                        value: "login",
                        description: "Enter or update your Braintrust API Key"
                    },
                    {
                        name: "Select Project",
                        value: "selectProject",
                        description: "Select a project to work with"
                    },
                    {
                        name: "Export Project Data",
                        value: "exportData",
                        description: "Export all experiments and datasets to CSV files"
                    },
                    {
                        name: "Exit",
                        value: "exit",
                        description: "Exit CLI"
                    }
                ]
            }
            return mainMenuConfig;
        case "selectProjectMethod":
            return {
                message: "How would you like to select a project?",
                choices: [
                    new Separator(theme.decorator(" =") + theme.style.separator(" Selection Method ") + theme.decorator("= ")),
                    {
                        name: "Select from List",
                        value: "selectByList",
                        description: "Browse and select from a paginated list of projects"
                    },
                    {
                        name: "Enter Project ID",
                        value: "selectById",
                        description: "Enter a project ID directly if you know it"
                    },
                    new Separator(theme.decorator(" =") + theme.style.separator(" Navigation Actions ") + theme.decorator("= ")),
                    {
                        name: "Back",
                        value: "back",
                        description: "Return to main menu"
                    }
                ]
            };
        case "selectProject":
            let projects = {};
            if(apiResponse !== "None" && Array.isArray(apiResponse)){
                projects = apiResponse;
            }
            let choices = [
                new Separator(theme.decorator(" =") + theme.style.separator(" Projects ") + theme.decorator("= ")),
            ];
            for (let i = 0; i < projects.length; i++) {
                choices.push({
                    name: projects[i].name || projects[i].id,
                    value: JSON.stringify({ name: projects[i].name, id: projects[i].id }),
                    description: `ID: ${projects[i].id}`
                });
            }
            choices.push(new Separator(theme.decorator(" =") + theme.style.separator(" Navigation Actions ") + theme.decorator("= ")));
            choices.push({
                name: "Back",
                value: "back",
                description: "Return to selection method menu"
            });
            return {
                message: "Select a project",
                choices: choices,
                pageSize: Math.min(choices.length, 15)
            }
        default:
            break;
    }
}

const inquirerConfigs = {
    mainMenuConfig,
}

export default inquirerConfigs;
