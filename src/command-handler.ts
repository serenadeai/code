import * as path from "path";
import * as vscode from "vscode";

import App from "./app";
import BaseCommandHandler from "./shared/command-handler";
import * as diff from "./shared/diff";
import Settings from "./shared/settings";

export default class CommandHandler extends BaseCommandHandler {
  private pendingFiles: vscode.Uri[] = [];
  private errorColor: string = "255, 99, 71";
  private successColor: string = "43, 161, 67";
  private activeEditor?: vscode.TextEditor;

  private openPendingFileAtIndex(index: number) {
    if (index < 0 || index >= this.pendingFiles.length) {
      return;
    }

    vscode.workspace.openTextDocument(this.pendingFiles[index]);
    this.pendingFiles = [];
  }

  async focus(): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    vscode.window.showTextDocument(this.activeEditor!.document);
    await this.uiDelay();
  }

  getActiveEditorText(): string | undefined {
    if (!this.activeEditor) {
      return undefined;
    }

    return this.activeEditor!.document.getText();
  }

  highlightRanges(ranges: diff.DiffRange[]) {
    const duration = 250;
    const steps = [1, 2, 3, 4, 3, 2, 1];
    const step = duration / steps.length;
    const editor = vscode.window.activeTextEditor;
    if (!editor || ranges.length == 0) {
      return;
    }

    for (const range of ranges) {
      console.log(range);

      const decorations = steps.map(e =>
        vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${
            range.diffRangeType == diff.DiffRangeType.Delete ? this.errorColor : this.successColor
          }, 0.${e})`,
          isWholeLine: range.diffHighlightType == diff.DiffHighlightType.Line
        })
      );

      // atom and vs code use different types of ranges
      if (range.diffHighlightType == diff.DiffHighlightType.Line) {
        range.stop.row--;
      }

      for (let i = 0; i < steps.length; i++) {
        setTimeout(() => {
          this.activeEditor!.setDecorations(decorations[i], [
            new vscode.Range(range.start.row, range.start.column, range.stop.row, range.stop.column)
          ]);

          setTimeout(() => {
            editor.setDecorations(decorations[i], []);
            if (i == steps.length - 1) {
              decorations.map(e => e.dispose());
            }
          }, step);
        }, i * step);
      }
    }
  }

  pollActiveEditor() {
    setInterval(() => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      this.activeEditor = editor;
    }, 1000);
  }

  async scrollToCursor(): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    const cursor = this.activeEditor!.selection.start.line;
    if (this.activeEditor!.visibleRanges.length > 0) {
      const range = this.activeEditor!.visibleRanges[0];
      const buffer = 5;
      if (cursor < range.start.line + buffer || cursor > range.end.line - buffer) {
        await vscode.commands.executeCommand("revealLine", { lineNumber: cursor, at: "center" });
      }
    }
  }

  setSourceAndCursor(before: string, source: string, row: number, column: number) {
    if (!this.activeEditor) {
      return;
    }

    if (before != source) {
      this.activeEditor!.edit(edit => {
        var firstLine = this.activeEditor!.document.lineAt(0);
        var lastLine = this.activeEditor!.document.lineAt(
          this.activeEditor!.document.lineCount - 1
        );
        var textRange = new vscode.Range(
          0,
          firstLine.range.start.character,
          this.activeEditor!.document.lineCount - 1,
          lastLine.range.end.character
        );

        edit.replace(textRange, source);
      });
    }

    this.activeEditor!.selections = [new vscode.Selection(row, column, row, column)];
  }

  async COMMAND_TYPE_CLOSE_TAB(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await this.uiDelay();
  }

  async COMMAND_TYPE_CLOSE_WINDOW(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await this.uiDelay();
  }

  async COMMAND_TYPE_COPY(data: any): Promise<any> {
    if (data && data.text) {
      vscode.env.clipboard.writeText(data.text);
    }

    await this.uiDelay();
  }

  async COMMAND_TYPE_CREATE_TAB(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("workbench.action.files.newUntitledFile");
    await this.uiDelay();
  }

  async COMMAND_TYPE_DIFF(data: any): Promise<any> {
    await this.updateEditor(data.source, data.cursor);
  }

  async COMMAND_TYPE_GET_EDITOR_STATE(_data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    let result = { source: "", cursor: 0, filename: "" };
    const position = this.activeEditor!.selection.active;
    const row = position.line;
    const column = position.character;
    const text = this.activeEditor!.document.getText();

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

      if (text[i] === "\n") {
        currentRow++;
      }

      cursor++;
    }

    result.source = text;
    result.cursor = cursor;
    result.filename = path.basename(this.activeEditor!.document.fileName);
    return result;
  }

  async COMMAND_TYPE_GO_TO_DEFINITION(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("editor.action.revealDefinition");
  }

  async COMMAND_TYPE_NEXT_TAB(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("workbench.action.nextEditor");
    await this.uiDelay();
  }

  async COMMAND_TYPE_OPEN_FILE(data: any): Promise<any> {
    await this.focus();
    const path = (data.path as string).replace(" ", "*");
    vscode.workspace
      .findFiles(`*${path}*`, "{**/node_modules/**,*.class,*.jar,**/__pycache__/**}", 10)
      .then(files => {
        this.pendingFiles = files;
        let prefixLength = 0;
        if (files.length > 1) {
          while (prefixLength < files[0].path.length) {
            let different = false;
            for (const f of files) {
              if (
                prefixLength < f.path.length &&
                f.path[prefixLength] !== files[0].path[prefixLength]
              ) {
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
          return { description: `open <code>${e.path.substring(prefixLength)}</code>` };
        });
      });
  }

  async COMMAND_TYPE_PASTE(data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    vscode.env.clipboard.readText().then(text => {
      const source = this.activeEditor!.document.getText();
      this.pasteText(source, data, text);
    });
  }

  async COMMAND_TYPE_PREVIOUS_TAB(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("workbench.action.previousEditor");
    await this.uiDelay();
  }

  async COMMAND_TYPE_REDO(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("redo");
    await this.scrollToCursor();
  }

  async COMMAND_TYPE_SAVE(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("workbench.action.files.save");
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
    await this.focus();
    vscode.commands.executeCommand("undo");
    await this.scrollToCursor();
  }

  async COMMAND_TYPE_WINDOW(data: any): Promise<any> {
    await this.focus();
    const direction = data.direction.toLowerCase();
    const split = direction.charAt(0).toUpperCase() + direction.slice(1);
    vscode.commands.executeCommand(`workspace.action.focus${split}Group`);
    await this.uiDelay();
  }
}
