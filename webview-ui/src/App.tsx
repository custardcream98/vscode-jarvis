import cn from "classnames";
import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeProgressRing,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { vscode } from "./utilities/vscode";

import "./App.css";
import "github-markdown-css/github-markdown.css";
import style from "./App.module.css";

const App = () => {
  const [projectData, setProjectData] = useState<{
    fileTree: string;
    fileTreeSummary: string;
    projectShortExplanation: string;
  } | null>(null);

  const [conversations, setConversations] = useState<
    {
      question: string;
      answer: string;
    }[]
  >([]);

  useEffect(() => {
    const projectSetupEventHandler = (event: MessageEvent) => {
      if (event.data.type === "onProjectSetup") {
        setProjectData(event.data.value);
      }
    };

    window.addEventListener("message", projectSetupEventHandler);

    return () => {
      window.removeEventListener("message", projectSetupEventHandler);
    };
  }, []);

  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState(false);
  const questionFormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const question = formData.get("question") as string;

    vscode.postMessage({
      type: "onQuestion",
      value: question,
    });
    setIsAnsweringQuestion(true);
  };

  useEffect(() => {
    const answerEventHandler = (event: MessageEvent) => {
      if (event.data.type === "onAnswer") {
        setConversations((conversations) => [
          ...conversations,
          {
            question: event.data.value.question,
            answer: event.data.value.answer,
          },
        ]);
        setIsAnsweringQuestion(false);
      }
    };

    window.addEventListener("message", answerEventHandler);

    return () => {
      window.removeEventListener("message", answerEventHandler);
    };
  }, []);

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
              {conversations.map((conversation, index) => (
                <div key={index} className={style.chatListItem}>
                  <div className={cn(style.userChat, style.chatBox)}>
                    <Markdown className='markdown-body'>{conversation.question}</Markdown>
                  </div>
                  <div className={cn(style.botChat, style.chatBox)}>
                    <Markdown className='markdown-body'>{conversation.answer}</Markdown>
                  </div>
                </div>
              ))}
            </div>
            <form className={style.chatForm} onSubmit={questionFormSubmitHandler}>
              <VSCodeTextArea className={style.chatTextArea} name='question' id='question' />
              <VSCodeButton disabled={isAnsweringQuestion}>
                {isAnsweringQuestion ? "Jarvis is Thinking..." : "Ask Jarvis"}
              </VSCodeButton>
            </form>
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
