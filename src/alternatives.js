const vscode = acquireVsCodeApi();
let state = {};

window.addEventListener('message', event => {
    if (event.data.event.startsWith('state:')) {
        const key = event.data.event.split(':')[1];
        state[key] = event.data.data;
        vscode.setState(state);
        stateHandlers[key](event.data.data, event.data.previous);
    }
});

const stateHandlers = {
    alternatives: (data, previous) => {
        // show alternatives if specified
        if ('alternatives' in data) {
            let header = '';
            if (data.alternatives.length === 0) {
                if (data.type === 'files') {
                    header = 'No matching files found.';
                }
            }
            else if (data.alternatives.length > 1) {
                header = 'Did you mean';
            }

            document.querySelector('.alternatives-header').innerHTML = header;
            document.querySelector('.alternatives-list').innerHTML =
                alternativeRows(data.alternatives, {truncate: data.type === 'files' ? 50 : false});
        }

        // show suggestions if there aren't any alternatives
        else if (!previous || (previous && 'alternatives' in previous)) {
            const suggestions = randomSuggestions(5);
            document.querySelector('.alternatives-header').innerHTML = 'Try saying';
            document.querySelector('.alternatives-list').innerHTML = suggestionRows(suggestions);
        }
    },

    highlighted: (index, previous) => {
        const alternatives = getState('alternatives');
        if (!('alternatives' in alternatives)) {
            return;
        }

        const rows = document.querySelectorAll('.alternatives-list .alternative-row:not(.invalid)');
        if (index < rows.length) {
            rows[index].classList.add('success-color-light');
        }
    },

    status: (status, previous) => {
        document.querySelector('.alternatives-status').innerHTML = status;
        document.querySelector('.btn-listen').innerHTML = status === 'Listening' ? 'Pause' : 'Listen';
        if (status === 'Paused') {
            vscode.postMessage({event: 'setState', key: 'volume', value: 0});
        }
    },

    help: (visible, previous) => {
        const text = visible ? 'Close Help' : 'Help'
        document.querySelector('.btn-help').innerHTML = text;
    },

    volume: (volume, previous) => {
        volume = volume || 0;
        document.querySelector('.alternatives-bar').style.width = volume + '%';
    },

    ready: (ready, previous) => {
        document.body.classList.remove('hidden');
        let $token = document.querySelector('.alternatives-token-container');
        let $volume = document.querySelector('.alternatives-volume-container');
        let $list = document.querySelector('.alternatives-list-container');

        if (ready === 'initializing') {
            $token.classList.add('hidden');
            $volume.classList.add('hidden');
            $list.classList.add('hidden');
        }
        else if (ready === 'token') {
            $token.classList.remove('hidden');
            $volume.classList.add('hidden');
            $list.classList.add('hidden');
        }
        else {
            $token.classList.add('hidden');
            $volume.classList.remove('hidden');
            $list.classList.remove('hidden');
        }
    }
};

const alternativeRows = (alternatives, options) => {
    let allInvalid = true;
    let index = 1;
    let rows = alternatives.map((e, i) => {
        // for invalid commands, show an X rather than a number
        let rowClass = '';
        let number = index.toString();
        if (e.sequences && e.sequences.length === 1 && e.sequences[0].commands &&
            e.sequences[0].commands.length === 1 && e.sequences[0].commands[0].type === 'COMMAND_TYPE_INVALID') {
            number = '&times';
            rowClass = 'invalid';
        }
        else {
            allInvalid = false;
            index++;
        }

        // replace code markup with appropriate HTML
        let newline = false;
        let description = e.description.replace(/<code>([\s\S]+)<\/code>/g, (s, m) => {
            if (m.includes('\n')) {
                newline = true;
                return `<div class="alternative-code"><pre>${escape(m)}</pre></div>`;
            }
            else {
                if (options && options.truncate !== false) {
                    m = truncate(m, options.truncate);
                }

                return ` <pre class="inline">${escape(m)}</pre>`;
            }
        });

        return `
<a class="alternative-row ${rowClass}" data-index="${number}">
    <div class="alternative-number">
        ${number}
    </div>
    <div class="alternative-description ${newline ? 'has-newline' : ''}">${description}</div>
</a>`;
    });

    return rows.join('');
};

