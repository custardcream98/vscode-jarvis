import OpenAI from "openai";

export const getProjectExplanationPrompt = ({
  fileTree,
  readme,
}: {
  fileTree: string;
  readme: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Explain the project with the following data. Response in following JSON format.
    Response Format: { "explanation": "Project Explanation" }
    File Tree:
    ${fileTree}
    Readme:
    ${readme}
    `,
    role: "system",
  },
  {
    content: "Explanation:",
    role: "user",
  },
];

export const getReadmeSummeryPrompt = ({
  readme,
}: {
  readme: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Summarize the project's README. Response in following JSON format.
    Response Format:{ "summary": "README Summary" }
    Readme:
    ${readme}
    `,
    role: "system",
  },
  {
    content: "Summary:",
    role: "user",
  },
];

export const getFileTreeSummeryPrompt = ({
  fileTree,
}: {
  fileTree: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Pick important files from the given file tree to get to know the project's overall information. Please select paths that, just by reading the file path list, would allow for an understanding of the entire project. Response in following JSON format.
    Response Format: { "fileDirectories": ["file1", "file2", "file3"] }
    File Tree:
    ${fileTree}
    `,
    role: "system",
  },
  {
    content: "File Directories:",
    role: "user",
  },
];

export const getProjectShortExplanationPrompt = ({
  summarizedFileTree,
  summarizedReadme,
}: {
  summarizedFileTree: string;
  summarizedReadme?: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Explain the project with the following data. Response in following JSON format. Explain in 1 sentence. You can use read files via function to answer the question.
    Response Format:{ "explanation": "Project Explanation" }
    Summarized File Tree:
    ${summarizedFileTree}
    ${
      summarizedReadme
        ? `
    Summarized Readme:
    ${summarizedReadme}`
        : ""
    }
    `,
    role: "system",
  },
  {
    content: "Explanation:",
    role: "user",
  },
];

export const getAnswerQuestionPrompt = ({
  projectShortExplanation,
  fileTree,
}: {
  projectShortExplanation: string;
  fileTree: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Answer questions with the following data about a project. You can use read files via function to answer the question.
    Response Format: Markdown
    Project Explanation:
    ${projectShortExplanation}
    File Tree:
    ${fileTree}
    `,
    role: "system",
  },
];
