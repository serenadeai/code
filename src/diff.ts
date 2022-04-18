const DiffMatchPatch = require("./diff_match_patch");

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
 * can then use "replace" only the modified text.
 * 
 * @param before The string before the change.
 * @param after The string after the change.
 * 
 * @returns An object with the following properties:
 * 
 * - `start_row`: The row of the start of the change.
 * - `start_column`: The column of the start of the change.
 * - `stop_row`: The row of the end of the change.
 * - `stop_column`: The column of the end of the change.
 * - `insertion_text`: The text to insert.
 */
export function codeDiff(before: string, after: string): any {
  let start_row = 0;
  let start_column = 0;
  let stop_row = 0;
  let stop_column = 0;

  let insertion_text = "";

  let start_index = 0;
  let stop_index = 0;

  // Find the longest shared prefix
  for (let i = 0; i < Math.min(before.length, after.length); i++) {
    if (before[i] !== after[i]) {
      break;
    }
    start_index = i + 1;
  }

  // Find the longest shared postfix
  for (let i = 1; i <= Math.min(before.length - start_index, after.length - start_index); i++) {
    if (before[before.length - i] !== after[after.length - i]) {
      break;
    }
    stop_index = i;
  }

  // Compute the row and column of the start of the change
  for (let i = 0; i < start_index; i++) {
    if (before[i] === "\n") {
      start_row += 1;
      start_column = 0;
    } else {
      start_column += 1;
    }
  }

  // update stop_row and stop_column to match start_row and start_column
  stop_row = start_row;
  stop_column = start_column;

  // Compute the row and column of the end of the change. During insertions we 
  // will iterate over nothing and stop will be the same as start. During a 
  // deletion or change we will iterate over the code that is to be modified.
  // This places stop at the end of the modification, "selecting" the text to 
  // be replaced.
  for (let i = start_index; i < before.length - stop_index; i++) {
    if (before[i] === "\n") {
      stop_row += 1;
      stop_column = 0;
    } else {
      stop_column += 1;
    }
  }

  // Compute the insertion text
  insertion_text = after.substring(start_index, after.length - stop_index);

  return {
    start_row,
    start_column,
    stop_row,
    stop_column,
    insertion_text
  };
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
