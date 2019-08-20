import CommandHandler from "./command-handler";
import BaseApp from "./shared/app";
import IPC from "./shared/ipc";
import Settings from "./shared/settings";

export default class App extends BaseApp {
  private commandHandler?: CommandHandler;
  private settings?: Settings;

  start() {
    if (this.ipc) {
      return;
    }

    this.settings = new Settings();
    this.commandHandler = new CommandHandler(this.settings);
    this.ipc = new IPC(this.commandHandler, 17376);
    this.commandHandler.pollActiveEditor();

    this.run();
  }
}
