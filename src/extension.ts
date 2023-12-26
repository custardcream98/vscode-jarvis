import { getChatCompletion, getChatCompletionWithFunction } from "./completion/chat";
import {
  getAnswerQuestionPrompt,
  getFileTreeSummeryPrompt,
  getProjectShortExplanationPrompt,
  getReadmeSummeryPrompt,
} from "./completion/prompt";
import { getFileContent } from "./data/file";
import { getProjectFileTree } from "./data/fileTree";
import { SidebarProvider } from "./view/sidebar";

import OpenAI from "openai";
import path from "path";
import * as vscode from "vscode";

const EXTENSION_NAME = "jarvis";

const getReadmeSummery = async (openai: OpenAI, targetDirectory: string) => {
  const readme = getFileContent(path.resolve(targetDirectory, "./README.md"));

  if (!readme) {
    return "";
  }

  const readmeSummaryPrompt = getReadmeSummeryPrompt({
    readme,
  });

  const { summary: readmeSummary } = await getChatCompletion<{
    summary: string;
  }>(openai, readmeSummaryPrompt);

  return readmeSummary;
};

const getFilesToIgnore = (targetDirectory: string) => {
  const gitignore = getFileContent(path.resolve(targetDirectory, "./.gitignore"));

  const filesToIgnore = gitignore.split("\n");

  return filesToIgnore;
};

const getFileTreeSummary = async (openai: OpenAI, fileTree: string) => {
  const fileTreeSummaryPrompt = getFileTreeSummeryPrompt({
    fileTree,
  });

  const { fileDirectories: fileTreeSummary } = await getChatCompletion<{
    fileDirectories: string[];
  }>(openai, fileTreeSummaryPrompt);

  return fileTreeSummary;
};

const getProjectShortExplanation = async (
  openai: OpenAI,
  readmeSummary: string,
  fileTreeSummary: string,
) => {
  const projectExplanationPrompt = getProjectShortExplanationPrompt({
    summarizedFileTree: fileTreeSummary,
    summarizedReadme: readmeSummary,
  });

  const { explanation: projectExplanation } = await getChatCompletion<{
    explanation: string;
  }>(openai, projectExplanationPrompt);

  return projectExplanation;
};

const setupJarvis = async (
  context: vscode.ExtensionContext,
  currentWorkspaceRoot: string,
  openAiApiKey: string,
) => {
  await vscode.window.withProgress(
    {
      cancellable: false,
      location: vscode.ProgressLocation.Notification,
      title: "Jarvis: Setting up",
    },
    async (progress) => {
      progress.report({ increment: 0 });

      const openai = new OpenAI({
        apiKey: openAiApiKey,
      });

      const TARGET_DIRECTORY = currentWorkspaceRoot;

      progress.report({
        increment: 10,
        message: "Jarvis: Reading Project...",
      });
      const readmeSummary = await getReadmeSummery(openai, TARGET_DIRECTORY);

      const filesToIgnore = getFilesToIgnore(TARGET_DIRECTORY);

      const fileTree = getProjectFileTree(TARGET_DIRECTORY, filesToIgnore);

      progress.report({
        increment: 70,
        message: "Jarvis: Reading Project...",
      });
      const fileTreeSummary = await getFileTreeSummary(openai, fileTree);

      const projectShortExplanation = await getProjectShortExplanation(
        openai,
        readmeSummary,
        fileTreeSummary.join("\n"),
      );

      vscode.window.showInformationMessage(
        "Jarvis: Jarvis is Ready To Answer Questions.\n\nAsk a question by pressing Ctrl+Shift+P and typing 'Jarvis: Ask a Question'\n\n" +
          projectShortExplanation,
      );

      progress.report({ increment: 100 });

      const askToJarvis = async (question: string) => {
        const answer = await vscode.window.withProgress(
          {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: "Jarvis: Thinking...",
          },
          async (progress) => {
            progress.report({ increment: 0 });

            const questionPrompt = getAnswerQuestionPrompt({
              fileTree,
              projectShortExplanation,
              question,
            });

            const { answer } = await getChatCompletionWithFunction<{
              answer: string;
            }>(openai, questionPrompt, TARGET_DIRECTORY);

            return answer;
          },
        );

        return answer;
      };

      const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        projectShortExplanation,
        askToJarvis,
      );

      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("jarvis-sidebar", sidebarProvider),
      );

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

          const answer = await askToJarvis(question);

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

  await setupJarvis(context, currentWorkspaceRoot, openAiApiKey);
}

export function deactivate() {}
