import * as path from 'path';
import * as vscode from 'vscode';
import BaseAlternativesPanel from './shared/alternatives-panel';

export default class AlternativesPanel extends BaseAlternativesPanel {
    private root: string;

    constructor(root: string) {
        super();
        this.root = root;
    }

    resource(...paths: string[]): string {
        return vscode.Uri.file(path.join(this.root, ...paths)).with({scheme: 'vscode-resource'}).toString();
    }

    html(): string {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <link rel="stylesheet" href="${this.resource('css', 'fontawesome.min.css')}" />
    <style>
@font-face {
    font-family: "Font Awesome 5 Free";
    font-style: normal;
    font-weight: 900;
    font-display: auto;
    src: url(${this.resource('fonts', 'fa-solid-900.eot')});
    src: url(${this.resource('fonts', 'fa-solid-900.woff2')}) format("woff2"),
            url(${this.resource('fonts', 'fa-solid-900.woff')}) format("woff"),
            url(${this.resource('fonts', 'fa-solid-900.ttf')}) format("truetype");
}

.fa, .fas {
    font-family: "Font Awesome 5 Free";
    font-weight: 900;
}
    </style>

    <link rel="stylesheet" href="${this.resource('build', 'alternatives-panel.css')}" />
  </head>

  <body>
    ${super.html()}
    <script src="${this.resource('build', 'alternatives.js')}"></script>
  </body>
</html>`;
    }

    logo(): string {
        return `<img src="${this.resource('img', 'wordmark.png')}" />`;
    }
}
