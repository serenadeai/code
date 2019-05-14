import Settings from '../settings';
import StateManager from '../state-manager';

import BaseRunner from './base-runner';
import LinuxRunner from './linux-runner';
import MacRunner from './mac-runner';
import WindowsRunner from './windows-runner';

export default class ClientRunner {
    private state: StateManager;
    private settings: Settings;
    runner: BaseRunner;

    constructor(state: StateManager, settings: Settings) {
        this.state = state;
        this.settings = settings;

        if (process.platform === 'darwin') {
            this.runner = new MacRunner(this.state, this.settings);
        }
        else if (process.platform === 'win32') {
            this.runner = new WindowsRunner(this.state, this.settings);
        }
        else {
            this.runner = new LinuxRunner(this.state, this.settings);
        }
    }
}
