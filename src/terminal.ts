import * as vscode from 'vscode';

export default class Terminal {
    private active(): vscode.Terminal|undefined {
        return vscode.window.activeTerminal;
    }

    private cursorMarker(): string {
        return '~#~';
    }

    private async delay(): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 5);
        });
    }

    private async executeAndWait(command: string): Promise<any> {
        vscode.commands.executeCommand(command);
        return this.delay();
    }

    private lineMarker(): string {
        return '^@^';
    }

    async down(n = 1): Promise<any> {
        for (let i = 0; i < n; i++) {
            await this.send('\x1B[B');
        }
    }

    async focus(): Promise<any> {
        if (!this.active()) {
            await this.executeAndWait('workbench.action.terminal.toggleTerminal');
        }
    }

    async getState(): Promise<any> {
        await this.focus();
        await this.send(this.cursorMarker());
        await this.executeAndWait('workbench.action.terminal.moveToLineStart');
        await this.send(this.lineMarker());
        await this.executeAndWait('workbench.action.terminal.selectAll');
        await this.executeAndWait('workbench.action.terminal.copySelection');
        await this.executeAndWait('workbench.action.terminal.clearSelection');
        const allText = await vscode.env.clipboard.readText();
        const lineWithMarker =
            allText.substring(allText.lastIndexOf(this.lineMarker()) + this.lineMarker().length).trim();

        const cursor = lineWithMarker.indexOf(this.cursorMarker());
        const lineWithoutMarker = lineWithMarker.replace(this.cursorMarker(), '');
        await this.setState(lineWithoutMarker, cursor);

        return new Promise(resolve => {
            resolve({'source': lineWithoutMarker, 'cursor': cursor});
        });
    }

    async left(n = 1): Promise<any> {
        for (let i = 0; i < n; i++) {
            await this.send('\x1B[D');
        }
    }

    async right(n = 1): Promise<any> {
        for (let i = 0; i < n; i++) {
            await this.send('\x1B[C');
        }
    }

    async send(text: string): Promise<any> {
        await this.focus();
        const terminal = this.active();
        if (!terminal) {
            return;
        }

        terminal!.sendText(text, false);
        await this.delay();
    }

    async setState(source: string, cursor: number) {
        await this.focus();
        await this.executeAndWait('workbench.action.terminal.moveToLineEnd');
        await this.executeAndWait('workbench.action.terminal.deleteToLineStart');
        await this.send(source);
        await this.left(source.length - cursor);
    }

    async up(n = 1): Promise<any> {
        for (let i = 0; i < n; i++) {
            await this.send('\x1B[A');
        }
    }
}
