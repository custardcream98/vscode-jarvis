import {
  askToJarvis,
  getFileTreeSummary,
  getProjectShortExplanation,
  getReadmeSummery,
} from "./completion/completion";
import { getFilesToIgnore } from "./data/file";
import { getProjectFileTree } from "./data/fileTree";
import type { AskToJarvis } from "./share/type";
import { SidebarProvider } from "./view/sidebar";

import OpenAI from "openai";
import * as vscode from "vscode";

const EXTENSION_NAME = "jarvis";

const setupSidebar = (
  context: vscode.ExtensionContext,
  openai: OpenAI,
  targetDirectory: string,
) => {
  const sidebarProvider = new SidebarProvider(context.extensionUri, openai, targetDirectory);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("jarvis-sidebar", sidebarProvider),
  );

  return sidebarProvider;
};

const setupProject = async (openai: OpenAI, targetDirectory: string) => {
  const readmeSummary = await getReadmeSummery(openai, targetDirectory);

  const filesToIgnore = getFilesToIgnore(targetDirectory);

  const fileTree = getProjectFileTree(targetDirectory, filesToIgnore);

  const fileTreeSummary = await getFileTreeSummary(openai, fileTree);

  const projectShortExplanation = await getProjectShortExplanation(
    openai,
    readmeSummary,
    fileTreeSummary.join("\n"),
  );

  return {
    fileTree,
    fileTreeSummary,
    projectShortExplanation,
  };
};

const setupJarvis = (
  context: vscode.ExtensionContext,
  currentWorkspaceRoot: string,
  openAiApiKey: string,
) => {
  const openai = new OpenAI({
    apiKey: openAiApiKey,
  });

  const TARGET_DIRECTORY = currentWorkspaceRoot;

  const sidebarProvider = setupSidebar(context, openai, TARGET_DIRECTORY);

  vscode.window.withProgress(
    {
      cancellable: false,
      location: vscode.ProgressLocation.Notification,
      title: "Jarvis: Setting up",
    },
    async (progress) => {
      progress.report({ increment: 0 });

      progress.report({
        increment: 10,
        message: "Jarvis: Reading Project...",
      });

      const { fileTree, fileTreeSummary, projectShortExplanation } = await setupProject(
        openai,
        TARGET_DIRECTORY,
      );

      vscode.window.showInformationMessage(
        "Jarvis: Jarvis is Ready To Answer Questions.\n\nAsk a question by pressing Ctrl+Shift+P and typing 'Jarvis: Ask a Question'\n\n" +
          projectShortExplanation,
      );

      sidebarProvider.setupProject({
        fileTree,
        fileTreeSummary,
        projectShortExplanation,
      });

      progress.report({ increment: 100 });

      let askToJarvisCommand = vscode.commands.registerCommand(
        EXTENSION_NAME + ".askToJarvis",
        async () => {
          const question = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "What is the purpose of this project?",
            prompt: "Ask a Question",
          });

          if (!question) {
            return;
          }

          const answer = await askToJarvis(openai, TARGET_DIRECTORY, {
            fileTree,
            projectShortExplanation,
            question,
          });

          vscode.window.showInformationMessage("Jarvis: " + answer);
        },
      );

      context.subscriptions.push(askToJarvisCommand);
    },
  );
};

export async function activate(context: vscode.ExtensionContext) {
  let restartServer = vscode.commands.registerCommand(EXTENSION_NAME + ".restartServer", () => {
    vscode.commands.executeCommand("workbench.action.reloadWindow");
  });

  context.subscriptions.push(restartServer);

  const openAiApiKey = vscode.workspace.getConfiguration(EXTENSION_NAME).get("Open_AI_Api_Key");

  if (!openAiApiKey || typeof openAiApiKey !== "string") {
    vscode.window.showErrorMessage("Jarvis: OpenAI API Key is not set. Please set it in settings.");

    return;
  }

  const currentWorkspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

  if (!currentWorkspaceRoot) {
    vscode.window.showErrorMessage("Jarvis: No workspace is open.");

    return;
  }

  setupJarvis(context, currentWorkspaceRoot, openAiApiKey);
}

export function deactivate() {}
