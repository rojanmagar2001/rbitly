## VPS Requirements

1.  **Server**: A Linux VPS (Ubuntu recommended).
2.  **SSH Access**: Root or a user with `sudo` privileges.

> [!NOTE]
> The deployment workflow now includes **Auto-Provisioning**. It will automatically check for and install Docker and initialize Docker Swarm on your VPS during the first deployment.

## GitHub Repository Secrets

Add the following secrets in **Settings > Secrets and variables > Actions**:

| Secret            | Description               | Example                              |
| :---------------- | :------------------------ | :----------------------------------- |
| `VPS_HOST`        | VPS IP or Domain          | `1.2.3.4`                            |
| `VPS_USER`        | SSH Username              | `root`                               |
| `SSH_PRIVATE_KEY` | Private SSH Key           | `-----BEGIN RSA PRIVATE KEY-----...` |
| `ENV_PRODUCTION`  | Production `.env` content | `DATABASE_URL=...`                   |

## Deployment Process

The CI/CD pipeline is fully automated:

1.  **Push to `main`**: Triggers the GitHub Actions workflow.
2.  **Build**: Docker image is built and pushed to **GitHub Container Registry (GHCR)**.
3.  **Deploy**:
    - Workflow connects to your VPS via SSH.
    - Updates `docker-stack.yml` and `.env.production`.
    - Runs `docker stack deploy` for a zero-downtime update.

## Manual Management (on VPS)

You can manage the stack manually on the server using these commands (or via the `Makefile` if you have it on the server):

- **Check Status**: `docker stack ps rbitly`
- **View Logs**: `docker service logs -f rbitly_app`
- **Remove Stack**: `docker stack rm rbitly`

## Troubleshooting

### Rolling Update Stuck

If the update hangs, check the logs:

```bash
docker service logs rbitly_app
```

### Image Pull Failure

Ensure you've logged in to GHCR on the VPS:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

(The GitHub Action handles this automatically during deployment).
