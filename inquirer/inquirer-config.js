import { Separator } from "@inquirer/prompts";
import chalk from "chalk";


let mainMenuConfig = {
    message: "Select an option",
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
                    value: projects[i].name || projects[i].id,
                    description: projects[i].id || "Project"
                });
            }
            choices.push(new Separator(theme.decorator(" =") + theme.style.separator(" Navigation Actions ") + theme.decorator("= ")));
            choices.push({
                name: "Back",
                value: "back",
                description: "Return to main menu"
            });
            return {
                message: "Select a project",
                choices: choices,
            }
        default:
            break;
    }
}

const inquirerConfigs = {
    mainMenuConfig,
}

export default inquirerConfigs;
