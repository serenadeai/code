import * as vscode from 'vscode';

export default class StateManager {
    private webviews: vscode.Webview[];
    private data: any;
    private callbacks: any;

    constructor(webviews: vscode.Webview[]) {
        this.webviews = webviews;
        this.data = {};
        this.callbacks = {};
    }

    get(key: string) {
        return this.data[key];
    }

    set(key: string, value: any) {
        let previous = this.data[key];
        if (previous) {
            previous = JSON.parse(JSON.stringify(this.data[key]));
        }

        // handle local callbacks for state change
        this.data[key] = value;
        if (key in this.callbacks) {
            for (let callback of this.callbacks[key]) {
                callback(value, previous);
            }
        }

        // forward state change to all webviews
        for (const webview of this.webviews) {
            webview.postMessage({event: `state:${key}`, data: value, previous: previous});
        }
    }

    subscribe(key: string, callback: Function) {
        if (!(key in this.callbacks)) {
            this.callbacks[key] = [];
        }

        this.callbacks[key].push(callback);
    }
}
