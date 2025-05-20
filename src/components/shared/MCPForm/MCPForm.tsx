import { useState, ChangeEvent, FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tool, ToolOutput } from "@/types/Tool";
import { CheckedState } from "@radix-ui/react-checkbox";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";

interface ToolFormProps {
  path: string;
  tool: Tool;
}

export function ToolForm({ tool, path }: ToolFormProps) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const [key, { type }] of Object.entries(tool.inputSchema.properties)) {
      init[key] = type === "boolean" ? false : "";
    }
    return init;
  });

  const [result, setResult] = useState<ToolOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.currentTarget;
    setValues((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  }

  function onCheckboxChange(checked: CheckedState, key: string) {
    setValues((prev) => ({ ...prev, [key]: checked }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setIsLoading(true);

    try {
      const toolResult = await invoke<{ result: ToolOutput[] }>("call_tool", {
        path,
        tool: tool.name,
        args: values,
      });

      setResult(toolResult.result);
    } catch (err) {
      console.error(`[${tool.name}] error:`, err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {Object.entries(tool.inputSchema.properties).map(
            ([key, { type, description }]) =>
              type === "boolean" ? (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    name={key}
                    checked={values[key]}
                    onCheckedChange={(checked) =>
                      onCheckboxChange(checked, key)
                    }
                  />
                  <Label htmlFor={key}>{key}</Label>
                </div>
              ) : (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key}>{key}</Label>
                  <Input
                    id={key}
                    placeholder={description}
                    name={key}
                    type={type === "number" ? "number" : "text"}
                    value={values[key]}
                    onChange={onInputChange}
                  />
                </div>
              )
          )}

          <Button type="submit" className="w-full">
            Execute
          </Button>

          {isLoading && (
            <div className="flex items-center space-x-2">
              <LoadingSpinner />
              <span>Loading...</span>
            </div>
          )}

          {result.length > 0 && (
            <div className="mt-2">
              <p>Result: </p>

              <pre className="mt-2 pl-2 italic">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
