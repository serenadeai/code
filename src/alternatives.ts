import BaseAlternatives from './shared/alternatives';

declare var acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

class Alternatives extends BaseAlternatives {
    state: {[key: string]: any} = {};

    addComputedStyleElement(element: HTMLElement) {
        document.head.appendChild(element);
    }

    eventHandlers(): {[event: string]: any} {
        return {
            alternatives: this.onAlternatives,
            appState: this.onAppState,
            highlighted: this.onHighlighted,
            listening: this.onListening,
            loading: this.onLoading,
            loginError: this.onLoginError,
            nuxCompleted: this.onNuxCompleted,
            nuxStep: this.onNuxStep,
            'status': this.onStatus,
            volume: this.onVolume
        };
    }

    getLoginFields() {
        return {
            email: (this.$('.input-login-email') as HTMLInputElement).value,
            password: (this.$('.input-login-password') as HTMLInputElement).value
        };
    }

    getRegisterFields() {
        return {
            name: (this.$('.input-register-name') as HTMLInputElement).value,
            email: (this.$('.input-register-email') as HTMLInputElement).value,
            password: (this.$('.input-register-password') as HTMLInputElement).value
        };
    }

    getState(key: string) {
        return this.state[key];
    }

    initialize() {
        window.addEventListener('message', event => {
            let handlers = this.eventHandlers();
            if (event.data.event.startsWith('state:')) {
                const key = event.data.event.split(':')[1];
                this.state[key] = event.data.data;
                vscode.setState(this.state);
                if (key in handlers) {
                    handlers[key].call(this, event.data.data, event.data.previous);
                }
            }
        });

        super.initialize();
    }

    sendIPC(message: string, data: {[key: string]: any}) {
        vscode.postMessage({event: 'sendIPC', type: message, data: data});
    }

    setState(key: string, value: any) {
        vscode.postMessage({event: 'setState', key: key, value: value});
    }

    setupLoginEvents() {
        // login form submission
        this.$('.alternatives-login-form')!.addEventListener('submit', () => {
            this.login();
        });
        this.$('.btn-login')!.addEventListener('click', () => {
            this.login();
        });
    }

    setupRegisterEvents() {
        // register form submission
        this.$('.alternatives-register-form')!.addEventListener('submit', () => {
            this.register();
        });
        this.$('.btn-register')!.addEventListener('click', () => {
            this.register();
        });
    }

    showDocsPanel(url: string) {
        vscode.postMessage({event: 'showDocsPanel', url: url});
    }
}

window.onload = () => {
    new Alternatives().initialize();
};
