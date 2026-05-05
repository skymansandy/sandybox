# Docker

Docker is the industry-standard platform for building, shipping, and running applications in containers. It packages an application and its dependencies into a lightweight, portable unit that runs consistently across any environment — from a developer's laptop to production clusters.

---

## Sub-Topics

| Topic | What It Covers |
|-------|---------------|
| [Docker Fundamentals](fundamentals.md) | Containers vs VMs, Docker architecture, images, layers, Dockerfile instructions, build context |
| [Networking & Storage](networking-storage.md) | Network drivers, bridge networks, DNS, port mapping, volumes, bind mounts, tmpfs |
| [Docker Compose](compose.md) | Multi-container orchestration, docker-compose.yml, service dependencies, profiles, Compose Watch |
| [Best Practices](best-practices.md) | Multi-stage builds, layer caching, image optimization, security, production checklist |

---

## Docker Workflow

```mermaid
flowchart LR
    CODE[Source Code] --> BUILD[docker build<br/>Create Image]
    BUILD --> SHIP[docker push<br/>Registry]
    SHIP --> PULL[docker pull<br/>Any Host]
    PULL --> RUN[docker run<br/>Container]
    RUN --> MONITOR[Logs & Health<br/>Checks]
```

---

## Essential Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `docker build -t name:tag .` | Build an image from a Dockerfile |
| `docker run -d -p 8080:80 name` | Run a container in detached mode with port mapping |
| `docker ps` | List running containers |
| `docker ps -a` | List all containers (including stopped) |
| `docker images` | List local images |
| `docker logs -f <container>` | Follow container logs |
| `docker exec -it <container> sh` | Open a shell inside a running container |
| `docker stop <container>` | Gracefully stop a container (SIGTERM) |
| `docker rm <container>` | Remove a stopped container |
| `docker rmi <image>` | Remove an image |
| `docker system prune` | Remove all stopped containers, unused networks, dangling images |
| `docker compose up -d` | Start all services defined in `compose.yml` |
| `docker compose down` | Stop and remove all Compose services |
