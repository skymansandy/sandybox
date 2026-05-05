# Sandybox Slack Bot

Serverless Slack slash command that triggers doc generation. Deployed on Vercel.

## Usage

```
/sandybox Kotlin Coroutines in android
/sandybox gRPC fundamentals in networking
/sandybox Docker, Kubernetes in devops
/sandybox some random concept              # Claude picks the section
```

Format: `/sandybox <concept>[, concept2, ...] [in <section>]`

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

### 1. Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. From the `slack-bot/` directory: `vercel`
3. Add env vars: `vercel env add SLACK_SIGNING_SECRET` (repeat for `GITHUB_TOKEN`, `SANDYBOX_CHANNEL_ID`)
4. Deploy: `vercel --prod`
5. Note your URL: `https://your-project.vercel.app`

### 2. Configure Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → select your app
2. **App Manifest** → update with `slack-app-manifest.yml` (replace `YOUR_VERCEL_URL` with your actual Vercel URL)
3. **Reinstall to Workspace**
4. **OAuth & Permissions** → bot scopes: `chat:write`, `commands`

### 3. Create a GitHub PAT

1. Go to GitHub Settings > Developer settings > Fine-grained tokens
2. Repository access: `sandybox` only
3. Permissions: Contents (read/write) + Actions (read/write)

### 4. GitHub repo secrets

| Secret | Value |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Run `claude setup-token` locally |
| `GIT_USER_NAME` | Your name |
| `GIT_USER_EMAIL` | Your email |
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) |
