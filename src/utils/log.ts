import * as vscode from "vscode";

class JarvisOutputChannel {
  private static _outputChannel: vscode.OutputChannel;

  static get outputChannel(): vscode.OutputChannel {
    if (!JarvisOutputChannel._outputChannel) {
      JarvisOutputChannel._outputChannel = vscode.window.createOutputChannel("Jarvis");
    }

    return JarvisOutputChannel._outputChannel;
  }

  constructor() {}
}

export const jarvisLog = (message: string) => {
  JarvisOutputChannel.outputChannel.appendLine(
    `JARVIS LOG ON ${new Date().toISOString()}: ${message}`,
  );
};
