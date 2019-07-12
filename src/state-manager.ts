import * as vscode from 'vscode';
import StateManager from './shared/state-manager';

export default class VSStateManager extends StateManager {
    private webviews: vscode.Webview[];

    constructor(webviews: vscode.Webview[]) {
        super();
        this.webviews = webviews;
    }

    protected afterSet(key: string, value: any, previous: any) {
        // forward state change to all webviews
        for (const webview of this.webviews) {
            webview.postMessage({event: `state:${key}`, data: value, previous: previous});
        }
    }
}
