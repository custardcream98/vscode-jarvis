import {
  askToJarvis,
  getFileTreeSummary,
  getProjectShortExplanation,
  getReadmeSummery,
} from "./completion/completion";
import { getFileContent } from "./data/file";
import { getProjectFileTree, parseGitIgnore } from "./data/fileTree";
import { jarvisLog } from "./utils/log";
import { SidebarProvider } from "./view/sidebar";

import OpenAI from "openai";
import path from "path";
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
  jarvisLog(`
======== JARVIS SETUP INFO =========
initializing jarvis...
====================================
`);

  const storedReadme = context.workspaceState.get<string>("jarvis-readme");
  const currentReadme = getFileContent({ filePath: path.resolve(targetDirectory, "./README.md") });
  const isReadmeChanged = storedReadme !== currentReadme;
  await context.workspaceState.update("jarvis-readme", currentReadme);

  isReadmeChanged &&
    jarvisLog(`
======== JARVIS SETUP INFO =========
readme changed. re-analyzing workspace.
====================================
`);

  const readmeSummary =
    context.workspaceState.get("jarvis-readmeSummary") && !isReadmeChanged
      ? (context.workspaceState.get("jarvis-readmeSummary") as string)
      : await getReadmeSummery(openai, targetDirectory);

  await context.workspaceState.update("jarvis-readmeSummary", readmeSummary);

  const filesToIgnore = parseGitIgnore(targetDirectory);

  const fileTree = getProjectFileTree(targetDirectory, filesToIgnore);

  jarvisLog(`
======== JARVIS SETUP INFO =========
filesToIgnore:
${JSON.stringify(filesToIgnore)}

parsed fileTree:
${fileTree}
====================================
`);

  const prevFileTree = context.workspaceState.get("jarvis-fileTree");
  const isFileTreeChanged = prevFileTree !== fileTree;
  await context.workspaceState.update("jarvis-fileTree", fileTree);

  isFileTreeChanged &&
    jarvisLog(`
======== JARVIS SETUP INFO =========
file tree changed. re-analyzing workspace.
====================================
`);
  const shouldReanalyze = isFileTreeChanged || isReadmeChanged;

  const fileTreeSummary =
    context.workspaceState.get("jarvis-fileTreeSummary") && !shouldReanalyze
      ? (context.workspaceState.get("jarvis-fileTreeSummary") as string[])
      : await getFileTreeSummary(openai, fileTree);

  await context.workspaceState.update("jarvis-fileTreeSummary", fileTreeSummary);

  const projectShortExplanation =
    context.workspaceState.get("jarvis-projectShortExplanation") && !shouldReanalyze
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
      title: "Jarvis: ",
    },
    async (progress) => {
      progress.report({
        increment: 10,
        message: "Reading Project...",
      });

      const { fileTree, fileTreeSummary, projectShortExplanation } = await setupProject(
        context,
        openai,
        TARGET_DIRECTORY,
      );

      sidebarProvider.setupProject({
        fileTree,
        fileTreeSummary,
        projectShortExplanation,
      });

      progress.report({ increment: 100, message: "Ready To Answer Questions." });
    },
  );
};

export async function activate(context: vscode.ExtensionContext) {
  const restartServer = vscode.commands.registerCommand(EXTENSION_NAME + ".restartJarvis", () => {
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
