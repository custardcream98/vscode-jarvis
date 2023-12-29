import { jarvisLog } from "../utils/log";

import OpenAI from "openai";
import * as vscode from "vscode";

const getGptModelConfig = () => {
  const model = vscode.workspace.getConfiguration("jarvis").get<string>("model");

  if (!model) {
    return "gpt-3.5-turbo";
  }

  return model;
};

export const getChatCompletion = async <T>(
  openai: OpenAI,
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: OpenAI.ChatCompletionCreateParamsNonStreaming,
) => {
  jarvisLog(`trying to get chat completion with prompt: ${JSON.stringify(prompt)}`);

  const chat = await openai.chat.completions.create({
    ...options,
    messages: prompt,
    model: getGptModelConfig(),
    n: 1,
    response_format: {
      type: "json_object",
    },
  });

  const completion = chat.choices[0].message.content;

  if (!completion) {
    throw new Error("No completion, Prompt was: " + prompt);
  }

  if (chat.choices[0].finish_reason === "length") {
    jarvisLog("Completion was truncated due to length.");
  }

  jarvisLog(`got chat completion: ${completion}`);

  return JSON.parse(completion) as T;
};

export const getChatCompletionWithFunction = async <T>({
  openai,
  prompt,
  tools,
  availableFunctions,
  options,
}: {
  openai: OpenAI;
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools: OpenAI.ChatCompletionTool[];
  availableFunctions: Record<string, Function>;
  options?: Omit<
    OpenAI.ChatCompletionCreateParamsNonStreaming,
    "messages" | "model" | "n" | "tools" | "tool_choice"
  >;
}): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> => {
  jarvisLog(`trying to get chat function completion with prompt: ${JSON.stringify(prompt)}`);

  const completion = await openai.chat.completions.create({
    ...options,
    messages: prompt,
    model: getGptModelConfig(),
    n: 1,
    tool_choice: "auto",
    tools,
  });

  const toolCalls = completion.choices[0].message.tool_calls ?? [];

  if (toolCalls.length !== 0) {
    jarvisLog(`calling tools: ${JSON.stringify(toolCalls)}`);

    const newPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...prompt,
      completion.choices[0].message,
      ...toolCalls.map((toolCall) => {
        const functionName = toolCall.function.name;
        const functionToCall =
          functionName in availableFunctions ? availableFunctions[functionName] : null;

        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = functionToCall?.(functionArgs);

        const functionMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
          content: functionResponse,
          role: "tool",
          tool_call_id: toolCall.id,
        };

        return functionMessage;
      }),
    ];

    const recursiveCompletion = await getChatCompletionWithFunction({
      availableFunctions,
      openai,
      prompt: newPrompt,
      tools,
    });

    return recursiveCompletion;
  }

  const answerMessage = completion.choices[0].message;

  if (!answerMessage) {
    throw new Error("No completion, Prompt was: " + prompt);
  }

  if (completion.choices[0].finish_reason !== "stop") {
    jarvisLog(`Completion was truncated due to ${completion.choices[0].finish_reason}.`);
  }

  jarvisLog(`got chat function completion: ${JSON.stringify(answerMessage)}`);

  return [...prompt, answerMessage];
};
