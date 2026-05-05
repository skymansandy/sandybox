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

async function sendDelayedResponse(responseUrl, text) {
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_type: "ephemeral", text }),
    });
  } catch (err) {
    console.error("Failed to send delayed response:", err.message);
  }
}

async function triggerWorkflow({ concept, section, channelId, userId, responseUrl }) {
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

    console.log("Sending delayed response with run URL:", runUrl);
    await sendDelayedResponse(responseUrl, `Workflow started: ${runUrl}`);
  } catch (err) {
    console.error("Failed to trigger workflow:", err.message);
    await sendDelayedResponse(responseUrl, `Failed to trigger doc generation: ${err.message}`);
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
    const responseUrl = body.response_url;

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

    // Use waitUntil to keep the function alive for the async workflow trigger
    // This lets us respond to Slack immediately while the background work continues
    waitUntil(triggerWorkflow({ concept, section, channelId, userId, responseUrl }));

    // Respond immediately to Slack (must be within 3s)
    return res.json({
      response_type: "ephemeral",
      text: `Got it! Generating docs for *${concept}*${sectionLabel}. I'll post the workflow link shortly.`,
    });
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
