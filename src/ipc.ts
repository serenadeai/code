import * as http from 'http';

import CommandHandler from './command-handler';
import StateManager from './state-manager';

export default class IPC {
    private server?: http.Server;
    private state: StateManager;
    private commandHandler: CommandHandler;

    constructor(state: StateManager, commandHandler: CommandHandler) {
        this.state = state;
        this.commandHandler = commandHandler;

        this.state.subscribe('listening', (listening: any, _previous: any) => {
            this.send(listening ? 'DISABLE_LISTENING' : 'ENABLE_LISTENING');
        });
    }

    async handle(response: any): Promise<any> {
        if (response.alternatives) {
            this.state.set('alternatives', { alternatives: response.alternatives });
        }

        let result = null;
        if (response.execute) {
            this.state.set('volume', 0);
            for (let i = 0; i < response.execute.sequences.length; i++) {
                let sequence = response.execute.sequences[i];

                for (let command of sequence.commands) {
                    result = await (this.commandHandler as any)[command.type](command);
                }
            }
        }

        return result;
    }

    send(type: any, data: any = {}) {
        data.type = type;
        let json = JSON.stringify(data);

        let request = http.request({
            host: 'localhost',
            port: 17373,
            path: '/',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) }
        });

        request.write(json);
        request.end();
    }

    start() {
        this.server = http.createServer((request, response) => {
            let body = '';
            request.on('data', data => {
                body += data;
            });

            request.on('end', async () => {
                let parseResponse = JSON.parse(body);
                let result = await this.handle(parseResponse);
                if (!result) {
                    result = { success: true };
                }

                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify(result));
            });
        });

        this.server.once('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
                console.error('Serenade is already running in another editor window.', {
                    description:
                        'Serenade only supports running in one window at a time for now. Close this window to use Serenade.',
                    dismissable: false
                });

                return;
            }
        });

        this.server.listen(17374);
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}
