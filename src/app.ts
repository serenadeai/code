import * as vscode from "vscode";
import CommandHandler from "./command-handler";
import BaseApp from "./shared/app";

export default class App extends BaseApp {
  createCommandHandler(): CommandHandler {
    return new CommandHandler(this.ipcClient!, this.settings!);
  }

  hideMessage() {}

  port() {
    return 17376;
  }

  showNotRunningMessage() {
    vscode.window.showInformationMessage(
      "Open the Serenade app to use Serenade with Visual Studio Code."
    );
  }

  showInstallMessage() {
    vscode.window
      .showInformationMessage(
        "Download the new Serenade app to use Serenade with Visual Studio Code.",
        {},
        "Download"
      )
      .then(() => {
        vscode.env.openExternal(vscode.Uri.parse("https://serenade.ai/download"));
      });
  }

  start() {
    if (this.ipcServer) {
      return;
    }

    this.run();
    (this.commandHandler! as CommandHandler).pollActiveEditor();
  }
}
