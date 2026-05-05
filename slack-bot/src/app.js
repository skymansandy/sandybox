const { App } = require("@slack/bolt");
const { Octokit } = require("@octokit/rest");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  headers: { "X-GitHub-Api-Version": "2022-11-28" },
});

const OWNER = "skymansandy";
const REPO = "sandybox";
const WORKFLOW_FILE = "generate-doc.yml";
const DEFAULT_REF = "main";

// Shorthand section aliases → full nav paths
const SECTION_MAP = {
  android: "Mobile > Android",
  ios: "Mobile > iOS",
  "cross-platform": "Mobile > Cross-Platform",
  kotlin: "Programming > Languages > Kotlin",
  "design patterns": "Programming > Design Patterns",
  dsa: "Programming > Data Structures & Algorithms",
  networking: "Infrastructure > Networking",
  devops: "Infrastructure > DevOps",
  databases: "Infrastructure > Databases",
  physics: "Science > Physics",
  astronomy: "Science > Astronomy",
  tools: "Tools",
  til: "TIL",
};

function resolveSection(raw) {
  if (!raw) return "auto";
  const key = raw.toLowerCase().trim();
  return SECTION_MAP[key] || raw;
}

// Parse message: "<concept> in <section>" or just "<concept>"
function parseMessage(text) {
  const cleaned = text.replace(/<@[A-Z0-9]+>/g, "").trim();
  const match = cleaned.match(/^(.+?)\s+in\s+(.+)$/i);

  if (match) {
    return { concept: match[1].trim(), section: resolveSection(match[2]) };
  }
  return { concept: cleaned, section: "auto" };
}

app.event("app_mention", async ({ event, say }) => {
  const { concept, section } = parseMessage(event.text);

  if (!concept) {
    await say({ text: "Please provide a concept to document.", thread_ts: event.ts });
    return;
  }

  const sectionLabel = section !== "auto" ? ` in *${section}*` : "";

  await say({
    text: `Got it! Generating a doc for *${concept}*${sectionLabel}. I'll post the link when it's ready.`,
    thread_ts: event.ts,
  });

  try {
    await octokit.actions.createWorkflowDispatch({
      owner: OWNER,
      repo: REPO,
      workflow_id: WORKFLOW_FILE,
      ref: DEFAULT_REF,
      inputs: {
        concept,
        section,
        slack_channel: event.channel,
        slack_thread_ts: event.ts,
      },
    });
  } catch (err) {
    console.error("Failed to trigger workflow:", err.message);
    await say({
      text: `Failed to trigger doc generation: ${err.message}`,
      thread_ts: event.ts,
    });
  }
});

(async () => {
  await app.start();
  console.log("Sandybox bot is running");
})();
