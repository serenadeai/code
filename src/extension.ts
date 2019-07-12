import * as vscode from 'vscode';
import App from './app';

let app: App|null = null;
let activated = false;

export function activate(context: vscode.ExtensionContext) {
    let shown = false;
    let app = new App(context, () => {
        shown = false;
    });

    const show = () => {
        if (!shown) {
            app.start();
        }

        shown = true;
    };

    show();
    context.subscriptions.push(vscode.commands.registerCommand('extension.serenadeEnable', () => {
        show();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.serenadeShowTranscriptInput', () => {
        let delay = 0;
        if (!activated) {
            delay = 4000;
        }
        else if (!shown) {
            delay = 1000;
        }

        show();
        setTimeout(() => {
            vscode.window.showInputBox({placeHolder: 'Enter a Serenade command.'}).then(result => {
                app.ipc!.send('SEND_TEXT', {text: result});
            });
        }, delay);
    }));

    activated = true;
}

export function deactivate() {
}
