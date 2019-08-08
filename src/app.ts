import * as vscode from 'vscode';

import AlternativesPanel from './alternatives-panel';
import CommandHandler from './command-handler';
import DocsPanel from './docs-panel';
import Highlight from './highlight';
import BaseApp from './shared/app';
import ClientRunnerFactory from './shared/client-runner/client-runner-factory';
import IPC from './shared/ipc';
import Settings from './shared/settings';
import VSStateManager from './state-manager';

export default class App extends BaseApp {
    private context: vscode.ExtensionContext;
    private alternativesWebviewPanel?: vscode.WebviewPanel;
    private highlight?: Highlight;

    onDestroy: () => void;

    constructor(context: vscode.ExtensionContext, onDestroy: () => void) {
        super();
        this.context = context;
        this.onDestroy = onDestroy;
    }

    async focus() {
        const index = this.alternativesWebviewPanel!.viewColumn;
        const column = index === 2 ? 'First' : 'Second';
        vscode.commands.executeCommand(`workbench.action.focus${column}EditorGroup`);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    handleMessage(message: any) {
        if (message.event === 'sendIPC') {
            this.ipc!.send(message.type, message.data);
        }
        else if (message.event === 'setState') {
            this.state!.set(message.key, message.value);
        }
        else if (message.event === 'showDocsPanel') {
            // don't show the same panel multiple times
            if (!this.state!.get(`docs-${message.url}`)) {
                this.showDocsPanel(message.url);
            }
        }
    }

    showDocsPanel(url: string) {
        const docsPanel = new DocsPanel(this.context.extensionPath, url);
        const docsWebviewPanel = vscode.window.createWebviewPanel(
            `serenade-${url}`, 'Serenade Docs', vscode.ViewColumn.Three, {enableScripts: true}
        );

        docsWebviewPanel.onDidDispose(() => {
            this.state!.set(`docs-${url}`, false);
        });

        docsWebviewPanel.webview.html = docsPanel.html();
        this.state!.set(`docs-${url}`, true);
    }

    start() {
        const root = this.context.extensionPath;
        const alternativesPanel = new AlternativesPanel(root);
        this.alternativesWebviewPanel = vscode.window.createWebviewPanel(
            'serenade',
            'Serenade',
            vscode.ViewColumn.Two,
            {enableScripts: true, localResourceRoots: [vscode.Uri.file(root)], retainContextWhenHidden: true}
        );

        this.settings = new Settings();
        this.state = new VSStateManager([this.alternativesWebviewPanel.webview]);
        this.highlight = new Highlight(this.state);
        this.clientRunner = new ClientRunnerFactory(this.state, this.settings).get();
        const commandHandler = new CommandHandler(this, this.state, this.settings, this.alternativesWebviewPanel);
        this.ipc = new IPC(this.state, commandHandler, this.clientRunner, 'Code');

        this.alternativesWebviewPanel.webview.html = alternativesPanel.html();
        this.alternativesWebviewPanel.onDidDispose(() => {
            this.destroy();
            this.onDestroy();
        });

        this.alternativesWebviewPanel.webview.onDidReceiveMessage(message => {
            this.handleMessage(message);
        }, undefined, this.context.subscriptions);

        this.run();
    }
}
