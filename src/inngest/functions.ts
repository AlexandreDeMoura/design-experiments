import { createAgent, Agent, openai } from "@inngest/agent-kit";
import { inngest } from "./client";

export const helloWorld = 
  inngest.createFunction(
    {id: "helloworld"},
    {event: "test/hello.world"},
    async ({event, step}) => {
        const codeAgent = createAgent({
            name: "Code Agent",
            system: "You are an expert next.js developer. You write simple react components snippets.",
            model: openai({ model: "gpt-4o" }),
        });
        const { output } = await codeAgent.run(`Write a simple react component snippet: ${event.data.value}`);
      return {
        output
      };
    }
  )