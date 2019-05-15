import * as vscode from 'vscode';
import App from './app';

export function activate(context: vscode.ExtensionContext) {
    let shown = false;
    const app = new App(context, () => {
        shown = false;
    });

    const show = () => {
        if (!shown) {
            app.start();
        }

        shown = true;
    };

    context.subscriptions.push(vscode.commands.registerCommand('extension.serenadeEnable', () => {
        show();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.serenadeShowTranscriptInput', () => {
        show();
        vscode.window.showInputBox({placeHolder: 'Enter a Serenade command.'}).then(result => {
            app.ipc!.send('SEND_TEXT', {text: result});
        });
    }));
}

export function deactivate() {
}
