import * as path from "path";
import * as vscode from "vscode";
import minimatch from "minimatch";
import App from "./app";
import BaseCommandHandler from "./shared/command-handler";
import * as diff from "./shared/diff";
import Settings from "./shared/settings";
const ignoreParser: any = require("gitignore-globs");

export default class CommandHandler extends BaseCommandHandler {
  private activeEditor?: vscode.TextEditor;
  private errorColor: string = "255, 99, 71";
  private openFileList: any[] = [];
  private successColor: string = "43, 161, 67";

  private filenameForEditor(editor: vscode.TextEditor): string {
    const filename = "file";
    const languageToFilename: { [key: string]: string } = {
      css: `${filename}.css`,
      dart: `${filename}.dart`,
      html: `${filename}.html`,
      less: `${filename}.less`,
      java: `${filename}.java`,
      javascript: `${filename}.js`,
      javascriptreact: `${filename}.js`,
      kotlin: `${filename}.kt`,
      python: `${filename}.py`,
      scss: `${filename}.scss`,
      typescript: `${filename}.ts`,
      typescriptreact: `${filename}.tsx`,
    };

    if (languageToFilename[editor.document.languageId]) {
      return languageToFilename[editor.document.languageId];
    }

    return editor.document.fileName;
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
      const decorations = steps.map((e) =>
        vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${
            range.diffRangeType == diff.DiffRangeType.Delete ? this.errorColor : this.successColor
          }, 0.${e})`,
          isWholeLine: range.diffHighlightType == diff.DiffHighlightType.Line,
        })
      );

      // atom and vs code use different types of ranges
      if (range.diffHighlightType == diff.DiffHighlightType.Line) {
        range.stop.row--;
      }

      for (let i = 0; i < steps.length; i++) {
        setTimeout(() => {
          this.activeEditor!.setDecorations(decorations[i], [
            new vscode.Range(
              range.start.row,
              range.start.column,
              range.stop.row,
              range.stop.column
            ),
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
      new vscode.Selection(startRow, startColumn, endRow, endColumn),
    ];
  }

  setSourceAndCursor(before: string, source: string, row: number, column: number) {
    if (!this.activeEditor) {
      return;
    }

    if (before != source) {
      this.activeEditor!.edit((edit) => {
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
      roots: vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders.map((e: any) => e.uri.path)
        : [],
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
      data: result,
    };
  }

  async COMMAND_TYPE_DEBUGGER_CONTINUE(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.continue");
  }

  async COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT(_data: any): Promise<any> {
    vscode.commands.executeCommand("editor.debug.action.toggleInlineBreakpoint");
  }

  async COMMAND_TYPE_DEBUGGER_PAUSE(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.pause");
  }

  async COMMAND_TYPE_DEBUGGER_SHOW_HOVER(_data: any): Promise<any> {
    await this.focus();
    vscode.commands.executeCommand("editor.debug.action.showDebugHover");
  }

  async COMMAND_TYPE_DEBUGGER_START(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.start");
  }

  async COMMAND_TYPE_DEBUGGER_STEP_INTO(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.stepInto");
  }

  async COMMAND_TYPE_DEBUGGER_STEP_OUT(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.stepOut");
  }

  async COMMAND_TYPE_DEBUGGER_STEP_OVER(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.stepOver");
  }

  async COMMAND_TYPE_DEBUGGER_STOP(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.stop");
  }

  async COMMAND_TYPE_DEBUGGER_TOGGLE_BREAKPOINT(_data: any): Promise<any> {
    vscode.commands.executeCommand("editor.debug.action.toggleBreakpoint");
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
    vscode.window.showTextDocument(this.openFileList[data.index || 0]);
  }

  async COMMAND_TYPE_OPEN_FILE_LIST(data: any): Promise<any> {
    await this.focus();

    const path = data.path
      .split("")
      .map((e: string) => (e == " " ? "*" : `{${e.toUpperCase()},${e.toLowerCase()}}`))
      .join("");

    let excludes: string[] = [];
    const ignorePath = await vscode.workspace.findFiles(".gitignore");
    if (ignorePath.length > 0) {
      excludes = ignoreParser._map(
        ignoreParser._prepare(
          Buffer.from(await vscode.workspace.fs.readFile(ignorePath[0]))
            .toString("utf-8")
            .split("\n")
        )
      );
    }

    this.openFileList = (await vscode.workspace.findFiles(`**/*${path}*`, undefined, 100))
      .filter((e: any) => excludes.every((exclude: string) => !minimatch(e.path, exclude)))
      .slice(0, 10);

    return { message: "sendText", data: { text: `callback open` } };
  }

  async COMMAND_TYPE_PASTE(data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    vscode.env.clipboard.readText().then((text) => {
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
