import type OpenAI from "openai";
import React, { useEffect, useRef } from "react";

export type ProjectSetupData = {
  fileTree: string;
  fileTreeSummary: string;
  projectShortExplanation: string;
};
export type Conversation = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export type JarvisMessageType = "onError" | "onAnswer" | "onProjectSetup";
export type JarvisMessagePayload<T extends JarvisMessageType> = {
  onError: { error: string };
  onAnswer: { conversations: Conversation[] };
  onProjectSetup: ProjectSetupData;
}[T];

export type JarvisMessageListener<T extends JarvisMessageType> = (
  payload: JarvisMessagePayload<T>,
) => void;
export type JarvisMessageListenerAdder = <T extends JarvisMessageType>(
  type: T,
  listener: JarvisMessageListener<T>,
) => void;
const MessageListenerContext = React.createContext<{
  addListener: JarvisMessageListenerAdder;
}>({
  addListener: () => {},
});

export const MessageListenerProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const messageListeners = useRef(new Map<string, Set<JarvisMessageListener<any>>>());

  useEffect(() => {
    const messageEventHandler = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (messageListeners.current.has(type)) {
        for (const listener of messageListeners.current.get(type)!) {
          listener(payload);
        }
      }
    };

    window.addEventListener("message", messageEventHandler);

    return () => {
      window.removeEventListener("message", messageEventHandler);
    };
  }, []);

  const addListener = <T extends JarvisMessageType>(
    type: T,
    listener: JarvisMessageListener<T>,
  ) => {
    if (!messageListeners.current.has(type)) {
      messageListeners.current.set(type, new Set());
    }

    messageListeners.current.get(type)!.add(listener);
  };

  return (
    <MessageListenerContext.Provider value={{ addListener }}>
      {children}
    </MessageListenerContext.Provider>
  );
};

export const useMessageEvent = <T extends JarvisMessageType>(
  type: T,
  listener: JarvisMessageListener<T>,
) => {
  const { addListener } = React.useContext(MessageListenerContext);
  const ref = useRef({ type, listener });

  useEffect(() => {
    addListener(ref.current.type, ref.current.listener);
  }, []);
};
