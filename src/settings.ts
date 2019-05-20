import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';

export default class Settings {
    private data: any = {};
    private loaded: boolean = false;
    private defaults: any = {
        disable_autostart: false,
        ignore: ['.git/', '.gradle/', '.pyc$', '.class$', '.jar$', '.dylib$'],
        token: ''
    };

    private file(): string {
        return `${this.path()}/settings.json`;
    }

    private load(): void {
        if (this.loaded) {
            return;
        }

        this.data = {};
        mkdirp.sync(this.path());
        if (!fs.existsSync(this.file())) {
            return;
        }

        this.data = JSON.parse(fs.readFileSync(this.file()).toString());
        this.loaded = true;
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
        this.data[key] = value;
        this.save();
    }
}
