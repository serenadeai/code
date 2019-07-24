import * as path from 'path';
import * as vscode from 'vscode';

import App from './app';
import CommandHandlerBase from './shared/command-handler';
import StateManager from './shared/state-manager';

export default class CommandHandler implements CommandHandlerBase {
    private app: App;
    private state: StateManager;
    private webviewPanel: vscode.WebviewPanel;
    private pendingFiles: vscode.Uri[] = [];

    constructor(app: App, state: StateManager, webviewPanel: vscode.WebviewPanel) {
        this.app = app;
        this.state = state;
        this.webviewPanel = webviewPanel;
    }

    private async focus() {
        const index = this.webviewPanel.viewColumn;
        const column = index === 2 ? 'First' : 'Second';
        vscode.commands.executeCommand(`workbench.action.focus${column}EditorGroup`);
        await this.uiDelay();
    }

    private openPendingFileAtIndex(index: number) {
        if (index < 0 || index >= this.pendingFiles.length) {
            return;
        }

        vscode.workspace.openTextDocument(this.pendingFiles[index]);
        this.pendingFiles = [];
    }

    private async scrollToCursor() {
        const editor = vscode.window.activeTextEditor;
        if (editor !== undefined) {
            await vscode.commands.executeCommand('revealLine', {lineNumber: editor.selection.start.line, at: 'center'});
        }
    }

    private async setSourceAndCursor(source: string, cursor: number) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // iterate until the given substring index, incrementing rows and columns as we go
        let row = 0;
        let column = 0;
        for (let i = 0; i < cursor; i++) {
            column++;
            if (source[i] === '\n') {
                row++;
                column = 0;
            }
        }


        if (source != editor.document.getText()) {
            editor.edit(edit => {
                var firstLine = editor.document.lineAt(0);
                var lastLine = editor.document.lineAt(editor.document.lineCount - 1);
                var textRange = new vscode.Range(
                    0, firstLine.range.start.character, editor.document.lineCount - 1, lastLine.range.end.character
                );

                edit.replace(textRange, source);
            });
        }

