import * as vscode from 'vscode';

import AlternativesPanel from './alternatives-panel';
import ClientRunner from './client-runner/client-runner';
import CommandHandler from './command-handler';
import IPC from './ipc';
import Settings from './settings';
import StateManager from './state-manager';

export function activate(context: vscode.ExtensionContext) {
    const root = context.extensionPath;
    const alternativesWebviewPanel = vscode.window.createWebviewPanel('serenade', 'Serenade', vscode.ViewColumn.Two, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(context.extensionPath)]
    });

    const state = new StateManager([alternativesWebviewPanel.webview]);
    state.set('status', 'Ready');

    const settings = new Settings();
    const clientRunner = new ClientRunner(state, settings);
    const commandHandler = new CommandHandler(state);
    const ipc = new IPC(state, commandHandler);

    const alternativesPanel = new AlternativesPanel(root);
    alternativesWebviewPanel.webview.html = alternativesPanel.html();
    alternativesWebviewPanel.webview.onDidReceiveMessage(message => {
        if (message.event === 'sendIPC') {
            ipc.send(message.type, message.data);
        }
        else if (message.event === 'setState') {
            state.set(message.key, message.value);
        }
        else if (message.event === 'setToken') {
            settings.setToken(message.token);
        }
    }, undefined, context.subscriptions);

    state.set('alternatives', {});
    state.set('help', false);
    state.set('ready', 'ready');
    state.set('volume', 0);
    ipc.start();

    clientRunner.runner.installAndRun(() => {
        const token = settings.get('token');
        state.set('status', 'Ready');
        state.set('ready', token && token.length ? 'ready' : 'token');
    });

    context.subscriptions.push(vscode.commands.registerCommand('extension.serenadeEnable', () => {}));
    context.subscriptions.push(vscode.commands.registerCommand('extension.serenadeShowTranscriptInput', () => {
        vscode.window.showInputBox({placeHolder: 'Enter a Serenade command.'}).then(result => {
            ipc.send('SEND_TEXT', {text: result});
        });
    }));
}

export function deactivate() {
}
