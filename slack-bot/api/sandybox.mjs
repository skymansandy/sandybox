import { waitUntil } from "@vercel/functions";
import { Octokit } from "@octokit/rest";

const OWNER = "skymansandy";
const REPO = "sandybox";
const WORKFLOW_FILE = "generate-doc.yml";
const DEFAULT_REF = "main";

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
  return SECTION_MAP[raw.toLowerCase().trim()] || raw;
}

function parseMessage(text) {
  const cleaned = text.trim();
  const match = cleaned.match(/^(.+?)\s+in\s+(.+)$/i);
  if (match) {
    return { concept: match[1].trim(), section: resolveSection(match[2]) };
  }
  return { concept: cleaned, section: "auto" };
}

async function slackPost(channel, text, threadTs) {
  const body = { channel, text };
  if (threadTs) body.thread_ts = threadTs;
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function triggerWorkflow({ concept, section, channelId, userId, threadTs }) {
  try {
    console.log("Triggering workflow for:", concept, "in", section);

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    const beforeTime = new Date().toISOString();

    await octokit.actions.createWorkflowDispatch({
      owner: OWNER,
      repo: REPO,
      workflow_id: WORKFLOW_FILE,
      ref: DEFAULT_REF,
      inputs: {
        concept,
        section,
        slack_channel: channelId,
        slack_user: userId,
        slack_thread_ts: threadTs,
      },
    });

    console.log("Workflow dispatch sent, polling for run URL...");

    // Poll for run URL
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

    console.log("Sending threaded reply with run URL:", runUrl);
    await slackPost(channelId, `Workflow started: ${runUrl}`, threadTs);
  } catch (err) {
    console.error("Failed to trigger workflow:", err.message);
    await slackPost(channelId, `Failed to trigger doc generation: ${err.message}`, threadTs);
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const body = req.body;

    const channelId = body.channel_id;
    const userId = body.user_id;
    const text = body.text || "";

    // Channel restriction
    const allowedChannel = process.env.SANDYBOX_CHANNEL_ID;
    if (allowedChannel && channelId !== allowedChannel) {
      return res.json({
        response_type: "ephemeral",
        text: "This command can only be used in the #sandybox channel.",
      });
    }

    const { concept, section } = parseMessage(text);

    if (!concept) {
      return res.json({
        response_type: "ephemeral",
        text: "Usage: `/sandybox <concept>[, concept2, ...] [in <section>]`",
      });
    }

    const sectionLabel = section !== "auto" ? ` in *${section}*` : "";

    // Post the user's command as a visible message to anchor the thread
    const parentMsg = await slackPost(
      channelId,
      `<@${userId}> used \`/sandybox ${text}\``,
    );
    const threadTs = parentMsg.ts;

    // Post the acknowledgment as the first threaded reply
    await slackPost(
      channelId,
      `Got it! Generating docs for *${concept}*${sectionLabel}. I'll post the workflow link shortly.`,
      threadTs,
    );

    // Trigger workflow in background, threaded under the parent message
    waitUntil(triggerWorkflow({ concept, section, channelId, userId, threadTs }));

    // Acknowledge the slash command silently — bot already posted the visible messages
    return res.status(200).send("");
  } catch (err) {
    console.error("Handler error:", err);
    if (!res.headersSent) {
      return res.status(200).json({
        response_type: "ephemeral",
        text: `Failed to trigger doc generation: ${err.message}`,
      });
    }
  }
}
