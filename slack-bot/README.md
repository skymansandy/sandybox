# Sandybox Slack Bot

Slack bot that generates knowledge base docs on demand. Mention the bot with a concept, and it triggers a GitHub Action that uses Claude to write the doc and update the site.

## Usage

```
@SandyboxBot Kotlin Coroutines in android
@SandyboxBot gRPC fundamentals in networking
@SandyboxBot Binary Search Trees in dsa
@SandyboxBot some random TIL              # Claude picks the section
```

Format: `@Bot <concept> [in <section>]`

### Section shortcuts

| Shortcut | Resolves to |
|---|---|
| `android` | Mobile > Android |
| `ios` | Mobile > iOS |
| `cross-platform` | Mobile > Cross-Platform |
| `kotlin` | Programming > Languages > Kotlin |
| `design patterns` | Programming > Design Patterns |
| `dsa` | Programming > Data Structures & Algorithms |
| `networking` | Infrastructure > Networking |
| `devops` | Infrastructure > DevOps |
| `databases` | Infrastructure > Databases |
| `physics` | Science > Physics |
| `astronomy` | Science > Astronomy |
| `tools` | Tools |
| `til` | TIL |

You can also use full nav paths like `Mobile > Android > Concurrency`.

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. **OAuth & Permissions** — add bot scopes:
   - `app_mentions:read`
   - `chat:write`
3. **Socket Mode** — enable it and generate an app-level token (`xapp-...`)
4. **Event Subscriptions** — subscribe to `app_mention` bot event
5. Install the app to your workspace
6. Copy the **Bot User OAuth Token** (`xoxb-...`) and **Signing Secret**

### 2. Create a GitHub PAT

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a token with scopes: `repo`, `actions:write`

### 3. Set up GitHub repo secrets

In the sandybox repo, go to Settings > Secrets > Actions and add:

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL (create one in your Slack app under Incoming Webhooks) |

### 4. Configure environment

```bash
cp .env.example .env
# Fill in the values from steps 1 and 2
```

### 5. Run

```bash
npm install
npm start
```

### Deployment (Fly.io)

1. Install the Fly CLI: `brew install flyctl`
2. Run `fly auth login` and `fly launch` from the `slack-bot/` directory
3. Set secrets: `fly secrets set SLACK_BOT_TOKEN=xoxb-... SLACK_SIGNING_SECRET=... SLACK_APP_TOKEN=xapp-... GITHUB_TOKEN=ghp_...`
4. Deploy: `fly deploy`
