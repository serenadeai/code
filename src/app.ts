import * as vscode from "vscode";
import CommandHandler from "./command-handler";
import BaseApp from "./shared/app";
import IPC from "./shared/ipc";
import Settings from "./shared/settings";

export default class App extends BaseApp {
  private commandHandler?: CommandHandler;

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
    if (this.ipc) {
      return;
    }

    this.settings = new Settings();
    this.commandHandler = new CommandHandler(this.settings);
    this.ipc = new IPC(this.commandHandler, 17376, () => {});
    this.commandHandler.pollActiveEditor();

    this.run();
  }
}
