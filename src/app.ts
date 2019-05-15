import * as vscode from 'vscode';

import AlternativesPanel from './alternatives-panel';
import ClientRunner from './client-runner/client-runner';
import CommandHandler from './command-handler';
import DocsPanel from './docs-panel';
import IPC from './ipc';
import Settings from './settings';
import StateManager from './state-manager';

export default class App {
    clientRunner?: ClientRunner;
    context: vscode.ExtensionContext;
    commandHandler?: CommandHandler;
    ipc?: IPC;
    onDestroy: () => void;
    settings?: Settings;
    state?: StateManager;

    constructor(context: vscode.ExtensionContext, onDestroy: () => void) {
        this.context = context;
        this.onDestroy = onDestroy;
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
        const alternativesWebviewPanel = vscode.window.createWebviewPanel(
            'serenade',
            'Serenade',
            vscode.ViewColumn.Two,
            {enableScripts: true, localResourceRoots: [vscode.Uri.file(root)]}
        );

        this.state = new StateManager([alternativesWebviewPanel.webview]);
        this.state.set('status', 'Ready');

        this.settings = new Settings();
        this.clientRunner = new ClientRunner(this.state, this.settings);
        this.commandHandler = new CommandHandler(this.state);
        this.ipc = new IPC(this.state, this.commandHandler);

        const alternativesPanel = new AlternativesPanel(root);
        alternativesWebviewPanel.webview.html = alternativesPanel.html();
        alternativesWebviewPanel.onDidDispose(() => {
            this.clientRunner!.runner.kill();
            this.onDestroy();
        });
        alternativesWebviewPanel.webview.onDidReceiveMessage(message => {
            if (message.event === 'sendIPC') {
                this.ipc!.send(message.type, message.data);
            }
            else if (message.event === 'setState') {
                this.state!.set(message.key, message.value);
            }
            else if (message.event === 'setToken') {
                this.settings!.setToken(message.token);
            }
            else if (message.event === 'showDocsPanel') {
                if (!this.state!.get(`docs-${message.url}`)) {
                    this.showDocsPanel(message.url);
                }
            }
        }, undefined, this.context.subscriptions);

        this.state.set('alternatives', {});
        this.state.set('help', false);
        this.state.set('ready', 'ready');
        this.state.set('volume', 0);
        this.ipc.start();

        this.clientRunner.runner.installAndRun(() => {
            const token = this.settings!.get('token');
            this.state!.set('status', 'Ready');
            this.state!.set('ready', token && token.length ? 'ready' : 'token');
        });
    }
}
