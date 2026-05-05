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
  log: {
    debug: () => {},
    info: () => {},
    warn: (msg) => {
      if (!msg.includes("is deprecated")) console.warn(msg);
    },
    error: console.error,
  },
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

// /sandybox <concept> in <section>
app.command("/sandybox", async ({ command, ack, respond }) => {
  await ack();

  const { concept, section } = parseMessage(command.text);

  if (!concept) {
    await respond("Usage: `/sandybox <concept> [in <section>]`");
    return;
  }

  const sectionLabel = section !== "auto" ? ` in *${section}*` : "";

  await respond(`Got it! Generating a doc for *${concept}*${sectionLabel}. I'll post the link when it's ready.`);

  try {
    const beforeTime = new Date().toISOString();

    await octokit.actions.createWorkflowDispatch({
      owner: OWNER,
      repo: REPO,
      workflow_id: WORKFLOW_FILE,
      ref: DEFAULT_REF,
      inputs: {
        concept,
        section,
        slack_channel: command.channel_id,
        slack_thread_ts: "",
      },
    });

    // Poll for the newly created run (dispatch API doesn't return run ID)
    let runUrl = `https://github.com/${OWNER}/${REPO}/actions`;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await octokit.actions.listWorkflowRuns({
        owner: OWNER,
        repo: REPO,
        workflow_id: WORKFLOW_FILE,
        created: `>=${beforeTime}`,
        per_page: 1,
      });
      if (data.workflow_runs.length > 0) {
        runUrl = data.workflow_runs[0].html_url;
        break;
      }
    }

    await respond(`Workflow started: ${runUrl}`);
  } catch (err) {
    console.error("Failed to trigger workflow:", err.message);
    await respond(`Failed to trigger doc generation: ${err.message}`);
  }
});

(async () => {
  await app.start();
  console.log("Sandybox bot is running");
})();
