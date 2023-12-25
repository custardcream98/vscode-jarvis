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

    Response Format:
    {
      "explanation": "Project Explanation",
    }
  
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

    Response Format:
    {
      "summary": "README Summary",
    }
    
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
    content: `You are a senior developer. Pick important files from the given file tree to get to know the project's overall information. Do not include README.md, package.json, and config files like .gitignore, .prettierrc, jest.config.js, etc. Choose file specific file so you can open and see the code. Response in following JSON format.

    Response Format:
    {
      "fileDirectories": ["file1", "file2", "file3"],
    }
    
    File Tree:
    ${fileTree}
    `,
    role: "system",
  },
  {
    content: "Picked Important File's Directories:",
    role: "user",
  },
];

export const getDetermineMainFilePrompt = ({
  readme,
  fileTree,
  packageJson,
}: {
  readme: string;
  fileTree: string;
  packageJson: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Choose which file you should read to understand project deeply with the following data. Pick under 5 files. Do not include README.md, package.json, and config files like .gitignore, .prettierrc, jest.config.js, etc. Response in following JSON format. Response with FULL FILE PATH.

    Response Format:
    {
      "mainFiles": ["file1", "file2", "file3"],
    }
    
    Readme Summary:
    ${readme}

    File Tree:
    ${fileTree}

    package.json:
    ${packageJson}
    `,
    role: "system",
  },
  {
    content: "Files To Read:",
    role: "user",
  },
];

export const getProjectShortExplanationPrompt = ({
  summarizedFileTree,
  summarizedReadme,
}: {
  summarizedFileTree: string;
  summarizedReadme: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Explain the project with the following data. Response in following JSON format. Explain in 1 sentence.

    Response Format:
    {
      "explanation": "Project Explanation",
    }
  
    Summarized File Tree:
    ${summarizedFileTree}
    
    Summarized Readme:
    ${summarizedReadme}
    `,
    role: "system",
  },
  {
    content: "Explanation:",
    role: "user",
  },
];

export const getAnswerQuestionPrompt = ({
  question,
  projectShortExplanation,
  fileTree,
}: {
  question: string;
  projectShortExplanation: string;
  fileTree: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Answer the following question with the following data. Response in following JSON format.

    Response Format:
    {
      "answer": "Answer",
    }
    
    Project Explanation:
    ${projectShortExplanation}

    File Tree:
    ${fileTree}
    `,
    role: "system",
  },
  {
    content: "Question: " + question,
    role: "user",
  },
];

export const getCodeExplainPrompt = ({
  projectShortExplanation,
  code,
}: {
  projectShortExplanation: string;
  code: string;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    content: `You are a senior developer. Based on the following explanation, explain the code in 1 sentence. Response in following JSON format.

    Response Format:
    {
      "codeExplanation": "Code Explanation",
    }
    
    Project Explanation:
    ${projectShortExplanation}

    Code:
    ${code}
    `,
    role: "system",
  },
  {
    content: "Code Explanation:",
    role: "user",
  },
];
