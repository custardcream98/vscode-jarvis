import { getFileContent } from "../data/file";

import OpenAI from "openai";
import path from "path";

export const getChatCompletion = async <T>(
  openai: OpenAI,
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: OpenAI.ChatCompletionCreateParamsNonStreaming,
) => {
  const chat = await openai.chat.completions.create({
    ...options,
    messages: prompt,
    model: "gpt-4-1106-preview",
    response_format: {
      type: "json_object",
    },
  });

  const completion = chat.choices[0].message.content;

  if (!completion) {
    throw new Error("No completion, Prompt was: " + prompt);
  }

  if (chat.choices[0].finish_reason === "length") {
    console.warn("Completion was truncated due to length.");
  }

  return JSON.parse(completion) as T;
};

export const getChatCompletionWithFunction = async <T>(
  openai: OpenAI,
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  targetDirectory: string,
) => {
  const chat = await openai.chat.completions.create({
    messages: prompt,
    model: "gpt-4-1106-preview",
    response_format: {
      type: "json_object",
    },
    tool_choice: "auto",
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

  const toolCalls = chat.choices[0].message.tool_calls ?? [];

  if (toolCalls.length !== 0) {
    console.log("tool Called!", JSON.stringify(chat.choices[0].message));

    prompt.push(chat.choices[0].message);

    const availableFunctions: Record<string, Function> = {
      getFileContent: (filePath: string) => {
        if (filePath.startsWith(targetDirectory)) {
          return getFileContent(filePath);
        }

        if (filePath.startsWith("./")) {
          return getFileContent(path.resolve(targetDirectory, filePath));
        }

        if (filePath.startsWith("/")) {
          return getFileContent(path.resolve(targetDirectory, filePath.slice(1)));
        }

        return getFileContent(path.resolve(targetDirectory, filePath));
      },
    };

    toolCalls.forEach((toolCall) => {
      const functionName = toolCall.function.name;
      const functionToCall =
        functionName in availableFunctions ? availableFunctions[functionName] : null;

      const functionArgs = JSON.parse(toolCall.function.arguments);
      const functionResponse = functionToCall?.(functionArgs.filePath);

      prompt.push({
        content: functionResponse,
        role: "tool",
        tool_call_id: toolCall.id,
      });
    });

    const chatWithFunction = await openai.chat.completions.create({
      messages: prompt,
      model: "gpt-4-1106-preview",
      response_format: {
        type: "json_object",
      },
    });

    const completion = chatWithFunction.choices[0].message.content;

    if (!completion) {
      throw new Error("No completion, Prompt was: " + prompt);
    }

    if (chat.choices[0].finish_reason === "length") {
      console.warn("Completion was truncated due to length.");
    }

    return JSON.parse(completion) as T;
  }

  const completion = chat.choices[0].message.content;

  if (!completion) {
    throw new Error("No completion, Prompt was: " + prompt);
  }

  if (chat.choices[0].finish_reason === "length") {
    console.warn("Completion was truncated due to length.");
  }

  return JSON.parse(completion) as T;
};
