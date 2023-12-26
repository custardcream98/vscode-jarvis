import { askToJarvis } from "../completion/completion";

import type OpenAI from "openai";
import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _fileTree: string = "";
  _fileTreeSummary: string[] = [];
  _projectShortExplanation: string = "";

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _openai: OpenAI,
    private readonly _targetDirectory: string,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        this._extensionUri.with({ fragment: "out" }),
        this._extensionUri.with({ path: "webview-ui/build" }),
        this._extensionUri,
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Listen for messages from the Sidebar component and execute action
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onQuestion": {
          if (!data.value || typeof data.value !== "string") {
            vscode.window.showErrorMessage("Jarvis: Invalid question");
            return;
          }

          const answer = await askToJarvis(this._openai, this._targetDirectory, {
            fileTree: this._fileTree,
            projectShortExplanation: this._projectShortExplanation,
            question: data.value,
          });

          this.postMessage({
            type: "onAnswer",
            value: {
              answer,
              question: data.value,
            },
          });

          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, ...["webview-ui", "build", "assets", "index.js"]),
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, ...["webview-ui", "build", "assets", "index.css"]),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `
     <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};"
          />
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Jarvis</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  public postMessage(message: unknown) {
    this._view?.webview.postMessage(message);
  }

  public setupProject = ({
    fileTree,
    fileTreeSummary,
    projectShortExplanation,
  }: {
    fileTree: string;
    fileTreeSummary: string[];
    projectShortExplanation: string;
  }) => {
    this._fileTree = fileTree;
    this._fileTreeSummary = fileTreeSummary;
    this._projectShortExplanation = projectShortExplanation;

    this._view?.webview.postMessage({
      type: "onProjectSetup",
      value: {
        fileTree,
        fileTreeSummary,
        projectShortExplanation,
      },
    });
  };
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
