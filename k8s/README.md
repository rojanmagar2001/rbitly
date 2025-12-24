# rbitly Kubernetes Deployment

This directory contains Kubernetes manifests for deploying rbitly on a local Kind cluster.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)

## Quick Start

### 1. Deploy Everything

```bash
# Using pnpm
pnpm k8s:deploy

# Or using make
make k8s-deploy

# Or manually
bash scripts/k8s-deploy.sh
```

### 2. Add hosts entry

Add this to your `/etc/hosts` file:

```
127.0.0.1 rbitly.local
```

On macOS/Linux:

```bash
echo "127.0.0.1 rbitly.local" | sudo tee -a /etc/hosts
```

### 3. Access the application

```bash
# Health check
curl http://rbitly.local:8080/health

# Metrics
curl http://rbitly.local:8080/metrics

# Web interface
open http://rbitly.local:8080
```

## Architecture

The deployment includes:

- **rbitly app**: 2 replicas with liveness/readiness probes
- **PostgreSQL**: StatefulSet with persistent storage
- **Redis**: StatefulSet with persistent storage
- **NGINX Ingress**: For external access
- **Init containers**: Wait for database readiness
- **Migration Job**: Runs Prisma migrations before app starts

## Common Commands

### View Resources

```bash
# All resources
pnpm k8s:status

# Pods only
kubectl -n rbitly get pods

# Services
kubectl -n rbitly get svc

# Ingress
kubectl -n rbitly get ingress
```

### View Logs

```bash
# Application logs
pnpm k8s:logs:app

# PostgreSQL logs
pnpm k8s:logs:postgres

# Redis logs
pnpm k8s:logs:redis

# Migration job logs
pnpm k8s:logs:migrate

# Or use the script directly
bash scripts/k8s-logs.sh app
```

### Restart/Rebuild

```bash
# Restart app pods (without rebuilding)
pnpm k8s:restart

# Rebuild image and redeploy
pnpm k8s:rebuild
```

### Database Access

```bash
# PostgreSQL shell
pnpm k8s:psql

# Redis CLI
pnpm k8s:redis

# Or manually
kubectl -n rbitly exec -it statefulset/postgres -- psql -U rbitly -d rbitly
kubectl -n rbitly exec -it statefulset/redis -- redis-cli
```

### Shell Access

```bash
# Get shell in app pod
kubectl -n rbitly get pods
kubectl -n rbitly exec -it <pod-name> -- sh
```

### Cleanup

```bash
# Delete entire cluster
pnpm k8s:cleanup

# Or manually
kind delete cluster --name rbitly
```

## Configuration

### Secrets (k8s/base/secret.yaml)

**IMPORTANT**: Change these before deploying to production:

- `IP_HASH_SALT`: Salt for IP address hashing
- `COOKIE_SECRET`: Secret for cookie signing
- `POSTGRES_PASSWORD`: PostgreSQL password
- `METRICS_TOKEN`: Token for metrics endpoint (optional)

### Environment Variables (k8s/base/configmap.yaml)

- `NODE_ENV`: production
- `PORT`: 3000
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl -n rbitly get pods

# Describe pod for events
kubectl -n rbitly describe pod <pod-name>

# Check logs
kubectl -n rbitly logs <pod-name>
```

### Migration failures

```bash
# Check migration job logs
kubectl -n rbitly logs job/rbitly-migrate

# Delete and recreate job
kubectl -n rbitly delete job rbitly-migrate
kubectl apply -f k8s/base/app.yaml
```

### Database connection issues

```bash
# Check PostgreSQL is running
kubectl -n rbitly get statefulset postgres

# Test connection from app pod
kubectl -n rbitly exec -it deployment/rbitly -- sh
nc -zv postgres 5432
```

### Ingress not working

```bash
# Check ingress controller
kubectl -n ingress-nginx get pods

# Check ingress resource
kubectl -n rbitly describe ingress rbitly-ingress

# Test without ingress (port-forward)
kubectl -n rbitly port-forward svc/rbitly 3000:3000
curl http://localhost:3000/health
```

### Image not found

```bash
# Rebuild and load image
docker build -t rbitly:local .
kind load docker-image rbitly:local --name rbitly

# Restart deployment
kubectl -n rbitly rollout restart deployment/rbitly
```

## File Structure

```
k8s/
├── README.md
├── kind/
│   └── cluster.yaml          # Kind cluster configuration
└── base/
    ├── namespace.yaml         # Namespace definition
    ├── configmap.yaml         # Environment variables
    ├── secret.yaml            # Sensitive configuration
    ├── postgres.yaml          # PostgreSQL StatefulSet + PVC
    ├── redis.yaml             # Redis StatefulSet + PVC
    ├── app.yaml               # App Deployment + Migration Job
    └── ingress.yaml           # Ingress configuration

scripts/
├── k8s-deploy.sh             # Full deployment script
├── k8s-cleanup.sh            # Cleanup script
└── k8s-logs.sh               # Log viewing script
```

## Production Considerations

Before deploying to production:

1. **Use proper secrets management** (e.g., Sealed Secrets, External Secrets Operator)
2. **Configure resource limits** based on actual usage
3. **Set up monitoring** (Prometheus, Grafana)
4. **Configure backups** for PostgreSQL and Redis
5. **Use proper TLS certificates** (cert-manager)
6. **Configure horizontal pod autoscaling**
7. **Set up proper logging** (ELK stack, Loki)
8. **Use a managed Kubernetes service** (EKS, GKE, AKS)
9. **Implement network policies**
10. **Configure pod security policies**

## Advanced Usage

### Scaling

```bash
# Scale app replicas
kubectl -n rbitly scale deployment/rbitly --replicas=3

# Watch rollout
kubectl -n rbitly rollout status deployment/rbitly
```

### Update configuration

```bash
# Edit configmap
kubectl -n rbitly edit configmap rbitly-config

# Restart to apply changes
kubectl -n rbitly rollout restart deployment/rbitly
```

### Debug networking

```bash
# Run debug pod
kubectl -n rbitly run debug --image=nicolaka/netshoot -it --rm -- bash

# Inside debug pod
nslookup postgres
nslookup redis
curl http://rbitly:3000/health
```

## Resources

- [Kind Documentation](https://kind.sigs.k8s.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
