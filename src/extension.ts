import {
  askToJarvis,
  getFileTreeSummary,
  getProjectShortExplanation,
  getReadmeSummery,
} from "./completion/completion";
import { getFilesToIgnore } from "./data/file";
import { getProjectFileTree } from "./data/fileTree";
import { SidebarProvider } from "./view/sidebar";

import OpenAI from "openai";
import * as vscode from "vscode";

// const isDev = true;

const EXTENSION_NAME = "jarvis";

const setupSidebar = (
  context: vscode.ExtensionContext,
  openai: OpenAI,
  targetDirectory: string,
) => {
  const sidebarProvider = new SidebarProvider(context.extensionUri, openai, targetDirectory);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("jarvis-sidebar", sidebarProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );

  return sidebarProvider;
};

type ProjectState = {
  readmeSummary: string;
  fileTree: string;
  fileTreeSummary: string[];
  projectShortExplanation: string;
};

const setupProject = async (
  context: vscode.ExtensionContext,
  openai: OpenAI,
  targetDirectory: string,
): Promise<ProjectState> => {
  // if (isDev) {
  //   return {
  //     fileTree: "",
  //     fileTreeSummary: [],
  //     projectShortExplanation: "This is a test explanation.",
  //     readmeSummary: "",
  //   };
  // }

  const readmeSummary = context.workspaceState.get("jarvis-readmeSummary")
    ? (context.workspaceState.get("jarvis-readmeSummary") as string)
    : await getReadmeSummery(openai, targetDirectory);

  await context.workspaceState.update("jarvis-readmeSummary", readmeSummary);

  const filesToIgnore = getFilesToIgnore(targetDirectory);

  const fileTree = context.workspaceState.get("jarvis-fileTree")
    ? (context.workspaceState.get("jarvis-fileTree") as string)
    : getProjectFileTree(targetDirectory, filesToIgnore);

  await context.workspaceState.update("jarvis-fileTree", fileTree);

  const fileTreeSummary = context.workspaceState.get("jarvis-fileTreeSummary")
    ? (context.workspaceState.get("jarvis-fileTreeSummary") as string[])
    : await getFileTreeSummary(openai, fileTree);

  await context.workspaceState.update("jarvis-fileTreeSummary", fileTreeSummary);

  const projectShortExplanation = context.workspaceState.get("jarvis-projectShortExplanation")
    ? (context.workspaceState.get("jarvis-projectShortExplanation") as string)
    : await getProjectShortExplanation(
        openai,
        readmeSummary,
        fileTreeSummary.join("\n"),
        targetDirectory,
      );

  await context.workspaceState.update("jarvis-projectShortExplanation", projectShortExplanation);

  return {
    fileTree,
    fileTreeSummary,
    projectShortExplanation,
    readmeSummary,
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
        context,
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
  const restartServer = vscode.commands.registerCommand(EXTENSION_NAME + ".restartServer", () => {
    vscode.commands.executeCommand("workbench.action.reloadWindow");
  });

  const resetJarvis = vscode.commands.registerCommand(EXTENSION_NAME + ".resetJarvis", async () => {
    await context.workspaceState.update("jarvis-readmeSummary", undefined);
    await context.workspaceState.update("jarvis-fileTree", undefined);
    await context.workspaceState.update("jarvis-fileTreeSummary", undefined);
    await context.workspaceState.update("jarvis-projectShortExplanation", undefined);

    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  });

  context.subscriptions.push(restartServer);
  context.subscriptions.push(resetJarvis);

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
