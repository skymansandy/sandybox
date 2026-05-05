# Best Practices

Production-ready Docker patterns — multi-stage builds, layer caching, image optimization, security hardening, and operational best practices.

---

## Multi-Stage Builds

Multi-stage builds use multiple `FROM` statements to separate build dependencies from the runtime image. Only the final stage is shipped.

=== "Before (Single Stage)"

    ```dockerfile
    FROM node:20
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build
    # Build tools, source code, devDependencies all in final image
    CMD ["node", "dist/server.js"]
    ```

    **Image size: ~1.1 GB**

=== "After (Multi-Stage)"

    ```dockerfile
    # Stage 1: Build
    FROM node:20 AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build

    # Stage 2: Runtime
    FROM node:20-alpine
    WORKDIR /app
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    CMD ["node", "dist/server.js"]
    ```

    **Image size: ~180 MB**

### Go Example (Extreme Reduction)

```dockerfile
# Build stage
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server

# Runtime stage — scratch has nothing, just the binary
FROM scratch
COPY --from=builder /server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/server"]
```

**Build image: ~1.2 GB | Final image: ~12 MB**

---

## Layer Caching Strategy

Docker caches each layer. When a layer changes, all subsequent layers are invalidated. Order instructions from least-changing to most-changing.

```dockerfile
# GOOD — dependencies change less often than source code
FROM python:3.12-slim
WORKDIR /app

# Layer 1: Rarely changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 2: Changes frequently
COPY . .

CMD ["python", "app.py"]
```

```dockerfile
# BAD — copying everything first invalidates the pip install layer on every code change
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "app.py"]
```

| Caching Rule | Why |
|-------------|-----|
| Copy dependency manifests first (`package.json`, `requirements.txt`, `go.mod`) | Dependencies change less often than source code |
| Combine `RUN` commands with `&&` | Fewer layers, smaller images, single cache unit |
| Use `--no-cache-dir` for pip, `npm ci` over `npm install` | Prevents storing package manager caches in the layer |
| Put `COPY . .` as late as possible | Source code changes most frequently |
| Use `.dockerignore` | Prevents irrelevant files from busting the cache |

!!! note "BuildKit cache mounts"
    For large dependency installs, use BuildKit cache mounts to persist package manager caches across builds without including them in the image layer:
    ```dockerfile
    RUN --mount=type=cache,target=/root/.cache/pip \
        pip install -r requirements.txt
    ```

---

## Image Size Optimization

| Base Image | Size | Security | Use Case |
|-----------|------|----------|----------|
| `ubuntu:24.04` | ~78 MB | Full package manager, many CVEs | When you need apt and full tooling |
| `python:3.12` / `node:20` | 800 MB+ | Large attack surface | Development, full compatibility |
| `python:3.12-slim` / `node:20-slim` | ~150 MB | Reduced packages | Good default for most apps |
| `python:3.12-alpine` / `node:20-alpine` | ~50 MB | Minimal, musl libc | When size matters and musl is compatible |
| `gcr.io/distroless/static` | ~2 MB | No shell, no package manager | Go, Rust (statically compiled) |
| `scratch` | 0 MB | Nothing at all | Single static binary only |

### Size Reduction Techniques

| Technique | Impact |
|-----------|--------|
| Multi-stage builds | Remove build tools from final image |
| Use `-slim` or `-alpine` variants | Smaller base layer |
| Combine `RUN` commands | Fewer layers |
| `rm -rf /var/lib/apt/lists/*` after `apt-get install` | Remove package cache |
| `--no-cache-dir` for pip | No pip cache in layer |
| `npm ci --omit=dev` | No devDependencies |
| Copy only what's needed (`COPY --from=builder`) | No source code or build artifacts |
| Use `.dockerignore` | Smaller build context |

!!! warning "Alpine gotcha"
    Alpine uses musl libc instead of glibc. Some Python packages with C extensions, Node.js native modules, and DNS resolution edge cases can break. Test thoroughly. For Python, `slim` is usually a better default.

---

## Security Best Practices

