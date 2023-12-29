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

const TOOLS: OpenAI.ChatCompletionTool[] = [
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
];

const resolveFilePath = ({
  targetDirectory,
  filePath,
}: {
  targetDirectory: string;
  filePath: string;
}) => {
  if (filePath.startsWith(targetDirectory)) {
    return filePath;
  }

  if (filePath.startsWith("./")) {
    return path.resolve(targetDirectory, filePath);
  }

  if (filePath.startsWith("/")) {
    return path.resolve(targetDirectory, filePath.slice(1));
  }

  return path.resolve(targetDirectory, filePath);
};

const getAvailableFunctions = (targetDirectory: string) => ({
  getFileContent: ({ filePath }: { filePath: string }) => {
    return getFileContent({ filePath: resolveFilePath({ filePath, targetDirectory }) });
  },
});

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
  targetDirectory: string,
) => {
  const projectExplanationPrompt = getProjectShortExplanationPrompt({
    summarizedFileTree: fileTreeSummary,
    summarizedReadme: readmeSummary,
  });

  const completion = await getChatCompletionWithFunction({
    availableFunctions: getAvailableFunctions(targetDirectory),
    openai,
    options: {
      response_format: {
        type: "json_object",
      },
    },
    prompt: projectExplanationPrompt,
    tools: TOOLS,
  });

  const { explanation } = JSON.parse(completion[completion.length - 1].content as string) as {
    explanation: string;
  };

  return explanation;
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
    availableFunctions: getAvailableFunctions(targetDirectory),
    openai,
    prompt: newConversations,
    tools: TOOLS,
  });

  return answeredConversations;
};