const escape = s => {
    if (!s) {
        return s;
    }

    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const getState = key => {
    return state[key];
};

const initialize = () => {
    // toggle dropdown on dropdown button click
    document.querySelector('.btn-menu').addEventListener('click', () => {
        document.querySelector('.btn-menu i').classList.toggle('active');
        let $dropdown = document.querySelector('.menu-dropdown');
        if ($dropdown.classList.contains('active')) {
            $dropdown.classList.toggle('active');
            setTimeout(() => {
                $dropdown.classList.add('hidden');
            }, 200);
        }
        else {
            $dropdown.classList.remove('hidden');
            setTimeout(() => {
                $dropdown.classList.toggle('active');
            }, 1);
        }
    });

    // toggle listening state (managed by client) on listen button click
    document.querySelector('.btn-listen').addEventListener('click', () => {
        const status = getState('status');
        if (status === 'Listening') {
            vscode.postMessage({event: 'sendIPC', type: 'DISABLE_LISTENING'});
        }
        else {
            vscode.postMessage({event: 'sendIPC', type: 'ENABLE_LISTENING'});
        }
    });

    // toggle help state on help button click
    document.querySelector('.btn-help').addEventListener('click', () => {
        const help = getState('help');
        vscode.postMessage({event: 'setState', key: 'help', value: !help});
    });

    // send clear command on clear button click
    document.querySelector('.btn-clear').addEventListener('click', () => {
        vscode.postMessage({event: 'sendIPC', type: 'SEND_TEXT', data: {text: 'cancel'}});
    });

    // send use command on alternative click
    document.querySelector('.alternatives-list').addEventListener('click', e => {
        let $row = e.target.closest('.alternative-row');
        if ($row.classList.contains('suggestion')) {
            return;
        }

        let index = $row.getAttribute('data-index');
        vscode.postMessage({event: 'sendIPC', type: 'SEND_TEXT', data: {text: `use ${index}`}});
    });

    // save authentication token on save click
    document.querySelector('.btn-token-save').addEventListener('click', () => {
        vscode.postMessage({event: 'setToken', token: document.querySelector('.input-token').value});
        vscode.postMessage({event: 'setState', key: 'ready', value: 'ready'});
        vscode.postMessage({event: 'sendIPC', type: 'RELOAD_SETTINGS'});
    });

    const state = vscode.getState();
    if (state) {
        for (const key of Object.keys(state)) {
            stateHandlers[key](state[key], null);
        }
    }

    // vscode supplies theme variables via CSS4 variables, which aren't compatible with SCSS color functions (yet).
    // some are supplied as hex values, and others are supplied as RGB triples, so we can't rely on parsing those.
    // so, we create elements with the desired colors, use getComputedStyle to return RGB, and manually perform
    // the color manipulations. this is kind of crazy.
    window.onload = () => {
        const rgbSuccess = getComputedStyle(document.querySelector('.success-color'))['background-color'].match(/\d+/g);
        document.querySelector('.success-color').style.display = 'none';

        let style = document.createElement('style');
        document.head.appendChild(style);
        style.sheet.insertRule(
            `.success-color-light { background: rgba(${rgbSuccess[0]}, ${rgbSuccess[1]}, ${rgbSuccess[2]}, 0.4); }`, 0
        );
    };
};

const randomSuggestions = n => {
    let choices = suggestions();
    let result = [];
    for (let i = 0; i < n; i++) {
        result.push(choices.splice(Math.floor(Math.random() * choices.length), 1)[0]);
    }

    return result;
};

const suggestionRows = suggestions => {
    let rows = suggestions.map((e, i) => {
        return `
<a class="alternative-row suggestion">
    <div class="alternative-description">${e}</div>
</a>`;
    });

    return rows.join('');
};

const truncate = (string, size) => {
    if (string.length <= size) {
        return string;
    }

    size -= '...'.length;
    size = Math.floor(size / 2);
    return string.substr(0, size) + '...' + string.substr(string.length - size);
};

const suggestions = () => {
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
        'add call say with argument message'
    ];
};

initialize();
