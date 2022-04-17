const DiffMatchPatch = require("./diff_match_patch");
const { diffLines } = require("diff");

export enum DiffRangeType {
  Add,
  Delete,
}

export enum DiffHighlightType {
  Line,
  Word,
}

export class DiffPoint {
  row: number;
  column: number;

  constructor(row: number, column: number) {
    this.row = row;
    this.column = column;
  }

  static fromArray(range: number[]): DiffPoint {
    return new DiffPoint(range[0], range[1]);
  }
}

export class DiffRange {
  diffRangeType: DiffRangeType;
  diffHighlightType: DiffHighlightType;
  start: DiffPoint;
  stop: DiffPoint;

  constructor(
    diffRangeType: DiffRangeType,
    diffHighlightType: DiffHighlightType,
    start: DiffPoint,
    stop: DiffPoint
  ) {
    this.diffRangeType = diffRangeType;
    this.diffHighlightType = diffHighlightType;
    this.start = start;
    this.stop = stop;
  }

  static fromDiff(
    diffRangeType: DiffRangeType,
    source: string,
    index: number,
    length: number
  ): DiffRange {
    const start = cursorToRowAndColumn(source, index);
    const stop = cursorToRowAndColumn(source, index + length);

    // fix offsets for diffs occurring on the same line to be an exclusive range
    if (start[0] == stop[0]) {
      start[1]++;
      stop[1]++;
    }

    // if we're at a newline or the end, then start at the start of the next line
    let diffHighlightType = start[0] == stop[0] ? DiffHighlightType.Word : DiffHighlightType.Line;
    if (index + length == source.length - 1 || source[index] == "\n") {
      start[0]++;
      start[1] = 0;
      diffHighlightType = DiffHighlightType.Line;

      // make sure the entire line is consumed
      if (start[0] == stop[0] || index + length == source.length - 1) {
        stop[0]++;
        stop[1] = 0;
      }
    }

    return new DiffRange(
      diffRangeType,
      diffHighlightType,
      DiffPoint.fromArray(start),
      DiffPoint.fromArray(stop)
    );
  }
}

export function cursorToRowAndColumn(source: string, cursor: number): number[] {
  // iterate until the given substring index, incrementing rows and columns as we go
  let row = 0;
  let column = 0;
  for (let i = 0; i < cursor; i++) {
    column++;
    if (source[i] == "\n") {
      row++;
      column = 0;
    }
  }

  return [row, column];
}

/**
 * Computes the differences between two strings in a way that vscode
 * can then use to smartly insert and remove. This prevents the UI from flashing
 * in certain languages.
 * 
 * @param before The string before the change.
 * @param after The string after the change.
 * @returns An array of differences.
 */
export function codeDiff(before: string, after: string): any[] {
  const differences = diffLines(before, after);

  let changes = [];
  let row = 0;
  let column = 0;

  for (const d of differences) {
    const text = d.value;

    if (d.added) {
      changes.push({
        insertion: true,
        column,
        row,
        text
      })
    }

    let old_row = row;
    let old_column = column;

    for (const c of text) {
      column++;
      if (c == '\n') {
        row++;
        column = 0;
      }
    }

    if (d.removed) {
      changes.push({
        insertion: false,
        r1: old_row,
        r2: row,
        c1: old_column,
        c2: column
      })

      row = old_row;
      column = old_column;
    }
  }

  return changes;
}

export function diff(before: string, after: string): DiffRange[] {
  const diffMatchPatch = new DiffMatchPatch();
  let diffs = diffMatchPatch.diff_main(before, after);
  diffMatchPatch.diff_cleanupSemantic(diffs);

  let result = [];
  let beforeIndex = -1;
  let afterIndex = -1;

  for (const entry of diffs) {
    if (entry[0] == 0) {
      beforeIndex += entry[1].length;
      afterIndex += entry[1].length;
    } else if (entry[0] == 1) {
      result.push(DiffRange.fromDiff(DiffRangeType.Add, after, afterIndex, entry[1].length));
      afterIndex += entry[1].length;
    } else if (entry[0] == -1) {
      result.push(DiffRange.fromDiff(DiffRangeType.Delete, before, beforeIndex, entry[1].length));
      beforeIndex += entry[1].length;
    }
  }

  return result;
}
