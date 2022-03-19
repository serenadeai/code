import * as vscode from "vscode";
import App from "./app";

let app: App | null = null;

export function activate(_context: vscode.ExtensionContext) {
  app = new App();
  app.start();
}

export function deactivate() {}
