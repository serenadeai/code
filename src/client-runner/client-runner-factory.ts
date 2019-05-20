import Settings from '../settings';
import StateManager from '../state-manager';

import BaseRunner from './base-runner';
import LinuxRunner from './linux-runner';
import MacRunner from './mac-runner';
import WindowsRunner from './windows-runner';

export default class ClientRunnerFactory {
    private state: StateManager;
    private settings: Settings;

    constructor(state: StateManager, settings: Settings) {
        this.state = state;
        this.settings = settings;
    }

    get(): BaseRunner {
        if (process.platform === 'darwin') {
            return new MacRunner(this.state, this.settings);
        } else if (process.platform === 'win32') {
            return new WindowsRunner(this.state, this.settings);
        }

        return new LinuxRunner(this.state, this.settings);
    }
}
