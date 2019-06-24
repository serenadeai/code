const vscode = acquireVsCodeApi();
let state = {};

const $ = e => {
    return document.querySelector(e);
};

const $$ = e => {
    return document.querySelectorAll(e);
};

window.addEventListener('message', event => {
    if (event.data.event.startsWith('state:')) {
        const key = event.data.event.split(':')[1];
        state[key] = event.data.data;
        vscode.setState(state);
        if (key in stateHandlers) {
            stateHandlers[key](event.data.data, event.data.previous);
        }
    }
});

const stateHandlers = {
    alternatives: (data, previous) => {
        // show alternatives if specified
        if ('alternatives' in data) {
            let header = '';
            if (data.alternatives.length === 0) {
                if (data.type === 'files') {
                    header = 'No matching files found';
                }
            } else if (data.alternatives.length > 1) {
                header = 'Did you mean';
            }

            const validRows = alternativeRows(data.alternatives, {
                truncate: data.type === 'files' ? 50 : false,
                validOnly: true
            });

            const $valid = $('.alternatives-valid');
            if (validRows.length > 0) {
                $valid.classList.remove('hidden');
                $('.alternatives-valid-header').innerHTML =
                    data.type === 'files' ? 'Select a file' : 'Select a command';
                $('.alternatives-valid-list').innerHTML = validRows.join('');
            } else {
                $valid.classList.add('hidden');
            }

            const invalidRows = alternativeRows(data.alternatives, {
                invalidOnly: true
            });

            const $invalid = $('.alternatives-invalid');
            if (invalidRows.length > 0) {
                $invalid.classList.remove('hidden');
                $('.alternatives-invalid-header').innerHTML = 'Invalid commands';
                $('.alternatives-invalid-list').innerHTML = invalidRows.join('');
            } else {
                $invalid.classList.add('hidden');
            }
        }

        // show suggestions if there aren't any alternatives
        else if (
            getState('nuxCompleted') &&
            (data.suggestions || !previous || (previous && 'alternatives' in previous))
        ) {
            $('.alternatives-valid').classList.remove('hidden');
            $('.alternatives-valid-header').innerHTML = 'Try saying';
            $('.alternatives-valid-list').innerHTML = suggestionRows(randomSuggestions(5));

            $('.alternatives-invalid').classList.add('hidden');
            $('.alternatives-invalid-header').innerHTML = '';
            $('.alternatives-invalid-list').innerHTML = '';
        }
    },

    highlighted: (index, previous) => {
        const alternatives = getState('alternatives');
        if (!('alternatives' in alternatives)) {
            return;
        }

        const rows = $$('.alternatives-valid-list .alternative-row:not(.invalid)');
        if (index < rows.length) {
            rows[index].classList.add('success-color-light');
        }
    },

    loading: (on, previous) => {
        if (on) {
            $('.alternatives-valid-header').innerHTML =
                '<div class="lds-ring"><div></div><div></div><div></div><div></div></div>Loading...';
        }
    },

    listening: (on, previous) => {
        $('.btn-listen').innerHTML = on ? 'Pause' : 'Listen';
        if (on) {
            $('.listening-indicator').classList.remove('hidden');
        } else {
            $('.listening-indicator').classList.add('hidden');
        }
    },

    nuxCompleted: (completed, previous) => {
        if (completed) {
            $('.nux').classList.add('hidden');
            return;
        }

        setState('nuxStep', 0);
        $('.nux').classList.remove('hidden');
        $('.btn-nux-next').addEventListener('click', () => {
            const stepIndex = getState('nuxStep');
            if (stepIndex < nuxSteps().length - 1) {
                setState('nuxStep', stepIndex + 1);
            } else {
                setState('nuxCompleted', true);
                setState('alternatives', { suggestions: true });
            }
        });
    },

    nuxStep: (stepIndex, previous) => {
        const steps = nuxSteps();
        const step = steps[stepIndex];
        $('.btn-nux-next').innerHTML = stepIndex === steps.length - 1 ? 'Close' : 'Next';
        $('.nux-progress').style.width = Math.ceil((stepIndex / (steps.length - 1)) * 100) + '%';
        $('.nux-heading').innerHTML = step.title;
        $('.nux-body').innerHTML = step.body;
    },

    status: (status, previous) => {
        $('.alternatives-status').innerHTML = status;
    },

    volume: (volume, previous) => {
        volume = volume || 0;
        $('.alternatives-bar').style.width = volume + '%';
    },

    loggedIn: (loggedIn, previous) => {
        document.body.classList.remove('hidden');
        const $token = $('.alternatives-token-container');
        const $volume = $('.alternatives-volume-container');
        const $list = $('.alternatives-list-container');
        const $nux = $('.nux');

        if (!loggedIn) {
            $token.classList.remove('hidden');
            $volume.classList.add('hidden');
            $list.classList.add('hidden');
            $nux.classList.add('hidden');
            $('.alternatives-status').innerHTML = '';
        } else {
            $token.classList.add('hidden');
            $volume.classList.remove('hidden');
            $list.classList.remove('hidden');

            if (!getState('nuxCompleted')) {
                $nux.classList.remove('hidden');
            }
        }
    }
};

