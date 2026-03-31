import { Sandbox } from "@e2b/code-interpreter";
import {
  createAgent,
  openai,
  createTool,
  createNetwork,
  type Tool,
} from "@inngest/agent-kit";
import { z } from "zod";

import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "@/prompt";

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("anuragrawatz3k/vibe-nextjs-test", {
        apiKey: process.env.E2B_API_KEY,
      });
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent<AgentState>({
      name: "summarizer",
      system: PROMPT,
      model: openai({
        model: "gpt-4.1",
        apiKey: process.env.OPENAI_API_KEY,
        defaultParameters: { temperature: 0.1 },
      }),
      tools: [
        createTool({
          name: "terminal",
          description:
            "Use the terminal to run commands in the E2B sandbox environment",
          parameters: z.object({
            command: z.string().describe("The command to run in the terminal"),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("run-terminal", async () => {
              /*
            The output can come in chunks, so we need to buffer it until the command is complete, like this:
            "Installing..."
            "Downloading packages..."
            "Done"
          */
              const buffers = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  },
                });

                return result.stdout;
              } catch (error) {
                console.error(
                  `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`,
                );
                return `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "creteOrUpdateFiles",
          description: "Create or update a file in the E2B sandbox environment",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z
                  .string()
                  .describe("The path of the file to create or update"),
                content: z.string().describe("The content of the file"),
              }),
            ),
          }),
          handler: async (
            { files },
            { step, network }: Tool.Options<AgentState>,
          ) => {
            /*
             *Earlier AI was only providing us the components
             *but now AI will also provide us the file paths,
             *so we can create or update files in the E2B sandbox environment.
             *The input will look like this:
             * {
             * "./app.tsx": "<p>App page</p>",
             * "./components/button.tsx": "<button>Click me</button>"
             * }
             */
            const newFiles = await step?.run(
              "create-or-update-file",
              async () => {
                try {
                  //choosing an object rather than an array for easier access and updates to files
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandbox(sandboxId);
                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }
                  return updatedFiles;
                } catch (error) {
                  console.error(`Failed to create or update file: ${error}`);
                  return `Failed to create or update file: ${error}`;
                }
              },
            );

            //now the return can be an object on success or a string on failure,
            //so we check the type before updating the network state
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the E2B sandbox environment",
          parameters: z.object({
            files: z.array(
              z.string().describe("The paths of the files to read"),
            ),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("read-files", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                console.error(`Failed to read files: ${error}`);
                return `Failed to read files: ${error}`;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "code-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          //if we have a summary, we can use it to route the next steps
          //for example if the summary includes "install dependencies" we can route to a terminal agent to run "npm install"
          return;
        } else {
          //otherwise we just route to the code agent to keep working on the task
          return codeAgent;
        }
      },
    });

    const result = await network.run(event.data.value);

    const isError =
      result.state.data.summary ||
      Object.keys(result.state.data.files).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            content: "Something went wrong. Please try again",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }
      return await prisma.message.create({
        data: {
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);
