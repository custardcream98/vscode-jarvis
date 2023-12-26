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
  { question, fileTree, projectShortExplanation },
) => {
  const questionPrompt = getAnswerQuestionPrompt({
    fileTree,
    projectShortExplanation,
    question,
  });

  const { answer } = await getChatCompletionWithFunction<{
    answer: string;
  }>(openai, questionPrompt, targetDirectory);

  return answer;
};
