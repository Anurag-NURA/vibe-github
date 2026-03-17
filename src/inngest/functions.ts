import { Agent, createAgent, openai } from "@inngest/agent-kit";

import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const codeAgent = createAgent({
      name: "summarizer",
      system:
        "You are an expert next.js developer. You write readable, maintainable code. You write simple Next.js & React snippets",
      model: openai({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY }),
    });
    const { output } = await codeAgent.run(
      `Write the following snippet: ${event.data.value}`,
    );

    console.log("Summary:", output);
    return { summary: output };
  },
);
