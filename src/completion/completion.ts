import { getFileContent } from "../data/file";
import type { AskToJarvis } from "../share/type";

import { getChatCompletion, getChatCompletionWithFunction } from "./chat";
import {
  getAnswerQuestionPrompt,
  getFileTreeSummeryPrompt,
  getProjectShortExplanationPrompt,
  getReadmeSummeryPrompt,
} from "./prompt";

import type OpenAI from "openai";
import path from "path";

export const getReadmeSummery = async (openai: OpenAI, targetDirectory: string) => {
  const readme = getFileContent({ filePath: path.resolve(targetDirectory, "./README.md") });

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

export const getFileTreeSummary = async (openai: OpenAI, fileTree: string) => {
  const fileTreeSummaryPrompt = getFileTreeSummeryPrompt({
    fileTree,
  });

  const { fileDirectories: fileTreeSummary } = await getChatCompletion<{
    fileDirectories: string[];
  }>(openai, fileTreeSummaryPrompt);

  return fileTreeSummary;
};

export const getProjectShortExplanation = async (
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

export const askToJarvis: AskToJarvis = async (
  openai,
  targetDirectory,
  { question, fileTree, projectShortExplanation, conversations = [] },
) => {
  const isPreviousConversation = conversations.length > 0;
  const prevConversations = isPreviousConversation
    ? conversations
    : getAnswerQuestionPrompt({
        fileTree,
        projectShortExplanation,
      });

  const newConversations: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...prevConversations,
    {
      content: question,
      role: "user",
    },
  ];

  const answeredConversations = await getChatCompletionWithFunction<{
    answer: string;
  }>({
    availableFunctions: {
      getFileContent: ({ filePath }: { filePath: string }) => {
        if (filePath.startsWith(targetDirectory)) {
          return getFileContent({ filePath });
        }

        if (filePath.startsWith("./")) {
          return getFileContent({ filePath: path.resolve(targetDirectory, filePath) });
        }

        if (filePath.startsWith("/")) {
          return getFileContent({ filePath: path.resolve(targetDirectory, filePath.slice(1)) });
        }

        return getFileContent({ filePath: path.resolve(targetDirectory, filePath) });
      },
    },
    openai,
    prompt: newConversations,
    tools: [
      {
        function: {
          description: "Get the content of a file",
          name: "getFileContent",
          parameters: {
            properties: {
              filePath: {
                description: "The path of the file to get the content of. Absolute path.",
                type: "string",
              },
            },
            required: ["filePath"],
            type: "object",
          },
        },
        type: "function",
      },
    ],
  });

  return answeredConversations;
};
