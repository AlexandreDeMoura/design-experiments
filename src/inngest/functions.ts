import { inngest } from "./client";

export const helloWorld = 
  inngest.createFunction(
    {id: "helloworld"},
    {event: "test/hello.world"},
    async ({event, step}) => {
        await step.sleep("wait-a-moment", "10s");
      return {
        text: "Hello, world!",
      };
    }
  )