### Run as Non-Root User

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY --chown=node:node . .
RUN npm ci --omit=dev

# Switch to non-root user
USER node

CMD ["node", "server.js"]
```

### No Secrets in Images

```dockerfile
# BAD — secret is baked into a layer (visible with docker history)
COPY .env /app/.env
RUN echo "API_KEY=secret123" >> /app/config

# GOOD — pass secrets at runtime
# docker run -e API_KEY=secret123 myapp
# Or use Docker secrets / mounted files
```

### Security Checklist

| Practice | Why |
|----------|-----|
| **Run as non-root** (`USER`) | Limits damage if container is compromised |
| **No secrets in images** | Layers are inspectable with `docker history` and extractable |
| **Pin base image versions** | `FROM node:20.11.1` not `FROM node:latest` — reproducible and auditable |
| **Scan images** | `docker scout`, Trivy, Snyk — find known CVEs in dependencies |
| **Use read-only filesystem** | `docker run --read-only` prevents writes to container layer |
| **Drop capabilities** | `--cap-drop ALL --cap-add NET_BIND_SERVICE` — principle of least privilege |
| **Use `COPY`, not `ADD`** | `ADD` can fetch URLs and auto-extract tars — unexpected behavior |
| **Set `HEALTHCHECK`** | Enables orchestrators to detect and restart unhealthy containers |
| **Don't run SSH in containers** | Use `docker exec` instead — no need for sshd |
| **Use multi-stage builds** | Build tools and source code don't belong in production images |

### Image Scanning

```bash
# Docker Scout (built into Docker Desktop)
docker scout cves myapp:1.0

# Trivy (open source)
trivy image myapp:1.0

# Snyk
snyk container test myapp:1.0
```

---

## .dockerignore Patterns

```text
# Version control
.git
.gitignore

# Dependencies (rebuild inside container)
node_modules
__pycache__
*.pyc
vendor/

# Build artifacts
dist/
build/
*.o
*.a

# IDE and editor
.idea/
.vscode/
*.swp

# Environment and secrets
.env
.env.*
*.pem
*.key

# Docker files (don't need themselves)
Dockerfile*
docker-compose*
.dockerignore

# Documentation
*.md
LICENSE
docs/

# Tests (usually not needed in production image)
tests/
test/
coverage/
```

---

## One Process Per Container

Each container should run a single concern. This enables independent scaling, clearer logs, simpler health checks, and easier debugging.

| Instead of | Do This |
|-----------|---------|
| Web server + app in one container | Nginx container + app container |
| App + cron jobs | App container + cron container (same image, different CMD) |
| App + log collector | App writes to stdout, log driver handles collection |
| Multiple services in one container (supervisord) | Docker Compose with separate services |

```yaml
# Separate concerns with Compose
services:
  api:
    image: myapp:1.0
    command: ["gunicorn", "app:app"]
  
  worker:
    image: myapp:1.0
    command: ["celery", "-A", "tasks", "worker"]
  
  scheduler:
    image: myapp:1.0
    command: ["celery", "-A", "tasks", "beat"]
```

---

## Health Checks

```dockerfile
# HTTP health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# TCP health check (no curl needed)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD nc -z localhost 8080 || exit 1

