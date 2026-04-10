import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, TextMessage } from "@inngest/agent-kit";

export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });
  // Check if dev server is running, restart if not
  const result = await sandbox.commands.run(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'down'",
  );

  if (result.stdout.includes("down") || result.stdout === "000") {
    // Restart the dev server in background
    await sandbox.commands.run(
      "cd /home/user && nohup npm run dev > /tmp/next.log 2>&1 &",
    );
    // Give it time to boot
    await new Promise((res) => setTimeout(res, 5000));
  }

  return sandbox;
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const lastAssistantMessage = result.output.findLastIndex(
    (message) => message.role === "assistant",
  );

  const message = result.output[lastAssistantMessage] as
    | TextMessage
    | undefined;

  return message?.content
    ? typeof message.content === "string"
      ? message.content
      : message.content.map((c) => c.text).join("")
    : undefined;
}
