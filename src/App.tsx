import { useState } from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import { appLocalDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { RefreshCw } from "lucide-react";
import { ToolForm } from "./components/shared/MCPForm/MCPForm";
import { Tool } from "./types/Tool";
import { LoadingSpinner } from "./components/shared/LoadingSpinner/LoadingSpinner";

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState("");
  const [error, setError] = useState<string>("");

  const [tools, setTools] = useState<Tool[]>([]);

  async function updateUploadedFile() {
    setError("");
    setTools([]);
    setIsLoading(true);

    try {
      const mcpServerData = await invoke<{ result: Tool[] }>("list_tools", {
        path,
      });

      setTools(
        mcpServerData.result.map((tool) => ({
          name: tool.name,
          inputSchema: tool.inputSchema,
        }))
      );
    } catch (err) {
      setError(err?.toString() ?? "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setTools([]);
    setIsLoading(true);

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const dataDir = await appLocalDataDir();

      const exePath = `${dataDir}/${file.name}`;

      setPath(exePath);

      await writeFile(exePath, bytes);

      const mcpServerData = await invoke<{
        result: Tool[];
      }>("list_tools", { path: exePath });

      setTools(
        mcpServerData.result.map((tool) => ({
          name: tool.name,
          inputSchema: tool.inputSchema,
        }))
      );
    } catch (err) {
      setError(err?.toString() ?? "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="p-4">
      <h1>Model Context Protocol - Client</h1>

      <small className="text-sm text-muted-foreground font-medium leading-none">
        This is a simple client for the MCP server. It allows you to upload an
        MCP server and run it locally. The client will automatically detect the
        tools available on the server and display them here.
      </small>

      <div className="flex items-end gap-1.5 mt-8">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="mcp-server">MCP Server</Label>
          <Input
            id="mcp-server"
            accept="*"
            type="file"
            onChange={onFileChange}
          />
        </div>

        {path && (
          <Button variant="outline" onClick={updateUploadedFile}>
            <RefreshCw />
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 mt-4">
          <LoadingSpinner />
          <p>Loading...</p>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <p className="text-red-500">Error: {error}</p>
        </div>
      )}

      {tools && (
        <div className="mt-4">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Tools
          </h3>

          <small className="text-sm text-muted-foreground font-medium leading-none">
            The tools are the available commands that can be executed on the MCP
            server.
          </small>

          <div className="mt-2">
            {tools.map((tool) => (
              <div key={tool.name} className="mt-4">
                <small className="text-base font-medium leading-none">
                  Name: {tool.name}
                </small>

                {tool.inputSchema.properties && (
                  <div className="mt-2">
                    <p>Input: </p>

                    <pre className="mt-2 pl-2 italic">
                      {JSON.stringify(tool.inputSchema.properties, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-2">
                  <ToolForm tool={tool} path={path} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
