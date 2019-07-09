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

  <body class="hidden">
    <div class="success-color"></div>
    <div class="alternatives-logo-container">
      <div class="alternatives-logo">
        <img src="vscode-resource:${this.root}/img/wordmark.png" />
      </div>
      <div class="hidden listening-indicator"></div>
      <div class="spacer"></div>
      <div class="alternatives-status"></div>
    </div>
    <div class="alternatives-login-container">
      <div class="alternatives-pre-login-buttons">
        <button class="btn btn-pre-login">Sign in</button>
        <button class="btn btn-pre-register">Sign up for Serenade</button>
      </div>
      <div class="alternatives-login hidden">
        <div class="login-error hidden"></div>
        <form class="alternatives-login-form">
          <input type="text" class="input-login-email" placeholder="Email" />
          <input type="password" class="input-login-password" placeholder="Password" />
          <button class="btn btn-login">
              Sign in
              <div class="lds-ring hidden"><div></div><div></div><div></div><div></div></div>
          </button>
          <a href="#" class="btn-login-alt btn-pre-register">Or sign up for an account</a>
        </form>
      </div>
      <div class="alternatives-register hidden">
        <div class="login-error hidden"></div>
        <form class="alternatives-register-form">
          <input type="text" class="input-register-name" placeholder="Full name" />
          <input type="text" class="input-register-email" placeholder="Email" />
          <input type="password" class="input-register-password" placeholder="Password" />
          <button class="btn btn-register">
              Sign up for Serenade
              <div class="lds-ring hidden"><div></div><div></div><div></div><div></div></div>
          </button>
        </form>
      </div>
    </div>
    <div class="alternatives-volume-container hidden">
      <div class="alternatives-listen-controls">
        <button class="btn btn-listen">Listen</button>
        <button class="btn btn-menu">
        <i class="fas fa-chevron-down"></i>
        <div class="menu-dropdown hidden">
          <a href="#" class="btn-clear">Clear</a>
          <a href="#" class="btn-guide">Guide</a>
          <a href="#" class="btn-reference">Reference</a>
        </div>
      </div>
      </button>
      <div class="alternatives-bar-container">
        <div class="alternatives-bar success-color-light"></div>
      </div>
    </div>
    <div class="nux hidden">
      <div class="nux-progress success-color-light"></div>
      <h2 class="nux-heading"></h2>
      <div class="nux-body"></div>
      <button class="btn btn-nux-next">Next</button>
    </div>
    <div class="alternatives-list-container hidden">
      <div class="alternatives-valid">
        <div class="alternatives-valid-header"></div>
        <div class="alternatives-valid-list"></div>
      </div>
      <div class="alternatives-invalid">
        <div class="alternatives-invalid-header"></div>
        <div class="alternatives-invalid-list"></div>
      </div>
    </div>
    <script src="vscode-resource:${this.root}/build/alternatives.js"></script>
  </body>
</html>`;
    }
}
