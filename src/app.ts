import * as vscode from 'vscode';

import AlternativesPanel from './alternatives-panel';
import ClientRunnerFactory from './client-runner/client-runner-factory';
import CommandHandler from './command-handler';
import DocsPanel from './docs-panel';
import IPC from './ipc';
import Settings from './settings';
import StateManager from './state-manager';
import BaseRunner from './client-runner/base-runner';

export default class App {
    clientRunner?: BaseRunner;
    context: vscode.ExtensionContext;
    ipc?: IPC;
    onDestroy: () => void;
    settings?: Settings;
    state?: StateManager;

    constructor(context: vscode.ExtensionContext, onDestroy: () => void) {
        this.context = context;
        this.onDestroy = onDestroy;
    }

    handleMessage(message: any) {
        if (message.event === 'sendIPC') {
            this.ipc!.send(message.type, message.data);
        } else if (message.event === 'setState') {
            this.state!.set(message.key, message.value);
        } else if (message.event === 'showDocsPanel') {
            // don't show the same panel multiple times
            if (!this.state!.get(`docs-${message.url}`)) {
                this.showDocsPanel(message.url);
            }
        }
    }

    showDocsPanel(url: string) {
        const docsPanel = new DocsPanel(this.context.extensionPath, url);
        const docsWebviewPanel = vscode.window.createWebviewPanel(
            `serenade-${url}`,
            'Serenade Docs',
            vscode.ViewColumn.Three,
            { enableScripts: true }
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
        const alternativesWebviewPanel = vscode.window.createWebviewPanel(
            'serenade',
            'Serenade',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(root)],
                retainContextWhenHidden: true
            }
        );

        this.state = new StateManager([alternativesWebviewPanel.webview]);
        this.settings = new Settings();
        this.clientRunner = new ClientRunnerFactory(this.state, this.settings).get();
        const commandHandler = new CommandHandler(this.state, alternativesWebviewPanel);
        this.ipc = new IPC(this.state, commandHandler);

        alternativesWebviewPanel.webview.html = alternativesPanel.html();
        alternativesWebviewPanel.onDidDispose(() => {
            this.clientRunner!.kill();
            this.onDestroy();
        });

        alternativesWebviewPanel.webview.onDidReceiveMessage(
            message => {
                this.handleMessage(message);
            },
            undefined,
            this.context.subscriptions
        );

        this.state.subscribe('nuxCompleted', (completed: any, _previous: any) => {
            this.settings!.set('nux_completed', completed);
        });

        this.state.subscribe('token', (token: any, _previous: any) => {
            this.settings!.set('token', token);
        });

        this.state.set('loggedIn', true);
        this.state.set('nuxCompleted', this.settings.get('nux_completed'));
        this.state.set('alternatives', {});
        this.state.set('volume', 0);
        this.state.set('listening', false);
        this.state.set('status', 'Paused');
        this.ipc.start();

        this.clientRunner.installAndRun(() => {
            const token = this.settings!.get('token');
            this.state!.set('loggedIn', token && token.length);
        });
    }
}
