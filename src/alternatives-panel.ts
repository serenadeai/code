export default class AlternativesPanel {
    private root: string;

    constructor(root: string) {
        this.root = root;
    }

    public html() {
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
    src: url(vscode-resource:${
            this.root}/fonts/fa-solid-900.eot?#iefix) format("embedded-opentype"),url(vscode-resource:${
            this.root}/fonts/fa-solid-900.woff2) format("woff2"),url(vscode-resource:${
            this.root}/fonts/fa-solid-900.woff) format("woff"),url(vscode-resource:${
            this.root}/fonts/fa-solid-900.ttf) format("truetype"),url(vscode-resource:${
            this.root}/fonts/fa-solid-900.svg#fontawesome) format("svg");
}
.fa, .fas {
    font-family: "Font Awesome 5 Free";
    font-weight: 900;
}
    </style>

    <link rel="stylesheet" href="vscode-resource:${this.root}/out/alternatives-panel.css" />
  </head>

  <body class="hidden">
    <div class="success-color"></div>
    <div class="alternatives">
      <div class="alternatives-logo-container">
        <div class="alternatives-logo">
          <img src="vscode-resource:${this.root}/img/wordmark.png" />
        </div>
        <div class="alternatives-status"></div>
      </div>
      <div class="alternatives-token-container">
        <div class="alternatives-token-controls">
          <input type="text" class="input-token" placeholder="Enter your token." />
          <button class="btn btn-token-save">Save</button>
        </div>
        <div class="alternatives-token-text">
          Register for a Serenade token
          <a href="https://serenade.ai/register">here</a>.
        </div>
      </div>
      <div class="alternatives-volume-container">
        <div class="alternatives-listen-controls">
            <button class="btn btn-listen">Listen</button>
            <button class="btn btn-menu">
            <i class="fas fa-chevron-down"></i>
            <div class="menu-dropdown hidden">
                <a href="#" class="btn-clear">Clear</a>
                <a href="#" class="btn-help">Help</a>
            </div>
        </div>
        </button>
        <div class="alternatives-bar-container">
          <div class="alternatives-bar success-color-light"></div>
        </div>
      </div>
      <div class="alternatives-list-container">
        <div class="alternatives-header"></div>
        <div class="alternatives-list"></div>
      </div>
    </div>
    <script src="vscode-resource:${this.root}/src/alternatives.js"></script>
  </body>
</html>`;
    }
}
