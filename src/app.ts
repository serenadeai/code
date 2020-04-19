import * as vscode from "vscode";
import CommandHandler from "./command-handler";
import BaseApp from "./shared/app";

export default class App extends BaseApp {
  private installHtml(): string {
    return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="style-src 'nonce-07c49590f6'">
    <title>Serenade</title>
    <style nonce="07c49590f6">

a {
  background: #e7b143;
  border: none;
  border-radius: .25rem;
  color: rgba(0, 0, 0, 0.6);
  display: inline-block;
  font-weight: 600;
  font-size: 1.1rem;
  margin-top: 0.5rem;
  padding: .8rem 1.6rem;
  text-decoration: none;
  text-shadow: 2px 2px 3px rgba(255, 255, 255, 0.1);
  transition: background .2s ease-in-out;
  white-space: normal;
}

a:hover {
  color: rgba(0, 0, 0, 0.6);
  background: #edc470;
}

h1 {
  font-size: 1.5rem;
}

p {
  font-size: 1rem;
  line-height: 1.3;
}

    </style>
  </head>
  <body>
    <h1>Welcome to Serenade!</h1>
    <p>With Serenade, you can write code faster&mdash;by speaking in plain English, rather than typing. Use Serenade as your coding assistant, or abandon your keyboard entirely.</p>
    <p>To get started, download the Serenade app and run it alongside VS Code.</p>
    <a class="download" href="#">Download</a>
  </body>
  <script>

const vscode = acquireVsCodeApi();
document.querySelector('.download').addEventListener('click', e => {
  e.preventDefault();
  vscode.postMessage({
    type: 'download'
  });
});

  </script>
</html>
    `;
  }

  app(): string {
    return "vscode";
  }

  createCommandHandler(): CommandHandler {
    return new CommandHandler(this.settings!);
  }

  hideMessage() {}

  showInstallMessage() {
    const panel = vscode.window.createWebviewPanel(
      "serenade-install",
      "Serenade",
      vscode.ViewColumn.Two,
      {
        enableScripts: true
      }
    );

    panel.webview.html = this.installHtml();
    panel.webview.onDidReceiveMessage((message: any) => {
      if (message.type == "download") {
        vscode.env.openExternal(vscode.Uri.parse("https://serenade.ai/request"));
        panel.dispose();
      }
    });
  }

  start() {
    if (this.initialized) {
      return;
    }

    this.run();
    (this.commandHandler! as CommandHandler).pollActiveEditor();
    this.settings!.setPluginInstalled("vscode");

    vscode.window.onDidChangeActiveTextEditor(() => {
      this.ipc!.sendActive();
    });

    vscode.window.onDidChangeWindowState(state => {
      if (state.focused) {
        this.ipc!.sendActive();
      }
    });
  }
}
