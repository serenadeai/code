export default class DocsPanel {
    private root: string;
    private url: string;

    constructor(root: string, url: string) {
        this.root = root;
        this.url = url;
    }

    public html() {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
html, body  {
    margin: 0;
    padding: 0;
}

html, body, iframe {
    height: 100%;
    width: 100%;
}
    </style>
  </head>

  <body>
    <iframe src="${this.url}" frameBorder="0"></iframe>
    <script src="vscode-resource:${this.root}/src/docs.js"></script>
  </body>
</html>`;
    }
}
