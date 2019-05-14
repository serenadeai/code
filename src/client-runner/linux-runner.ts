import BaseRunner from './base-runner';

export default class LinuxRunner extends BaseRunner {
    javaBinary() {
        return './java';
    }

    javaPath() {
        return 'bin';
    }

    jdkUrl() {
        return 'https://download.java.net/java/GA/jdk11/9/GPL/openjdk-11.0.2_linux-x64_bin.tar.gz';
    }

    jdkVersion() {
        return 'jdk-11.0.2';
    }
}
