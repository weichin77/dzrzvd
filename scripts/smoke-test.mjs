import { spawn } from "node:child_process";

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3100"],
  {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

const deadline = Date.now() + 15_000;

try {
  while (!output.includes("Ready") && Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited early.\n${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!output.includes("Ready")) {
    throw new Error(`Server did not become ready.\n${output}`);
  }

  for (const route of ["/", "/about", "/location"]) {
    const response = await fetch(`http://127.0.0.1:3100${route}`);
    const html = await response.text();
    if (!response.ok || !html.includes("DZRZVD")) {
      throw new Error(`${route} failed with HTTP ${response.status}`);
    }
    console.log(`${route} — HTTP ${response.status}, ${html.length} bytes`);
  }
} finally {
  server.kill();
}
