import { createAgent, openai } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox } from "./utils";

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
            system: "You are an expert next.js developer. You write simple react components snippets.",
            model: openai({ model: "gpt-4o" }),
        });
        const { output } = await codeAgent.run(`Write a simple react component snippet: ${event.data.value}`);
        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });
      return {
        output,
        sandboxUrl
      };
    }
  )