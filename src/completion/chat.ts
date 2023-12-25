import OpenAI from "openai";
import { getFileContent } from "../data/file";
import path from "path";

export const getChatCompletion = async <T>(
  openai: OpenAI,
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: OpenAI.ChatCompletionCreateParamsNonStreaming
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
  targetDirectory: string
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
        type: "function",
        function: {
          name: "getFileContent",
          description: "Get the content of a file",
          parameters: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description:
                  "The path of the file to get the content of. Absolute path.",
              },
            },
            required: ["filePath"],
          },
        },
      },
    ],
  });

  const toolCalls =
    chat.choices[0].message.tool_calls ?? [];

  if (toolCalls.length !== 0) {
    console.log(
      "tool Called!",
      JSON.stringify(chat.choices[0].message)
    );

    prompt.push(chat.choices[0].message);

    const availableFunctions: Record<string, Function> = {
      getFileContent: (filePath: string) => {
        if (filePath.startsWith(targetDirectory)) {
          return getFileContent(filePath);
        }

        if (filePath.startsWith("./")) {
          return getFileContent(
            path.resolve(targetDirectory, filePath)
          );
        }

        if (filePath.startsWith("/")) {
          return getFileContent(
            path.resolve(targetDirectory, filePath.slice(1))
          );
        }

        return getFileContent(
          path.resolve(targetDirectory, filePath)
        );
      },
    };

    toolCalls.forEach((toolCall) => {
      const functionName = toolCall.function.name;
      const functionToCall =
        functionName in availableFunctions
          ? availableFunctions[functionName]
          : null;

      const functionArgs = JSON.parse(
        toolCall.function.arguments
      );
      const functionResponse = functionToCall?.(
        functionArgs.filePath
      );

      prompt.push({
        tool_call_id: toolCall.id,
        role: "tool",
        content: functionResponse,
      });
    });

    const chatWithFunction =
      await openai.chat.completions.create({
        messages: prompt,
        model: "gpt-4-1106-preview",
        response_format: {
          type: "json_object",
        },
      });

    const completion =
      chatWithFunction.choices[0].message.content;

    if (!completion) {
      throw new Error(
        "No completion, Prompt was: " + prompt
      );
    }

    if (chat.choices[0].finish_reason === "length") {
      console.warn(
        "Completion was truncated due to length."
      );
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

// # Step 2: check if the model wanted to call a function
//     if tool_calls:
//         # Step 3: call the function
//         # Note: the JSON response may not always be valid; be sure to handle errors
//         available_functions = {
//             "get_current_weather": get_current_weather,
//         }  # only one function in this example, but you can have multiple
//         messages.append(response_message)  # extend conversation with assistant's reply
//         # Step 4: send the info for each function call and function response to the model
//         for tool_call in tool_calls:
//             function_name = tool_call.function.name
//             function_to_call = available_functions[function_name]
//             function_args = json.loads(tool_call.function.arguments)
//             function_response = function_to_call(
//                 location=function_args.get("location"),
//                 unit=function_args.get("unit"),
//             )
//             messages.append(
//                 {
//                     "tool_call_id": tool_call.id,
//                     "role": "tool",
//                     "name": function_name,
//                     "content": function_response,
//                 }
//             )  # extend conversation with function response
//         second_response = client.chat.completions.create(
//             model="gpt-3.5-turbo-1106",
//             messages=messages,
//         )  # get a new response from the model where it can see the function response
//         return second_response
