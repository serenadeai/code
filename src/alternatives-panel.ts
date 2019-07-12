import BaseAlternativesPanel from './shared/alternatives-panel';

export default class AlternativesPanel extends BaseAlternativesPanel {
    private root: string;

    constructor(root: string) {
        super();
        this.root = root;
    }

    html(): string {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <link rel="stylesheet" href="vscode-resource:${this.root}/css/fontawesome.min.css" />
    <style>
@font-face {
    font-family: "Font Awesome 5 Free";
    font-style: normal;
    font-weight: 900;
    font-display: auto;
    src: url(vscode-resource:${this.root}/fonts/fa-solid-900.eot);
    src: url(vscode-resource:${this.root}/fonts/fa-solid-900.eot?#iefix) format("embedded-opentype"),
            url(vscode-resource:${this.root}/fonts/fa-solid-900.woff2) format("woff2"),
            url(vscode-resource:${this.root}/fonts/fa-solid-900.woff) format("woff"),
            url(vscode-resource:${this.root}/fonts/fa-solid-900.ttf) format("truetype"),
            url(vscode-resource:${this.root}/fonts/fa-solid-900.svg#fontawesome) format("svg");
}

.fa, .fas {
    font-family: "Font Awesome 5 Free";
    font-weight: 900;
}
    </style>

    <link rel="stylesheet" href="vscode-resource:${this.root}/build/alternatives-panel.css" />
  </head>

  <body>
    ${super.html()}
    <script src="vscode-resource:${this.root}/build/alternatives.js"></script>
  </body>
</html>`;
    }

    logo(): string {
        return `<img src="vscode-resource:${this.root}/img/wordmark.png" />`;
    }
}