const alternativeRows = (alternatives, options) => {
    let index = 1;
    return alternatives
        .map((e, i) => {
            // for invalid commands, show an X rather than a number
            let rowClass = '';
            let number = index.toString();
            if (
                e.sequences &&
                e.sequences.length === 1 &&
                e.sequences[0].commands &&
                e.sequences[0].commands.length === 1 &&
                e.sequences[0].commands[0].type === 'COMMAND_TYPE_INVALID'
            ) {
                number = '&times';
                rowClass = 'invalid';
                if (options.validOnly) {
                    return null;
                }
            } else {
                index++;
                if (options.invalidOnly) {
                    return null;
                }
            }

            // replace code markup with appropriate HTML
            let newline = e.sequences.some(s => s.commands.some(c => c.type === 'COMMAND_TYPE_SNIPPET_EXECUTED'));
            let description = e.description.replace(/<code>([\s\S]+)<\/code>/g, (s, m) => {
                if (m.includes('\n') || newline) {
                    newline = true;
                    return `<div class="alternative-code"><pre>${escape(m)}</pre></div>`;
                } else {
                    if (options && options.truncate !== false) {
                        m = truncate(m, options.truncate);
                    }

                    return ` <pre class="inline">${escape(m)}</pre>`;
                }
            });

            return `
<a class="alternative-row ${rowClass} ${newline ? 'has-newline' : ''}" data-index="${number}">
    <div class="alternative-row-inner">
        <div class="alternative-number">
            <div class="alternative-number-inner">${number}</div>
        </div>
        <div class="alternative-description">${description}</div>
    </div>
</a>`;
        })
        .filter(e => e !== null);
};

