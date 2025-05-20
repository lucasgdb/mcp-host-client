export type Tool = {
    name: string;
    inputSchema: {
        properties: Record<
            string,
            { description: string; type: "string" | "number" | "boolean" }
        >;
    };
};

export type ToolOutput = {
    text: string;
    type: string
}