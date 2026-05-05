# Docker Compose

Docker Compose defines and runs multi-container applications with a single YAML file. Instead of scripting multiple `docker run` commands with the right flags, networks, and volumes, you declare the desired state and Compose handles the rest.

---

## What Compose Solves

| Without Compose | With Compose |
|----------------|-------------|
| Manual `docker network create` | Networks auto-created from config |
| Long `docker run` commands with many flags | Declarative YAML, version-controlled |
| Manual startup ordering | `depends_on` with health checks |
| Per-container `docker logs` | `docker compose logs` for all services |
| Script-based orchestration | Single `docker compose up` command |

---

## compose.yml Structure

```yaml
# compose.yml (v2+ — no "version:" key needed)
services:
  web:
    build: ./frontend           # Build from Dockerfile
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:8080
    depends_on:
      api:
        condition: service_healthy
    networks:
      - frontend

  api:
    image: myapi:1.0            # Use pre-built image
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/mydb
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - frontend
      - backend

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend

  cache:
    image: redis:7-alpine
    networks:
      - backend

volumes:
  pgdata:

networks:
  frontend:
  backend:
```

---

## Key Directives

| Directive | Purpose | Example |
|-----------|---------|---------|
| `services` | Define each container in the application stack | Top-level key |
| `image` | Use a pre-built image | `image: postgres:16` |
| `build` | Build image from Dockerfile | `build: ./app` or `build: { context: ., dockerfile: Dockerfile.prod }` |
| `ports` | Map host:container ports | `ports: ["8080:80"]` |
| `environment` | Set environment variables | `environment: { NODE_ENV: production }` |
| `env_file` | Load env vars from a file | `env_file: .env` |
| `volumes` | Mount volumes or bind mounts | `volumes: ["pgdata:/var/lib/postgresql/data"]` |
| `networks` | Attach to specific networks | `networks: [frontend, backend]` |
| `depends_on` | Define startup dependencies | `depends_on: { db: { condition: service_healthy } }` |
| `healthcheck` | Container health check command | See annotated example above |
| `restart` | Restart policy | `restart: unless-stopped` |
| `deploy` | Resource limits and replicas | `deploy: { resources: { limits: { memory: 512M } } }` |
| `command` | Override CMD | `command: ["npm", "run", "dev"]` |
| `entrypoint` | Override ENTRYPOINT | `entrypoint: ["/custom-entry.sh"]` |

---

## Service Dependencies and Startup Order

`depends_on` controls startup order but has three conditions:

| Condition | Waits For |
|-----------|----------|
| `service_started` | Container has started (default) |
| `service_healthy` | Container health check is passing |
| `service_completed_successfully` | Container has run and exited with code 0 (init tasks) |

```yaml
services:
  migrate:
    image: myapp:1.0
    command: ["python", "manage.py", "migrate"]
    depends_on:
      db:
        condition: service_healthy

  api:
    image: myapp:1.0
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
```

!!! warning "Health checks are essential"
    Without a health check, `service_healthy` cannot be used. `service_started` only means the container process has been created — the application inside may not be ready yet. Always define health checks for databases and services that take time to initialize.

---

## Networking in Compose

Compose creates a **default network** for the project automatically. All services join it and can resolve each other by service name.

```yaml
# These two services can communicate via http://api:8080
# without any explicit network configuration
services:
  web:
    image: frontend:1.0
  api:
    image: backend:1.0
```

### Custom Networks for Isolation

```yaml
services:
  web:
    networks: [frontend]
  api:
    networks: [frontend, backend]  # Bridge between the two
  db:
    networks: [backend]            # Not reachable from web

networks:
  frontend:
  backend:
```

In this setup, `web` cannot reach `db` directly — it must go through `api`.

---

## Environment Variables

=== ".env File"

    ```bash
    # .env (auto-loaded by Compose)
    POSTGRES_PASSWORD=supersecret
    APP_VERSION=1.2.3
    ```

    ```yaml
    services:
      db:
        image: postgres:16
        environment:
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      api:
        image: myapp:${APP_VERSION}
    ```

=== "env_file Directive"

    ```yaml
    services:
      api:
        env_file:
          - .env             # shared
          - .env.production   # override
    ```

=== "Inline Environment"

    ```yaml
    services:
      api:
        environment:
          - NODE_ENV=production
          - DEBUG=false
    ```

