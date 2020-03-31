import * as path from "path";
import * as vscode from "vscode";

import App from "./app";
import BaseCommandHandler from "./shared/command-handler";
import * as diff from "./shared/diff";
import Settings from "./shared/settings";

export default class CommandHandler extends BaseCommandHandler {
  private activeEditor?: vscode.TextEditor;
  private errorColor: string = "255, 99, 71";
  private openFileList: any[] = [];
  private successColor: string = "43, 161, 67";

  private filenameForEditor(editor: vscode.TextEditor): string {
    let filename = path.basename(editor.document.fileName);
    const known = ["js", "jsx", "vue", "ts", "tsx", "java", "py", "html", "css", "less", "scss"];
    for (const extension of known) {
      if (filename.endsWith(`.${extension}`)) {
        return filename;
      }
    }

    if (!filename) {
      filename = "file";
    }

    const languageToFilename: { [key: string]: string } = {
      javascript: `${filename}.js`,
      javascriptreact: `${filename}.js`,
      typescript: `${filename}.ts`,
      typescriptreact: `${filename}.tsx`,
      java: `${filename}.java`,
      python: `${filename}.py`,
      html: `${filename}.html`,
      css: `${filename}.css`,
      less: `${filename}.less`,
      scss: `${filename}.scss`
    };

    if (languageToFilename[editor.document.languageId]) {
      return languageToFilename[editor.document.languageId];
    }

    return filename;
  }

  private ignorePatterns(): string {
    return `{${this.settings.getIgnore().join(",")}}`;
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

  highlightRanges(ranges: diff.DiffRange[]): number {
    const duration = 300;
    const steps = [1, 2, 1];
    const step = duration / steps.length;
    const editor = vscode.window.activeTextEditor;
    if (!editor || ranges.length == 0) {
      return 0;
    }

    for (const range of ranges) {
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
            decorations[i].dispose();
          }, step);
        }, i * step);
      }
    }

    return 400;
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

  select(startRow: number, startColumn: number, endRow: number, endColumn: number) {
    if (!this.activeEditor) {
      return;
    }

    this.activeEditor!.selections = [
      new vscode.Selection(startRow, startColumn, endRow, endColumn)
    ];
  }

  setSourceAndCursor(before: string, source: string, row: number, column: number) {
    if (!this.activeEditor) {
      return;
    }

    if (before != source) {
      this.activeEditor!.edit(edit => {
        const firstLine = this.activeEditor!.document.lineAt(0);
        const lastLine = this.activeEditor!.document.lineAt(
          this.activeEditor!.document.lineCount - 1
        );

        const textRange = new vscode.Range(
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

  async COMMAND_TYPE_GET_EDITOR_STATE(_data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    let result = {
      source: "",
      cursor: 0,
      filename: "",
      files: this.openFileList.map((e: any) => e.path),
      roots: [vscode.workspace.rootPath]
    };

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
    result.filename = this.filenameForEditor(this.activeEditor!);

    return {
      message: "editorState",
      data: result
    };
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
    vscode.workspace
      .openTextDocument(this.openFileList[data.index || 0])
      .then(doc => vscode.window.showTextDocument(doc));
  }

  async COMMAND_TYPE_OPEN_FILE_LIST(data: any): Promise<any> {
    await this.focus();
    const path = (data.path as string).replace(" ", "*");
    return vscode.workspace.findFiles(`*${path}*`, this.ignorePatterns(), 20).then(files => {
      this.openFileList = files;
      return { message: "sendText", data: { text: `callback open` } };
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
    vscode.commands.executeCommand(`workbench.action.splitEditor${split}`);
    await this.uiDelay();
  }

  async COMMAND_TYPE_SWITCH_TAB(data: any): Promise<any> {
    await this.focus();
    if (data.index < 0) {
      vscode.commands.executeCommand("workbench.action.lastEditorInGroup");
    } else {
      vscode.commands.executeCommand(`workbench.action.openEditorAtIndex${data.index}`);
    }

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