        editor.selections = [new vscode.Selection(row, column, row, column)];
        await this.scrollToCursor();
    }

    private async uiDelay() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    async COMMAND_TYPE_CANCEL(_data: any): Promise<any> {
        this.state.set('alternatives', {suggestions: true});
    }

    async COMMAND_TYPE_CLOSE_TAB(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        await this.uiDelay();
    }

    async COMMAND_TYPE_CLOSE_WINDOW(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        await this.uiDelay();
    }

    async COMMAND_TYPE_COPY(data: any): Promise<any> {
        await this.focus();
        if (data && data.text) {
            vscode.env.clipboard.writeText(data.text);
        }

        await this.uiDelay();
    }

    async COMMAND_TYPE_CREATE_TAB(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('workbench.action.files.newUntitledFile');
        await this.uiDelay();
    }

    async COMMAND_TYPE_DIFF(data: any): Promise<any> {
        await this.focus();
        await this.setSourceAndCursor(data.source, data.cursor);
    }

    async COMMAND_TYPE_GET_EDITOR_STATE(_data: any): Promise<any> {
        let result = {source: '', cursor: 0, filename: ''};

        await this.focus();
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const position = editor.selection.active;
        const row = position.line;
        const column = position.character;
        const text = editor.document.getText();

        // iterate through text, incrementing rows when newlines are found, and counting columns when row is right
        let cursor = 0;
        let currentRow = 0;
        let currentColumn = 0;
        for (let i = 0; i < text.length; i++) {
            if (currentRow === row) {
                if (currentColumn === column) {
                    break;
                }

                currentColumn++;
            }

            if (text[i] === '\n') {
                currentRow++;
            }

            cursor++;
        }

        result.source = text;
        result.cursor = cursor;
        result.filename = path.basename(editor.document.fileName);
        return result;
    }

    async COMMAND_TYPE_GO_TO_DEFINITION(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('editor.action.revealDefinition');
    }

    async COMMAND_TYPE_INVALID(_data: any): Promise<any> {
    }

    async COMMAND_TYPE_LOGIN(data: any): Promise<any> {
        if (data.text !== '' && data.text !== undefined) {
            this.state.set('appState', 'READY');
        }
        else {
            this.state.set('loginError', 'Invalid email/password.');
        }
    }

    async COMMAND_TYPE_NEXT_TAB(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('workbench.action.nextEditor');
        await this.uiDelay();
    }

    async COMMAND_TYPE_OPEN_FILE(data: any): Promise<any> {
        await this.focus();
        const path = (data.path as string).replace(' ', '*');
        vscode.workspace.findFiles(
                            `*${path}*`, '{**/node_modules/**,*.class,*.jar,**/__pycache__/**}', 10
        ).then(files => {
            this.pendingFiles = files;
            let prefixLength = 0;
            if (files.length > 1) {
                while (prefixLength < files[0].path.length) {
                    let different = false;
                    for (const f of files) {
                        if (prefixLength < f.path.length && f.path[prefixLength] !== files[0].path[prefixLength]) {
                            different = true;
                            break;
                        }
                    }

                    if (different) {
                        break;
                    }

                    prefixLength++;
                }
            }

            const alternatives = files.map(e => {
                return {description: `open <code>${e.path.substring(prefixLength)}</code>`};
            });

            this.state.set('alternatives', {alternatives: alternatives, alternativeType: 'files'});
        });
    }

    async COMMAND_TYPE_PASTE(data: any): Promise<any> {
        await this.focus();
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        vscode.env.clipboard.readText().then(text => {
            const source = editor.document.getText();
            let insertionPoint = data.cursor || 0;

            // if we specify a direction, it means that we want to paste as a line, so add a newline
            let updatedCursor = insertionPoint;
            if (data.direction && !text.endsWith('\n')) {
                text += '\n';
            }

            // paste on a new line if a direction is specified or we're pasting a full line
            if (text.endsWith('\n') || data.direction) {
                // default to paste below if there's a newline at the end
                data.direction = data.direction || 'below';

                // for below (the default), move the cursor to the start of the next line
                if (data.direction === 'below') {
                    for (; insertionPoint < source.length; insertionPoint++) {
                        if (source[insertionPoint] === '\n') {
                            insertionPoint++;
                            break;
                        }
                    }
                }

                // for paste above, go to the start of the current line
                else if (data.direction === 'above') {
                    // if we're at the end of a line, then move the cursor back one, or else we'll paste below
                    if (source[insertionPoint] === '\n' && insertionPoint > 0) {
                        insertionPoint--;
                    }

                    for (; insertionPoint >= 0; insertionPoint--) {
                        if (source[insertionPoint] === '\n') {
                            insertionPoint++;
                            break;
                        }
                    }
                }

                updatedCursor = insertionPoint;
            }

            // move the cursor to the end of the pasted text
            updatedCursor += text.length;
            if (text.endsWith('\n')) {
                updatedCursor--;
            }

            this.setSourceAndCursor(
                source.substring(0, insertionPoint) + text + source.substring(insertionPoint), updatedCursor
            );
        });
    }

    async COMMAND_TYPE_PAUSE(_data: any): Promise<any> {
        this.state.set('listening', false);
        this.state.set('status', 'Paused');
    }

    async COMMAND_TYPE_PING(_data: any): Promise<any> {
        this.app.ipc!.send('PING', {});
    }

    async COMMAND_TYPE_PREVIOUS_TAB(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('workbench.action.previousEditor');
        await this.uiDelay();
    }

    async COMMAND_TYPE_REDO(_data: any): Promise<any> {
        vscode.commands.executeCommand('redo');
        await this.scrollToCursor();
    }

    async COMMAND_TYPE_SAVE(_data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand('workbench.action.files.save');
    }

    async COMMAND_TYPE_SET_EDITOR_STATUS(data: any): Promise<any> {
        const text = data.text;
        if (data.volume) {
            this.state.set('volume', Math.floor(data.volume * 100));
        }

        this.state.set('status', text);
    }

    async COMMAND_TYPE_SNIPPET(data: any): Promise<any> {
        this.state.set('loading', true);
        this.app.ipc!.send('SEND_TEXT', {text: 'add executed snippet ' + data.text});
    }

    async COMMAND_TYPE_SNIPPET_EXECUTED(data: any): Promise<any> {
        await this.focus();
        await this.setSourceAndCursor(data.source, data.cursor);
    }

    async COMMAND_TYPE_SPLIT(data: any): Promise<any> {
        await this.focus();
        const direction = data.direction.toLowerCase();
        const split = direction.charAt(0).toUpperCase() + direction.slice(1);
        vscode.commands.executeCommand(`workbench.action.${split}`);
        await this.uiDelay();
    }

    async COMMAND_TYPE_SWITCH_TAB(data: any): Promise<any> {
        await this.focus();
        vscode.commands.executeCommand(`workbench.action.openEditorAtIndex${data.index}`);
        await this.uiDelay();
    }

    async COMMAND_TYPE_UNDO(_data: any): Promise<any> {
        vscode.commands.executeCommand('undo');
        await this.scrollToCursor();
    }

    async COMMAND_TYPE_USE(data: any): Promise<any> {
        let index = data.index ? data.index - 1 : 0;
        this.state.set('highlighted', index);
        let alternatives = this.state.get('alternatives');
        if ('type' in alternatives && alternatives.type === 'files') {
            this.openPendingFileAtIndex(index);
        }
    }

    async COMMAND_TYPE_WINDOW(data: any): Promise<any> {
        await this.focus();
        const direction = data.direction.toLowerCase();
        const split = direction.charAt(0).toUpperCase() + direction.slice(1);
        vscode.commands.executeCommand(`workspace.action.focus${split}Group`);
        await this.uiDelay();
    }
}
