export default class Suggestions {
    all(): string[] {
        return [
            'new tab',
            'next tab',
            'previous tab',
            'close tab',
            'go to tab three',
            'next word',
            'next line',
            'previous line',
            'split left',
            'split right',
            'left window',
            'right window',
            'line one',
            'copy next two words',
            'go to phrase hello world',
            'paste',
            'cut function',
            'copy class',
            'delete if',
            'indent line two times',
            'indent next five lines',
            'dedent line',
            'save',
            'style file',
            'undo',
            'redo',
            'copy phrase foobar',
            'change return value to 50',
            'newline',
            'next character',
            'previous word',
            'go to end of line',
            'go to start of word',
            'delete to end of line',
            'delete three words',
            'go to third character',
            'go to second word',
            'delete second argument',
            'copy previous five lines',
            'delete last four words',
            'next class',
            'previous function',
            'go to return value',
            'cut third import',
            'type function',
            'type pascal case hello world',
            'type underscores hello world',
            'type all caps hello world',
            'add argument bar',
            'add function called hello',
            'add parameter foo',
            'add class styler',
            'add import requests',
            'add import numpy as np',
            'add assert false',
            'add decorator app dot get',
            'add return true',
            'add if a less than three',
            'add method init',
            'add return',
            'add while counter greater than zero',
            'add try',
            'add print hi',
            'add function underscore get',
            'add parent class exception',
            'add call say with argument message',
        ];
    }

    random(n: number): string[] {
        let choices = this.all();
        let result = [];
        for (let i = 0; i < n; i++) {
            result.push(choices.splice(Math.floor(Math.random() * choices.length), 1)[0]);
        }

        return result;
    }
}
