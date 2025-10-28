/**
 * Landing page HTML content for MCP server
 */

export const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vaadin MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #eaf0f8;
      background: linear-gradient(135deg, #1a81fa 0%, #8854fc 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #161B21;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      padding: 40px;
      border: 1px solid #232e3c;
    }
    h1 {
      color: #eaf0f8;
      margin-bottom: 20px;
      font-size: 2.5em;
      font-weight: 600;
    }
    h2 {
      color: #1a81fa;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
      font-weight: 600;
    }
    h3 {
      color: #8854fc;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
      font-weight: 600;
    }
    p {
      margin-bottom: 15px;
      color: #eaf0f8;
    }
    .config-box {
      background: #0a0a0a;
      border-left: 4px solid #1a81fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      font-family: "Courier New", monospace;
      overflow-x: auto;
      border: 1px solid #232e3c;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .copy-button {
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(26, 129, 250, 0.15);
      border: 1px solid rgba(26, 129, 250, 0.3);
      color: #5eb3ff;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85em;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: all 0.2s ease;
      font-weight: 500;
    }
    .copy-button:hover {
      background: rgba(26, 129, 250, 0.25);
      border-color: rgba(26, 129, 250, 0.5);
      transform: translateY(-1px);
    }
    .copy-button:active {
      transform: translateY(0);
    }
    .copy-button.copied {
      background: rgba(136, 84, 252, 0.2);
      border-color: rgba(136, 84, 252, 0.4);
      color: #8854fc;
    }
    .config-box strong {
      color: #1a81fa;
      display: block;
      margin-bottom: 12px;
      font-size: 1.1em;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .config-box pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #c9d1d9;
      font-size: 0.95em;
      line-height: 1.6;
    }
    .config-box code {
      color: #5eb3ff;
      background: none;
      border: none;
      padding: 0;
    }
    .link-box {
      background: #0F0F0F;
      border-left: 4px solid #8854fc;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      border: 1px solid #232e3c;
    }
    .link-box p {
      color: #eaf0f8;
    }
    ul {
      color: #eaf0f8;
      margin-left: 20px;
      margin-bottom: 15px;
    }
    li {
      margin-bottom: 8px;
    }
    a {
      color: #1a81fa;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      color: #8854fc;
      text-decoration: underline;
    }
    code {
      background: rgba(26, 129, 250, 0.15);
      color: #5eb3ff;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: "Courier New", monospace;
      font-size: 0.9em;
      border: 1px solid rgba(26, 129, 250, 0.2);
    }
    .tool-section {
      background: #1a1f26;
      border: 1px solid #232e3c;
      border-radius: 8px;
      padding: 20px;
      margin: 15px 0;
    }
    .tool-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-http {
      background: #1a81fa;
      color: white;
    }
    .badge-stdio {
      background: #f59e0b;
      color: white;
    }
    .steps {
      counter-reset: step-counter;
      list-style: none;
      margin-left: 0;
    }
    .steps li {
      counter-increment: step-counter;
      position: relative;
      padding-left: 35px;
      margin-bottom: 15px;
    }
    .steps li::before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 0;
      background: #1a81fa;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85em;
      font-weight: 600;
    }
    .app-list {
      margin: 20px 0;
    }
    .app-item {
      background: #1a1f26;
      border: 1px solid #232e3c;
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .app-item summary {
      padding: 20px;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s ease;
      user-select: none;
      border-radius: 8px;
    }
    .app-item summary::-webkit-details-marker {
      display: none;
    }
    .app-item summary:hover {
      background: rgba(26, 129, 250, 0.15);
      transform: translateX(4px);
    }
    .app-item[open] summary {
      background: rgba(26, 129, 250, 0.08);
      border-bottom: 1px solid #232e3c;
      border-radius: 8px 8px 0 0;
    }
    .app-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    .app-title h3 {
      color: #1a81fa;
      margin: 0;
      font-size: 1.2em;
    }
    .app-status {
      font-size: 0.85em;
      color: #9ca3af;
    }
    .app-chevron {
      color: #1a81fa;
      transition: transform 0.3s ease;
      font-size: 1.5em;
      font-weight: bold;
      min-width: 20px;
      text-align: center;
    }
    .app-item[open] .app-chevron {
      transform: rotate(90deg);
      color: #8854fc;
    }
    .app-content {
      padding: 25px;
      background: rgba(15, 15, 15, 0.5);
      animation: slideDown 0.3s ease-out;
      border-radius: 0 0 8px 8px;
    }
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .note {
      background: #1a1f26;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .note p {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Vaadin MCP Server</h1>

    <p>
      The Vaadin Model Context Protocol (MCP) server provides AI coding assistants
      with direct access to comprehensive Vaadin documentation, enabling intelligent code assistance
      for Vaadin Java and React applications.
    </p>

    <h2>⚡ Setup Instructions</h2>
    <p>Click on your AI coding tool to expand setup instructions:</p>

    <div class="app-list">
      <!-- Claude Code -->
      <details class="app-item">
        <summary>
          <div class="app-title">
            <h3>Claude Code</h3>
            <span class="badge badge-http">HTTP</span>
          </div>
          <span class="app-status">Native HTTP support</span>
          <span class="app-chevron">›</span>
        </summary>
        <div class="app-content">
          <p>Add to your project's <code>.mcp.json</code> file or <code>~/.claude.json</code> for global access:</p>
          <div class="config-box">
            <strong>Configuration:</strong>
            <pre>{
  "mcpServers": {
    "vaadin": {
      "type": "http",
      "url": "https://mcp.vaadin.com/docs"
    }
  }
}</pre>
          </div>
          <p><strong>File locations:</strong></p>
          <ul>
            <li>Project-scoped: <code>.mcp.json</code> (in project root, can be version-controlled)</li>
            <li>User-scoped: <code>~/.claude.json</code> (global for all projects)</li>
          </ul>
          <p>💡 Restart Claude Code after making changes.</p>
        </div>
      </details>

      <!-- Cursor -->
      <details class="app-item">
        <summary>
          <div class="app-title">
            <h3>Cursor</h3>
            <span class="badge badge-http">HTTP</span>
          </div>
          <span class="app-status">Native HTTP support</span>
          <span class="app-chevron">›</span>
        </summary>
        <div class="app-content">
          <p>Configure MCP servers for your project or globally:</p>
          <div class="config-box">
            <strong>Configuration:</strong>
            <pre>{
  "mcpServers": {
    "vaadin": {
      "type": "http",
      "url": "https://mcp.vaadin.com/docs"
    }
  }
}</pre>
          </div>
          <p><strong>File locations:</strong></p>
          <ul>
            <li>Project-specific: <code>.cursor/mcp.json</code></li>
            <li>Global: <code>~/.cursor/mcp.json</code></li>
          </ul>
          <p>💡 Close and reopen Cursor to load the new configuration.</p>
        </div>
      </details>

      <!-- Windsurf -->
      <details class="app-item">
        <summary>
          <div class="app-title">
            <h3>Windsurf</h3>
            <span class="badge badge-http">HTTP</span>
          </div>
          <span class="app-status">Native HTTP support</span>
          <span class="app-chevron">›</span>
        </summary>
        <div class="app-content">
          <p>Access MCP settings through Windsurf Settings (bottom right) or <code>Cmd+Shift+P</code> → "Open Windsurf Settings":</p>
          <div class="config-box">
            <strong>File: ~/.codeium/windsurf/mcp_config.json</strong>
            <pre>{
  "mcpServers": {
    "vaadin": {
      "type": "http",
      "url": "https://mcp.vaadin.com/docs"
    }
  }
}</pre>
          </div>
          <p>💡 Click the Hammer Icon on the Cascade toolbar to view connected MCP tools.</p>
        </div>
      </details>

      <!-- Junie/JetBrains -->
      <details class="app-item">
        <summary>
          <div class="app-title">
            <h3>Junie (JetBrains IDEs)</h3>
            <span class="badge badge-http">via proxy</span>
          </div>
          <span class="app-status">Requires HTTP shim</span>
          <span class="app-chevron">›</span>
        </summary>
        <div class="app-content">
          <p>Junie only supports stdio-based MCP servers. Use <a href="https://github.com/pyroprompts/mcp-stdio-to-streamable-http-adapter" target="_blank">@pyroprompts/mcp-stdio-to-streamable-http-adapter</a> to bridge stdio to the HTTP-based Vaadin MCP server:</p>

          <ol class="steps">
            <li>Open IDE settings with <code>Ctrl+Alt+S</code> (Windows/Linux) or <code>Cmd+,</code> (macOS)</li>
            <li>Navigate to Tools → Junie → MCP Settings</li>
            <li>Click the Add button and add the configuration below</li>
          </ol>

          <div class="config-box">
            <strong>Configuration:</strong>
            <pre>{
  "mcpServers": {
    "vaadin": {
      "command": "npx",
      "args": ["@pyroprompts/mcp-stdio-to-streamable-http-adapter"],
      "env": {
        "URI": "https://mcp.vaadin.com/docs",
        "MCP_NAME": "vaadin"
      }
    }
  }
}</pre>
          </div>

          <p><strong>Note:</strong> The adapter uses environment variables to configure the connection. <code>URI</code> points to the Vaadin MCP server endpoint, and <code>MCP_NAME</code> is an identifier for the server.</p>

          <p><strong>File locations:</strong></p>
          <ul>
            <li>Global: <code>~/.junie/mcp.json</code></li>
            <li>Project-level: <code>.junie/mcp/mcp.json</code></li>
          </ul>
        </div>
      </details>

      <!-- Other Tools -->
      <details class="app-item">
        <summary>
          <div class="app-title">
            <h3>Other MCP Clients</h3>
            <span class="badge badge-http">HTTP or stdio</span>
          </div>
          <span class="app-status">Check your tool's docs</span>
          <span class="app-chevron">›</span>
        </summary>
        <div class="app-content">
          <p>The Vaadin MCP server can be used with any MCP-compatible client. Choose the appropriate configuration based on your tool's transport support:</p>

          <h3>If your tool supports HTTP/SSE natively:</h3>
          <p>Simply point it to our HTTP endpoint:</p>
          <div class="config-box">
            <strong>HTTP Endpoint:</strong>
            <pre>https://mcp.vaadin.com/docs</pre>
          </div>
          <p>The exact configuration format depends on your specific tool. Look for settings like "MCP Server URL", "HTTP transport", or "Streamable HTTP" in your tool's documentation.</p>

          <h3>If your tool only supports stdio:</h3>
          <p>Use an HTTP adapter to bridge stdio to HTTP. This works with any stdio-based MCP client:</p>
          <div class="config-box">
            <strong>Generic stdio configuration:</strong>
            <pre>{
  "mcpServers": {
    "vaadin": {
      "command": "npx",
      "args": ["@pyroprompts/mcp-stdio-to-streamable-http-adapter"],
      "env": {
        "URI": "https://mcp.vaadin.com/docs",
        "MCP_NAME": "vaadin"
      }
    }
  }
}</pre>
          </div>
          <p>Adapt the JSON structure to match your tool's configuration format. The adapter uses environment variables: <code>URI</code> for the server endpoint and <code>MCP_NAME</code> as an identifier.</p>
        </div>
      </details>
    </div>

    <h2>🔧 Transport Types</h2>
    <div class="note">
      <p><strong>Important:</strong> The Vaadin MCP server uses <strong>HTTP transport (streamable-http)</strong>. This is natively supported by Claude Code, Cursor, and Windsurf. For stdio-only tools like Junie, you can use <a href="https://github.com/pyroprompts/mcp-stdio-to-streamable-http-adapter" target="_blank">@pyroprompts/mcp-stdio-to-streamable-http-adapter</a> as a bridge between the two transport types.</p>
    </div>

    <h2>✨ What's Included</h2>
    <ul>
      <li>Semantic search across Vaadin documentation</li>
      <li>Full document retrieval for complete context</li>
      <li>Component version information and API references</li>
      <li>Component-specific API documentation (Java, React, Web Components)</li>
      <li>Component styling and theming information</li>
      <li>Support for both Java and React applications</li>
      <li>Current Vaadin version information</li>
      <li>Vaadin development primer with best practices</li>
    </ul>

    <h2>🔗 Resources</h2>
    <div class="link-box">
      <p><strong>GitHub Repository:</strong></p>
      <p><a href="https://github.com/vaadin/vaadin-mcp" target="_blank">https://github.com/vaadin/vaadin-mcp</a></p>
      <p style="margin-top: 10px;">View source code, report issues, and contribute to the project.</p>
    </div>

    <div class="link-box">
      <p><strong>Vaadin Documentation:</strong></p>
      <p><a href="https://vaadin.com/docs" target="_blank">https://vaadin.com/docs</a></p>
      <p style="margin-top: 10px;">Browse the full Vaadin documentation.</p>
    </div>

    <div class="link-box">
      <p><strong>Model Context Protocol:</strong></p>
      <p><a href="https://modelcontextprotocol.io" target="_blank">https://modelcontextprotocol.io</a></p>
      <p style="margin-top: 10px;">Learn more about the Model Context Protocol standard.</p>
    </div>
  </div>
  <script>
    // Add copy buttons to all config boxes
    document.addEventListener('DOMContentLoaded', function() {
      const configBoxes = document.querySelectorAll('.config-box');

      configBoxes.forEach(function(box) {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy configuration to clipboard');

        button.addEventListener('click', function() {
          const pre = box.querySelector('pre');
          const text = pre ? pre.textContent : '';

          navigator.clipboard.writeText(text).then(function() {
            button.textContent = 'Copied!';
            button.classList.add('copied');

            setTimeout(function() {
              button.textContent = 'Copy';
              button.classList.remove('copied');
            }, 2000);
          }).catch(function(err) {
            console.error('Failed to copy:', err);
            button.textContent = 'Failed';
            setTimeout(function() {
              button.textContent = 'Copy';
            }, 2000);
          });
        });

        box.appendChild(button);
      });
    });
  </script>
</body>
</html>`;
