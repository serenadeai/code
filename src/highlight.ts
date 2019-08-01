import * as vscode from 'vscode';
import {DiffHighlightType, DiffRange, DiffRangeType} from './shared/diff';
import StateManager from './shared/state-manager';

export default class Highlight {
    private errorColor?: string;
    private successColor?: string;
    private state: StateManager;

    constructor(state: StateManager) {
        this.state = state;

        this.state.subscribe('setColor', (data: any, _previous: any) => {
            if (data.name == 'success-color') {
                this.successColor = data.value;
            }
            else if (data.name == 'error-color') {
                this.errorColor = data.value;
            }
        });

        this.state.subscribe('highlightedRanges', (ranges: DiffRange[], _previous: DiffRange[]) => {
            const duration = 250;
            const steps = [1, 2, 3, 4, 3, 2, 1];
            const step = duration / steps.length;
            const editor = vscode.window.activeTextEditor;
            if (!editor || ranges.length == 0) {
                return;
            }

            for (const range of ranges) {
                const decorations = steps.map(e => vscode.window.createTextEditorDecorationType({
                    backgroundColor: `rgba(${
                        range.diffRangeType == DiffRangeType.Delete ? this.errorColor : this.successColor}, 0.${e})`,
                    isWholeLine: range.diffHighlightType == DiffHighlightType.Line
                }));

                // atom and vs code use different types of ranges
                if (range.diffHighlightType == DiffHighlightType.Line) {
                    range.stop.row--;
                }

                for (let i = 0; i < steps.length; i++) {
                    setTimeout(() => {
                        editor.setDecorations(
                            decorations[i],
                            [new vscode.Range(range.start.row, range.start.column, range.stop.row, range.stop.column)]
                        );

                        setTimeout(() => {
                            editor.setDecorations(decorations[i], [])
                            if (i == steps.length - 1) {
                                decorations.map(e => e.dispose());
                            }
                        }, step);
                    }, i * step);
                }
            }
        });
    }
}
