import cn from "classnames";
import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeProgressRing,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type OpenAI from "openai";

import "github-markdown-css/github-markdown.css";

import { vscode } from "./utilities/vscode";
import { type ProjectSetupData, useMessageEvent } from "./hooks/useMessageEvent";

import "./App.css";
import style from "./App.module.css";

type Conversation = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const updateVsCodeState = <T extends unknown | undefined>(reducer: (prevState: T) => T) => {
  const vscodeState = vscode.getState();
  vscode.setState(reducer(vscodeState as T));
};

const App = () => {
  const [projectData, setProjectData] = useState<ProjectSetupData | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const vscodeState = vscode.getState();
    return (vscodeState as any)?.conversations ?? [];
  });

  useMessageEvent("onProjectSetup", (payload) => {
    setProjectData(payload);
  });
  useEffect(() => {
    vscode.postMessage({
      type: "onWebviewLoad",
    });
  }, []);

  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const chatFormRef = useRef<HTMLFormElement>(null);
  const questionFormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const question = formData.get("question") as string;

    vscode.postMessage({
      type: "onQuestion",
      question,
      conversations,
    });
    setErrorMessage("");
    setIsAnsweringQuestion(true);
  };

  useMessageEvent("onError", ({ error }) => {
    console.error(error);
    setIsAnsweringQuestion(false);
    setErrorMessage(error);
  });

  useMessageEvent("onAnswer", ({ conversations }) => {
    setConversations(conversations);
    updateVsCodeState((prevState) => ({
      ...(prevState ?? {}),
      conversations: conversations,
    }));
    setIsAnsweringQuestion(false);
    chatFormRef.current?.reset();
  });

  const resetChatLogHandler = () => {
    updateVsCodeState((prevState) => ({
      ...(prevState ?? {}),
      conversations: [],
    }));
    setConversations([]);
  };

  // return (
  //   <main>
  //     <div>{"projectData.projectShortExplanation"}</div>
  //     <VSCodeDivider />
  //     <div className={style.chatWrapper}>
  //       <div className={style.chatList}>
  //         {[
  //           {
  //             question: "What is the project about?",
  //             answer: "This is a project that is about...",
  //           },
  //           {
  //             question: "What is the project about?",
  //             answer: "This is a project that is about...",
  //           },
  //           {
  //             question: "What is the project about?",
  //             answer: "This is a project that is about...",
  //           },
  //         ].map((conversation, index) => (
  //           <div key={index} className={style.chatListItem}>
  //             <div className={cn(style.userChat, style.chatBox)}>
  //               <Markdown className='markdown-body'>{conversation.question}</Markdown>
  //             </div>
  //             <div className={cn(style.botChat, style.chatBox)}>
  //               <Markdown className='markdown-body'>{conversation.answer}</Markdown>
  //             </div>
  //           </div>
  //         ))}
  //       </div>
  //       <form className={style.chatForm} onSubmit={questionFormSubmitHandler}>
  //         <VSCodeTextArea className={style.chatTextArea} name='question' id='question' />
  //         <VSCodeButton disabled={isAnsweringQuestion}>Jarvis is thinking...</VSCodeButton>
  //       </form>
  //     </div>
  //   </main>
  // );

  return (
    <main>
      {projectData ? (
        <>
          <div>{projectData.projectShortExplanation}</div>
          <VSCodeDivider />
          <div className={style.chatWrapper}>
            <div className={style.chatList}>
              <div className={style.chatListItem}>
                {conversations
                  .filter((conversation) => ["assistant", "user"].includes(conversation.role))
                  .map((conversation, index) =>
                    conversation.role === "user" ? (
                      <div key={index} className={cn(style.userChat, style.chatBox)}>
                        <Markdown className='markdown-body'>
                          {typeof conversation.content === "string"
                            ? conversation.content
                            : conversation.content.join("")}
                        </Markdown>
                      </div>
                    ) : (
                      <div key={index} className={cn(style.botChat, style.chatBox)}>
                        <Markdown className='markdown-body'>{conversation.content}</Markdown>
                      </div>
                    ),
                  )}
              </div>
              {isAnsweringQuestion && (
                <div className={style.loadingWrapper}>
                  <div>Jarvis is Thinking...</div>
                  <VSCodeProgressRing />
                </div>
              )}
              {!!errorMessage && <div className={style.errorMessage}>{errorMessage}</div>}
            </div>
            <form ref={chatFormRef} className={style.chatForm} onSubmit={questionFormSubmitHandler}>
              <VSCodeTextArea
                className={style.chatTextArea}
                name='question'
                id='question'
                disabled={isAnsweringQuestion}
              />
              <VSCodeButton type='submit' disabled={isAnsweringQuestion}>
                {isAnsweringQuestion ? "Jarvis is Thinking..." : "Ask Jarvis"}
              </VSCodeButton>
            </form>
            <VSCodeButton type='button' onClick={resetChatLogHandler}>
              Reset Chat Log
            </VSCodeButton>
          </div>
        </>
      ) : (
        <div className={style.loadingWrapper}>
          <div>Jarvis is analyzing project...</div>
          <VSCodeProgressRing />
        </div>
      )}
    </main>
  );
};

export default App;
