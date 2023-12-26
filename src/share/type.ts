import type OpenAI from "openai";

export type AskToJarvis = (
  openai: OpenAI,
  targetDirectory: string,
  {
    question,
    fileTree,
    projectShortExplanation,
  }: {
    question: string;
    fileTree: string;
    projectShortExplanation: string;
  },
) => Promise<string>;
