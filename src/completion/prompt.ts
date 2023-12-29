import OpenAI from "openai";

export const getReadmeSummeryPrompt = ({
  readme,
}: {
  readme: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `**Summarize the README** of the project succinctly, in the following JSON format:
\`\`\`
{ "summary": "README Summary" }
\`\`\`
**Readme Content:**
\`\`\`
${readme}
\`\`\``,
    role: "system",
  },
];

export const getFileTreeSummeryPrompt = ({
  fileTree,
}: {
  fileTree: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `From the given **file tree**, identify key files that provide an overview of the project. Please respond in JSON format as shown:
\`\`\`
{ "fileDirectories": ["file1", "file2", "file3", ...] }
\`\`\`
**Full File Tree:**
\`\`\`
${fileTree}
\`\`\``,
    role: "system",
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
    content: `Based on the summarized data, **provide a one-sentence explanation of the project**. Include any necessary information to support your explanation using available functions, and respond in the following JSON format:
\`\`\`
{ "explanation": "Project Explanation" }
\`\`\`
**Summarized File Tree:**
\`\`\`
${summarizedFileTree}
\`\`\`
    ${
      summarizedReadme
        ? `**Summarized Readme:**
\`\`\`
${summarizedReadme}
\`\`\``
        : ""
    }`,
    role: "system",
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
    content: `You are Jarvis, the AI that expertly manages code workspaces. Your primary function is to analyze project data and optimize the development environment. Preference should be given to succinct and relevant information. Responses should utilize Markdown for enhanced clarity. Remember to utilize available tool functions for accessing workspace files as needed.

**Project Overview:**
${projectShortExplanation}

**Workspace File Structure:**
\`\`\`
${fileTree}
\`\`\`

_Note: Employ the 'read files' function to access file content within the workspace._

**How may I assist with your inquiry today?**`,
    role: "system",
  },
];
