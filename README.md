# MCP Host Client

This is a Tauri-based desktop application written in Rust that acts as a _Model Context Provider_ (MCP) client. It launches a separate MCP server binary, communicates via JSON-RPC over stdin/stdout, and exposes two commands to the frontend:

- **list_tools**: Lists all tools available in the server
- **call_tool**: Calls a specified tool with a set of arguments

## Getting Started

1. **Install prerequisites**

   - Rust + Cargo
   - Node.js + pnpm (for frontend)
   - Tauri CLI: `cargo install tauri-cli`

## License

Distributed under the MIT License. See `LICENSE` for details.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
