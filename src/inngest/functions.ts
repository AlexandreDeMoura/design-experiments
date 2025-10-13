import { createAgent, createNetwork, createTool, openai } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import z from "zod";
import { PROMPT } from "./prompt";

export const helloWorld = 
  inngest.createFunction(
    {id: "helloworld"},
    {event: "test/hello.world"},
    async ({event, step}) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("generated-ui");
            return sandbox.sandboxId;
        });
        const codeAgent = createAgent({
            name: "Code Agent",
            description: "A code agent that can write code in a sandboxed environment",
            system: PROMPT,
            model: openai({ model: "gpt-4.1", defaultParameters: { temperature: 0.2 } }),
            tools: [
              createTool({
                name: "terminal",
                description: "Run a command in the terminal",
                parameters: z.object({
                  command: z.string(),
                }),
                handler: async ({ command }, { step }) => {
                  return await step?.run("terminal", async () => {
                    const buffer = {
                      stdout: "",
                      stderr: "",
                    }
                    try {
                      const sandbox = await getSandbox(sandboxId);
                      const result = await sandbox.commands.run(command, {
                        onStdout: (data: string) => {
                          buffer.stdout += data;
                        },
                        onStderr: (data: string) => {
                          buffer.stderr += data;
                        },
                      });
                      return result.stdout;
                    } catch (error) {
                     console.error(`Command failed: ${error}\n stdout: ${buffer.stdout}\n stderr: ${buffer.stderr}`);
                    }
                    return buffer;
                  });
                },
              }),
              createTool({
                name: "createOrUpdateFiles",
                description: "Create or update files in the sandbox",
                parameters: z.object({
                  files: z.array(z.object({
                    path: z.string(),
                    content: z.string(),
                  })),
                }),
                handler: async ({ files }, { step, network }) => {
                  return await step?.run("createOrUpdateFiles", async () => {
                    try {
                      const updatedFiles = network.state.data.files || {};
                      const sandbox = await getSandbox(sandboxId);
                      for (const file of files) {
                        await sandbox.files.write(file.path, file.content);
                        updatedFiles[file.path] = file.content;
                      }
                      network.state.data.files = updatedFiles;
                      return updatedFiles;
                    } catch (error) {
                      console.error(`Failed to create or update file: ${error}`);
                      return network.state.data.files || {};
                    }
                  });
                },
              }),
              createTool({
                name: "readFiles",
                description: "Read files from the sandbox",
                parameters: z.object({
                  files: z.array(z.string()),
                }),
                handler: async ({ files }, { step, network }) => {
                  return await step?.run("readFiles", async () => {
                    try {
                    const sandbox = await getSandbox(sandboxId);
                    const contents = []
                    for (const file of files) {
                      const content = await sandbox.files.read(file);
                      contents.push({
                        path: file,
                        content,
                      });
                    }
                    return JSON.stringify(contents);
                  } catch (error) {
                        console.error(`Failed to read files: ${error}`);
                        return error;
                      }
                  });
                },
              }),
            ],
            lifecycle: {
              onResponse: async ({ result, network }) => {
                const lastAssistantMessageText = lastAssistantTextMessageContent(result)
                if (lastAssistantMessageText && network) { 
                  if (lastAssistantMessageText.includes("<task_summary>")) {
                    network.state.data.summary = lastAssistantMessageText;
                  }
                }
                return result;
              },
            },
        });

        const network = createNetwork({
          name: "coding-agent-network",
          agents: [codeAgent],
          maxIter: 15,
          router: async ({ network }) => {
            const summary = network.state.data.summary
            if (summary) {
              return
            }
            return codeAgent
          },
        })
        
        const result = await network.run(event.data.value);

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });
      return {
        url: sandboxUrl,
        title: "Fragment",
        files: result.state.data.files,
        summary: result.state.data.summary,
      };
    }
  )