import App from "./App";

import ReactDOM from "react-dom";
import { MessageListenerProvider } from "./hooks/useMessageEvent";

ReactDOM.render(
  <MessageListenerProvider>
    <App />
  </MessageListenerProvider>,
  document.getElementById("root"),
);