| Method | Precedence (highest first) |
|--------|---------------------------|
| `docker compose run -e VAR=val` | 1 (highest) |
| Shell environment variables | 2 |
| `environment:` in compose.yml | 3 |
| `env_file:` in compose.yml | 4 |
| `.env` file (variable substitution) | 5 (lowest) |

---

## Compose Profiles

Profiles let you selectively start services. Services without a profile always start.

```yaml
services:
  api:
    image: myapp:1.0      # Always starts (no profile)

  db:
    image: postgres:16     # Always starts
    
  debug:
    image: busybox
    profiles: [debug]      # Only starts with --profile debug

  monitoring:
    image: prometheus:latest
    profiles: [monitoring] # Only starts with --profile monitoring
```

```bash
# Start only default services (api, db)
docker compose up

# Start with monitoring
docker compose --profile monitoring up

# Start with multiple profiles
docker compose --profile debug --profile monitoring up
```

---

## Common Pattern: Web App + DB + Cache

```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/appdb
      CACHE_URL: redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  pgdata:
  redis-data:
```

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Create and start all services in detached mode |
| `docker compose down` | Stop and remove containers, networks |
| `docker compose down -v` | Also remove named volumes |
| `docker compose build` | Build or rebuild service images |
| `docker compose build --no-cache` | Rebuild without layer cache |
| `docker compose logs -f api` | Follow logs for a specific service |
| `docker compose exec api sh` | Open a shell in a running service |
| `docker compose ps` | List running services |
| `docker compose stop` | Stop services without removing them |
| `docker compose restart api` | Restart a specific service |
| `docker compose pull` | Pull latest images for all services |
| `docker compose up -d --scale worker=3` | Scale a service to multiple replicas |
| `docker compose config` | Validate and view the resolved config |
| `docker compose watch` | Start Compose Watch for file sync |

---

## Compose Watch

Compose Watch automatically syncs code changes to running containers during development — no rebuild needed.

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src

        - action: rebuild
          path: ./requirements.txt

        - action: sync+restart
          path: ./config
          target: /app/config
```

| Action | Behavior |
|--------|----------|
| `sync` | Copy changed files into the container (hot reload) |
| `rebuild` | Rebuild and recreate the container |
| `sync+restart` | Copy files and restart the container |

```bash
docker compose watch
```

!!! tip "Compose Watch vs bind mounts"
    Compose Watch is the modern replacement for bind-mounting source code. It works cross-platform (including Docker Desktop on macOS/Windows where bind mount performance is poor) and gives you fine-grained control over which changes trigger syncs vs rebuilds.

---

??? question "Interview Questions"

    **Q: What problem does Docker Compose solve?**

    Compose provides declarative multi-container orchestration. Instead of writing shell scripts with multiple `docker run` commands, network creation, and volume setup, you define the entire application stack in a single YAML file. Compose handles creating networks, volumes, proper startup ordering, and provides unified log viewing and lifecycle management.

    **Q: How does `depends_on` work and what are its limitations?**

    `depends_on` controls container startup order. With `condition: service_started`, Compose only waits for the container process to start — not for the application to be ready. With `condition: service_healthy`, Compose waits for the health check to pass before starting dependent services. Without health checks, a database container might technically be "started" but not accepting connections yet.

    **Q: How do Compose services communicate with each other?**

    Compose creates a default bridge network for the project. All services join this network and can resolve each other by service name via Docker's embedded DNS (at `127.0.0.11`). For example, a web service can reach a database at `postgres://db:5432`. Custom networks can isolate groups of services from each other.

    **Q: What is the difference between `docker compose stop` and `docker compose down`?**

    `stop` sends SIGTERM to containers and stops them, but preserves the containers, networks, and volumes. You can restart them with `docker compose start`. `down` stops and removes containers and networks. Add `-v` to also remove named volumes. `down` is a full teardown; `stop` is a pause.

    **Q: How do you handle secrets in Compose?**

    Avoid putting secrets directly in `compose.yml` or committing `.env` files. Options: use `env_file` pointing to a file in `.gitignore`, use Docker secrets (Swarm mode), or inject secrets from CI/CD environment variables at deploy time. For development, `.env` files are acceptable if they're git-ignored.

!!! tip "Further Reading"
    - [Compose Specification](https://docs.docker.com/compose/compose-file/) — full reference for all compose.yml directives
    - [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/) — official guide for development file syncing
    - [Awesome Compose](https://github.com/docker/awesome-compose) — curated list of Compose examples for common stacks
    - [Environment Variables in Compose](https://docs.docker.com/compose/how-tos/environment-variables/) — complete guide to variable precedence and substitution
