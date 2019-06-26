import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';

export default class Settings {
    private data: any = {};
    private defaults: any = {
        disable_autostart: false,
        ignore: ['.git/', '.gradle/', '.pyc$', '.class$', '.jar$', '.dylib$'],
        token: ''
    };

    private file(): string {
        return `${this.path()}/settings.json`;
    }

    private load(): void {
        this.data = {};
        mkdirp.sync(this.path());
        if (!fs.existsSync(this.file())) {
            return;
        }

        try {
            this.data = JSON.parse(fs.readFileSync(this.file()).toString());
        } catch (error) {}
    }

    get(key: string): any {
        this.load();
        if (this.data[key] === undefined) {
            return this.defaults[key];
        }

        return this.data[key];
    }

    path() {
        return `${os.homedir()}/.serenade`;
    }

    save() {
        mkdirp.sync(this.path());
        fs.writeFileSync(this.file(), JSON.stringify(this.data));
    }

    set(key: string, value: any) {
        this.load();
        this.data[key] = value;
        this.save();
    }
}
