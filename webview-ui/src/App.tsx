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

import "./reset.css";
import "./App.css";
import style from "./App.module.css";

// const isDev = true;

type Conversation = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type VSCodeState = {
  conversations: Conversation[];
};

const updateVsCodeState = <T extends unknown | undefined>(reducer: (prevState: T) => T) => {
  const vscodeState = vscode.getState();
  vscode.setState(reducer(vscodeState as T));
};

const App = () => {
  const [projectData, setProjectData] = useState<ProjectSetupData | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const vscodeState = vscode.getState();
    return (vscodeState as VSCodeState)?.conversations ?? [];
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
    updateVsCodeState<VSCodeState>(() => ({
      conversations: conversations,
    }));
    setIsAnsweringQuestion(false);
    chatFormRef.current?.reset();
  });

  const resetChatLogHandler = () => {
    updateVsCodeState<VSCodeState>(() => ({
      conversations: [],
    }));
    setConversations([]);
  };

  // const [devConversations, setDevConversations] = useState<
  //   {
  //     role: "user" | "assistant";
  //     content: string;
  //   }[]
  // >(
  //   new Array(10)
  //     .fill([
  //       { role: "user", content: "This is a test question." },
  //       { role: "assistant", content: "This is a test answer." },
  //     ])
  //     .flat(),
  // );
  // const devQuestionFormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault();

  //   const formData = new FormData(event.currentTarget);

  //   const question = formData.get("question") as string;

  //   setDevConversations((prevConversations) => [
  //     ...prevConversations,
  //     {
  //       role: "user",
  //       content: question,
  //     },
  //   ]);
  //   setIsAnsweringQuestion(true);

  //   setTimeout(() => {
  //     setDevConversations((prevConversations) => [
  //       ...prevConversations,
  //       {
  //         role: "assistant",
  //         content: "This is a test answer.",
  //       },
  //     ]);
  //     setIsAnsweringQuestion(false);
  //   }, 1000);
  // };

  // if (isDev) {
  //   return (
  //     <main>
  //       {projectData ? (
  //         <>
  //           <div className={style.projectShortExplanationWrapper}>
  //             <div>{projectData.projectShortExplanation}</div>
  //             <VSCodeDivider />
  //           </div>
  //           <div className={style.chatWrapper}>
  //             <div className={style.chatList}>
  //               <div className={style.chatListItem}>
  //                 {devConversations
  //                   .filter((conversation) => ["assistant", "user"].includes(conversation.role))
  //                   .map((conversation, index) =>
  //                     conversation.role === "user" ? (
  //                       <div key={index} className={cn(style.userChat, style.chatBox)}>
  //                         <Markdown className='markdown-body'>{conversation.content}</Markdown>
  //                       </div>
  //                     ) : (
  //                       <div key={index} className={cn(style.botChat, style.chatBox)}>
  //                         <Markdown className='markdown-body'>{conversation.content}</Markdown>
  //                       </div>
  //                     ),
  //                   )}
  //               </div>
  //               {isAnsweringQuestion && (
  //                 <div className={style.loadingWrapper}>
  //                   <div>Jarvis is Thinking...</div>
  //                   <VSCodeProgressRing />
  //                 </div>
  //               )}
  //               {!!errorMessage && <div className={style.errorMessage}>{errorMessage}</div>}
  //             </div>
  //             <div className={style.chatFormWrapper}>
  //               <form
  //                 ref={chatFormRef}
  //                 className={style.chatForm}
  //                 onSubmit={devQuestionFormSubmitHandler}
  //               >
  //                 <div className={style.textareaWrapper}>
  //                   <VSCodeTextArea
  //                     className={style.chatTextArea}
  //                     name='question'
  //                     id='question'
  //                     disabled={isAnsweringQuestion}
  //                   />
  //                 </div>
  //                 <VSCodeButton type='submit' disabled={isAnsweringQuestion}>
  //                   {isAnsweringQuestion ? "Jarvis is Thinking..." : "Ask Jarvis"}
  //                 </VSCodeButton>
  //               </form>
  //               <VSCodeButton
  //                 className={style.resetButton}
  //                 type='button'
  //                 onClick={resetChatLogHandler}
  //               >
  //                 Reset Chat Log
  //               </VSCodeButton>
  //             </div>
  //           </div>
  //         </>
  //       ) : (
  //         <div className={style.loadingWrapper}>
  //           <div>Jarvis is analyzing project...</div>
  //           <VSCodeProgressRing />
  //         </div>
  //       )}
  //     </main>
  //   );
  // }

  return (
    <main>
      {projectData ? (
        <>
          <div className={style.projectShortExplanationWrapper}>
            <div>{projectData.projectShortExplanation}</div>
            <VSCodeDivider />
          </div>
          <div className={style.chatWrapper}>
            <div className={style.chatList}>
              <div className={style.chatListItem}>
                {conversations
                  .filter(
                    (conversation) =>
                      ["assistant", "user"].includes(conversation.role) && !!conversation.content,
                  )
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
                <div className={cn(style.loadingWrapper, style.loadingWrapperMarginTop)}>
                  <div>Jarvis is Thinking...</div>
                  <VSCodeProgressRing />
                </div>
              )}
              {!!errorMessage && <div className={style.errorMessage}>{errorMessage}</div>}
            </div>
            <div className={style.chatFormWrapper}>
              <form
                ref={chatFormRef}
                className={style.chatForm}
                onSubmit={questionFormSubmitHandler}
              >
                <div className={style.textareaWrapper}>
                  <VSCodeTextArea
                    className={style.chatTextArea}
                    name='question'
                    id='question'
                    disabled={isAnsweringQuestion}
                  />
                </div>
                <VSCodeButton type='submit' disabled={isAnsweringQuestion}>
                  {isAnsweringQuestion ? "Jarvis is Thinking..." : "Ask Jarvis"}
                </VSCodeButton>
              </form>
              <VSCodeButton
                className={style.resetButton}
                type='button'
                onClick={resetChatLogHandler}
              >
                Reset Chat Log
              </VSCodeButton>
            </div>
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
