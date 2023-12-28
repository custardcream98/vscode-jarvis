import type OpenAI from "openai";

export type AskToJarvis = (
  openai: OpenAI,
  targetDirectory: string,
  {
    question,
    fileTree,
    projectShortExplanation,
    conversations,
  }: {
    question: string;
    fileTree: string;
    projectShortExplanation: string;
    conversations?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  },
) => Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>;
