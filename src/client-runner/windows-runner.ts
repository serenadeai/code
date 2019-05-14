import BaseRunner from './base-runner';

export default class WindowsRunner extends BaseRunner {
    javaBinary() {
        return 'java.exe';
    }

    javaPath() {
        return 'bin';
    }

    jdkUrl() {
        return 'https://download.java.net/java/GA/jdk11/9/GPL/openjdk-11.0.2_windows-x64_bin.zip';
    }

    jdkVersion() {
        return 'jdk-11.0.2';
    }
}
