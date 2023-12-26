import * as vscode from "vscode";

export class SidebarProvider
  implements vscode.WebviewViewProvider
{
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;
  _projectDescription?: string;
  _askToJarvisHandler?: (
    question: string
  ) => Promise<string>;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    projectDescription: string,
    askToJarvisHandler: (
      question: string
    ) => Promise<string>
  ) {
    this._projectDescription = projectDescription;
    this._askToJarvisHandler = askToJarvisHandler;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview
    );

    // Listen for messages from the Sidebar component and execute action
    webviewView.webview.onDidReceiveMessage(
      async (data) => {
        switch (data.type) {
          case "onQuestion": {
            if (
              !data.value ||
              !this._askToJarvisHandler ||
              typeof data.value !== "string"
            ) {
              return;
            }

            const answer = await this._askToJarvisHandler?.(
              data.value
            );

            webviewView.webview.postMessage({
              type: "onAnswer",
              value: answer,
            });

            break;
          }
        }
      }
    );
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // const styleResetUri = webview.asWebviewUri(
    //     vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    // );
    // const styleVSCodeUri = webview.asWebviewUri(
    //     vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    // );
    // const scriptUri = webview.asWebviewUri(
    //     vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
    // );
    // const styleMainUri = webview.asWebviewUri(
    //     vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    // );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                <script nonce="${nonce}">
                    const tsvscode = acquireVsCodeApi();
                </script>

			</head>
            <body>
      <h1>Jarvis</h1>
      <p>${this._projectDescription}</p>
      <p>Ask a question</p>

      <form id="questionForm">
      <textarea id="question" type="text" placeholder="What is the purpose of this project?"></textarea>
      <button id="ask">Ask</button>
      </form>
      
      <ol id="answerList" style="margin-top:20px;"></ol>

<script nonce="${nonce}">
const formElement = document.getElementById('questionForm');

formElement.addEventListener('submit', (e) => {
  e.preventDefault();

  const question = document.getElementById('question').value;

  tsvscode.postMessage({
    type: 'onQuestion',
    value: question
  });
});
</script>
<script nonce="${nonce}">
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.type) {
    case 'onAnswer': {
      const answerListElement = document.getElementById('answerList');

      const answerElement = document.createElement('li');
      answerElement.innerText = message.value;

      answerListElement.appendChild(answerElement);

      break;
    }
  }
});
</script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(
      Math.floor(Math.random() * possible.length)
    );
  }
  return text;
}