# Custom script
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/app/healthcheck.sh"]
```

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `--interval` | 30s | Time between checks |
| `--timeout` | 30s | Max time for a single check |
| `--start-period` | 0s | Grace period for container startup (failures don't count) |
| `--retries` | 3 | Consecutive failures before marking unhealthy |

---

## Logging Best Practices

Containers should write logs to **stdout** and **stderr** — never to files inside the container.

| Practice | Why |
|----------|-----|
| Log to stdout/stderr | Docker captures and routes via logging drivers |
| Use structured logging (JSON) | Parseable by log aggregators (ELK, Datadog, CloudWatch) |
| Don't log to files in the container | Files are lost when container dies, hard to aggregate |
| Set log driver at runtime | `--log-driver json-file`, `fluentd`, `awslogs`, `gcplogs` |
| Limit log file size | `--log-opt max-size=10m --log-opt max-file=3` |

```bash
# Configure logging driver and limits
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp:1.0
```

!!! warning "Unbounded logs"
    The default `json-file` log driver has no size limit. On a busy container, logs can fill the disk. Always set `max-size` and `max-file` in production, or use a centralized logging driver.

---

## Production Checklist

| Category | Check | Status |
|----------|-------|--------|
| **Image** | Using specific base image tag (not `latest`) | Required |
| **Image** | Multi-stage build (no build tools in final image) | Required |
| **Image** | `.dockerignore` configured | Required |
| **Image** | Image scanned for vulnerabilities | Required |
| **Security** | Running as non-root user | Required |
| **Security** | No secrets baked into image | Required |
| **Security** | Read-only filesystem where possible | Recommended |
| **Security** | Minimal capabilities (`--cap-drop ALL`) | Recommended |
| **Runtime** | Health check defined | Required |
| **Runtime** | Resource limits set (memory, CPU) | Required |
| **Runtime** | Restart policy configured | Required |
| **Runtime** | Graceful shutdown handling (SIGTERM) | Required |
| **Logging** | Logs to stdout/stderr | Required |
| **Logging** | Log rotation configured | Required |
| **Storage** | Persistent data on named volumes | Required |
| **Networking** | Only necessary ports exposed | Required |
| **Networking** | Internal services not exposed to host | Recommended |

---

??? question "Interview Questions"

    **Q: What are multi-stage builds and why use them?**

    Multi-stage builds use multiple `FROM` instructions in a single Dockerfile. Earlier stages install build tools and compile the application. The final stage copies only the built artifacts into a minimal base image. This dramatically reduces image size (often 5-10x) and removes build-time dependencies from the production image, reducing the attack surface.

    **Q: How does Docker layer caching work and how do you optimize for it?**

    Each Dockerfile instruction creates a cached layer. When Docker detects that an instruction and its inputs haven't changed, it reuses the cached layer. If a layer changes, all subsequent layers are invalidated. To optimize: order instructions from least-changing to most-changing. Copy dependency files first (`package.json`), install dependencies, then copy source code. This way, code changes don't trigger dependency reinstallation.

    **Q: Why should containers run as non-root?**

    If a container running as root is compromised, the attacker has root privileges inside the container. While container isolation (namespaces, cgroups) provides some protection, kernel vulnerabilities can allow container escapes. Running as a non-root user limits the blast radius. Use the `USER` instruction in the Dockerfile and `--cap-drop ALL` at runtime.

    **Q: Why should containers log to stdout/stderr instead of files?**

    Docker captures stdout/stderr via logging drivers, enabling centralized log collection without agents inside the container. File-based logs are lost when the container is removed, can't be easily aggregated across replicas, and can fill up the container's writable layer. The logging driver (json-file, fluentd, awslogs) determines where logs are shipped.

    **Q: What is the difference between alpine, slim, and distroless base images?**

    `slim` images are Debian-based but stripped of unnecessary packages — a good default. `alpine` images use musl libc and are smaller (~50 MB) but can cause compatibility issues with C extensions. `distroless` images from Google contain only the runtime (no shell, no package manager) — they're the most secure but harder to debug. For statically compiled languages (Go, Rust), `scratch` (empty) is the ultimate minimal choice.

    **Q: How do you handle secrets in Docker?**

    Never embed secrets in images (they're visible in layer history). Options: pass via environment variables at runtime (`-e` or `--env-file`), use Docker secrets (Swarm mode — mounted as files in `/run/secrets/`), mount secret files via tmpfs, or use external secret managers (Vault, AWS Secrets Manager) with the application fetching secrets at startup. For build-time secrets, use `--secret` flag with BuildKit.

!!! tip "Further Reading"
    - [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) — official Docker guide
    - [Distroless Container Images](https://github.com/GoogleContainerTools/distroless) — Google's minimal runtime images
    - [Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html) — OWASP Docker security guide
    - [BuildKit Cache Mounts](https://docs.docker.com/build/cache/) — advanced caching strategies with BuildKit
