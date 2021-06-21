import * as vscode from "vscode";
import BaseCommandHandler from "./shared/command-handler";
import * as diff from "./shared/diff";
const ignoreParser: any = require("gitignore-globs");

export default class CommandHandler extends BaseCommandHandler {
  private activeEditor?: vscode.TextEditor;
  private errorColor: string = "255, 99, 71";
  private openFileList: any[] = [];
  private successColor: string = "43, 161, 67";
  private languageToExtension: { [key: string]: string[] } = {
    c: ["c", "h"],
    cpp: ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++"],
    csharp: ["cs"],
    css: ["css", "scss"],
    dart: ["dart"],
    go: ["go"],
    html: ["html", "vue", "svelte"],
    java: ["java"],
    javascript: ["js", "jsx"],
    javascriptreact: ["jsx", "js"],
    jsx: ["jsx", "js"],
    kotlin: ["kt"],
    python: ["py"],
    ruby: ["rb"],
    rust: ["rs"],
    scss: ["scss"],
    shellscript: ["sh", "bash"],
    typescript: ["ts", "tsx"],
    typescriptreact: ["tsx", "ts"],
    vue: ["vue", "html"],
  };

  async focus(): Promise<any> {
    this.updateActiveEditor();
    if (!this.activeEditor) {
      return;
    }

    await vscode.window.showTextDocument(this.activeEditor!.document);
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
      this.updateActiveEditor();
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
        await vscode.commands.executeCommand("revealLine", {
          lineNumber: cursor,
          at: "center",
        });
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

  updateActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    this.activeEditor = editor;
  }

  getCursorPosition(position: any, text: string) {
    const row = position.line;
    const column = position.character;

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
    return cursor;
  }

  async COMMAND_TYPE_CLOSE_TAB(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_CLOSE_WINDOW(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_COPY(data: any): Promise<any> {
    if (data && data.text) {
      vscode.env.clipboard.writeText(data.text);
    }

    await this.uiDelay();
  }

  async COMMAND_TYPE_CREATE_TAB(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");
    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_DUPLICATE_TAB(_data: any): Promise<any> {}

  async COMMAND_TYPE_GET_EDITOR_STATE(data: any): Promise<any> {
    let result = {
      message: "editorState",
      data: {
        source: "",
        cursor: 0,
        selectionStart: 0,
        selectionEnd: 0,
        filename: "",
        files: this.openFileList.map((e: any) => e.path),
        roots: vscode.workspace.workspaceFolders
          ? vscode.workspace.workspaceFolders.map((e: any) => e.uri.path)
          : [],
      },
    };

    if (!this.activeEditor) {
      return result;
    }

    result.data.filename = this.filenameFromLanguage(
      this.activeEditor!.document.fileName,
      this.activeEditor!.document.languageId,
      this.languageToExtension
    );

    if (data.limited) {
      return result;
    }

    const position = this.activeEditor!.selection.active;
    const anchorPosition = this.activeEditor!.selection.anchor;
    const text = this.activeEditor!.document.getText();

    const cursor = this.getCursorPosition(position, text);
    const anchor = this.getCursorPosition(anchorPosition, text);
    if (cursor != anchor) {
      result.data.selectionStart = cursor > anchor ? anchor : cursor;
      result.data.selectionEnd = cursor < anchor ? anchor : cursor;
    }

    result.data.source = text;
    result.data.cursor = this.getCursorPosition(position, text);

    return result;
  }

  async COMMAND_TYPE_DEBUGGER_CONTINUE(_data: any): Promise<any> {
    vscode.commands.executeCommand("workbench.action.debug.continue");
  }

  async COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT(_data: any): Promise<any> {
    await vscode.commands.executeCommand("editor.debug.action.toggleInlineBreakpoint");
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

  async COMMAND_TYPE_EVALUATE_IN_PLUGIN(data: any): Promise<any> {
    vscode.commands.executeCommand(data.text);
  }

  async COMMAND_TYPE_GO_TO_DEFINITION(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("editor.action.revealDefinition");
  }

  async COMMAND_TYPE_NEXT_TAB(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("workbench.action.nextEditor");
    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_OPEN_FILE(data: any): Promise<any> {
    await vscode.window.showTextDocument(this.openFileList[data.index || 0]);
  }

  async COMMAND_TYPE_OPEN_FILE_LIST(data: any): Promise<any> {
    await this.focus();

    const path = data.path
      .replace(/\//, "*/*")
      .split("")
      .map((e: string) => {
        if (e == " ") {
          return "*";
        } else if (e.match(/[a-z]/)) {
          return `{${e.toUpperCase()},${e.toLowerCase()}}`;
        }

        return e;
      })
      .join("");

    let exclude: string[] = [
      "**/.git",
      "**/.hg",
      "**/node_modules",
      "**/npm_packages",
      "**/npm",
      ...Object.keys(
        (await vscode.workspace.getConfiguration("search", null).get("exclude")) || {}
      ),
      ...Object.keys((await vscode.workspace.getConfiguration("files", null).get("exclude")) || {}),
    ];

    const ignorePath = await vscode.workspace.findFiles(".gitignore");
    if (ignorePath.length > 0) {
      exclude = exclude.concat(
        ignoreParser._map(
          ignoreParser._prepare(
            Buffer.from(await vscode.workspace.fs.readFile(ignorePath[0]))
              .toString("utf-8")
              .split("\n")
          )
        )
      );
    }

    this.openFileList = await vscode.workspace.findFiles(
      `**/*${path}*`,
      `{${exclude.map((e: string) => e.replace(/\\/g, "/")).join(",")}}`,
      10
    );

    return { message: "sendText", data: { text: `callback open` } };
  }

  async COMMAND_TYPE_PREVIOUS_TAB(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("workbench.action.previousEditor");
    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_REDO(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("redo");
    await this.scrollToCursor();
  }

  async COMMAND_TYPE_SAVE(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("workbench.action.files.save");
  }

  async COMMAND_TYPE_SPLIT(data: any): Promise<any> {
    await this.focus();
    const direction = data.direction.toLowerCase();
    const split = direction.charAt(0).toUpperCase() + direction.slice(1);
    await vscode.commands.executeCommand(`workbench.action.splitEditor${split}`);
    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_STYLE(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("editor.action.formatDocument");
    await this.uiDelay();
  }

  async COMMAND_TYPE_SWITCH_TAB(data: any): Promise<any> {
    await this.focus();
    if (data.index < 0) {
      await vscode.commands.executeCommand("workbench.action.lastEditorInGroup");
    } else {
      await vscode.commands.executeCommand(`workbench.action.openEditorAtIndex${data.index}`);
    }

    await this.uiDelay();
    this.updateActiveEditor();
  }

  async COMMAND_TYPE_UNDO(_data: any): Promise<any> {
    await this.focus();
    await vscode.commands.executeCommand("undo");
    await this.scrollToCursor();
  }

  async COMMAND_TYPE_WINDOW(data: any): Promise<any> {
    await this.focus();
    const direction = data.direction.toLowerCase();
    const split = direction.charAt(0).toUpperCase() + direction.slice(1);
    await vscode.commands.executeCommand(`workspace.action.focus${split}Group`);
    await this.uiDelay();
    this.updateActiveEditor();
  }
}
