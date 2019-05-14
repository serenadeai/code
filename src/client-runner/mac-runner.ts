import BaseRunner from './base-runner';

export default class MacRunner extends BaseRunner {
    javaBinary() {
        return './java';
    }

    javaPath() {
        return 'bin';
    }

    jdkUrl() {
        return `https://cdn.serenade.ai/jdk/jdk-mac-${this.jdkVersion()}.tar.gz`;
    }

    jdkVersion() {
        return 'fa019a048911b0fd95c7bac642244f34';
    }
}