const escape = s => {
    if (!s) {
        return s;
    }

    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const getState = key => {
    return state[key];
};

const setState = (key, value) => {
    vscode.postMessage({ event: 'setState', key: key, value: value });
};

const restoreState = () => {
    const state = vscode.getState();
    if (state) {
        for (const key of Object.keys(state)) {
            if (key in stateHandlers) {
                stateHandlers[key](state[key], null);
            }
        }
    }
};

const initialize = () => {
    // show token input on login button click
    $('.btn-login').addEventListener('click', () => {
        $('.alternatives-login-buttons').classList.add('hidden');
        $('.alternatives-token-controls-container').classList.remove('hidden');
    });

    // toggle dropdown on dropdown button click
    $('.btn-menu').addEventListener('click', () => {
        $('.btn-menu i').classList.toggle('active');
        let $dropdown = $('.menu-dropdown');
        if ($dropdown.classList.contains('active')) {
            $dropdown.classList.toggle('active');
            setTimeout(() => {
                $dropdown.classList.add('hidden');
            }, 200);
        } else {
            $dropdown.classList.remove('hidden');
            setTimeout(() => {
                $dropdown.classList.toggle('active');
            }, 1);
        }
    });

    // toggle listening state (managed by client) on listen button click
    $('.btn-listen').addEventListener('click', () => {
        const listening = !!getState('listening');
        setState('listening', !listening);
    });

    // show guide panel
    $('.btn-guide').addEventListener('click', () => {
        vscode.postMessage({ event: 'showDocsPanel', url: 'https://docs.serenade.ai' });
    });

    // show reference panel
    $('.btn-reference').addEventListener('click', () => {
        vscode.postMessage({ event: 'showDocsPanel', url: 'https://docs.serenade.ai/docs/reference.html' });
    });

    // send clear command on clear button click
    $('.btn-clear').addEventListener('click', () => {
        vscode.postMessage({ event: 'sendIPC', type: 'SEND_TEXT', data: { text: 'cancel' } });
    });

    // send use command on alternative click
    $('.alternatives-valid-list').addEventListener('click', e => {
        let $row = e.target.closest('.alternative-row');
        if ($row.classList.contains('suggestion')) {
            return;
        }

        let index = $row.getAttribute('data-index');
        vscode.postMessage({ event: 'sendIPC', type: 'SEND_TEXT', data: { text: `use ${index}` } });
    });

    // save authentication token on save click
    $('.btn-token-save').addEventListener('click', () => {
        setState('token', $('.input-token').value);
        setState('loggedIn', true);
        vscode.postMessage({ event: 'sendIPC', type: 'RELOAD_SETTINGS' });
    });

    // vscode supplies theme variables via CSS4 variables, which aren't compatible with SCSS color functions (yet).
    // some are supplied as hex values, and others are supplied as RGB triples, so we can't rely on parsing those.
    // so, we create elements with the desired colors, use getComputedStyle to return RGB, and manually perform
    // the color manipulations. this is kind of crazy.
    window.onload = () => {
        const rgbSuccess = getComputedStyle($('.success-color'))['background-color'].match(/\d+/g);
        $('.success-color').style.display = 'none';

        let style = document.createElement('style');
        document.head.appendChild(style);
        style.sheet.insertRule(
            `.success-color-light { background: rgba(${rgbSuccess[0]}, ${rgbSuccess[1]}, ${rgbSuccess[2]}, 0.4); }`,
            0
        );
    };

    restoreState();
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

const nuxSteps = () => {
    return [
        {
            title: 'Welcome to Serenade!',
            body: 'This guide will walk you through an introduction to Serenade.'
        },
        {
            title: 'Setup',
            body:
                "You should keep Serenade open in a panel that's side-by-side with the code you're editing, " +
                "since you'll need to see what's displayed here."
        },
        {
            title: 'Tabs and alternatives',
            body:
                '<p>Start by pressing the Listen button above. Now, say "new tab" to create a new tab.</p>' +
                "<p>You might see a list of alternatives appear on screen. This list appears when Serenade isn't " +
                'exactly sure what you said. When it appears, you can say "clear" to clear the list and start over, ' +
                'continue speaking a command, or say "use" followed by the number you want to select, like "use one" ' +
                'or "use three".</p>'
        },
        {
            title: 'Save',
            body:
                'Now, let\'s write some Python. First, say "save" to invoke the save dialog, then save the file ' +
                'as hello.py.'
        },
        {
            title: 'Add import',
            body:
                'Try saying "add import random" to add an import statement. Remember, you\'ll need to say ' +
                '"use one" in order to run the command, or "clear" to try again.'
        },
        {
            title: 'Undo',
            body:
                'If you accidentally select the wrong alternative, you can always say "undo" to go back. ' +
                '"redo" also works.'
        },
        {
            title: 'Add function',
            body: 'Next, create a function by saying "add function get random", followed by a "use" command.'
        },
        {
            title: 'Add parameter',
            body:
                'You can add a parameter called "number" to your function by saying "add parameter number", ' +
                'followed by a "use" command.'
        },
        {
            title: 'Add return',
            body: 'Let\'s give the function a body. Say "add return 4" to add a return statement.'
        },
        {
            title: 'Cursor movement',
            body:
                'You can move around the cursor with commands like "up", "next line", or "line one". ' +
                'Try saying "line one".'
        },
        {
            title: 'Deletion',
            body: 'Now, to delete the import statement we added earlier, try saying "delete line".'
        },
        {
            title: 'Learn more',
            body:
                "That's it for our introduction! As a next step, take a look at the " +
                '<a href="https://docs.serenade.ai">Serenade guide</a> to learn more.'
        }
    ];
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
