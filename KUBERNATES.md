# Kubernetes Deployment Quick Start

## 🚀 Deploy in One Command

```bash
pnpm k8s:deploy
```

This will:

1. Create a Kind cluster
2. Install NGINX Ingress Controller
3. Build and load Docker image
4. Deploy PostgreSQL and Redis
5. Run database migrations
6. Deploy the application

## 📝 Add Host Entry

```bash
echo "127.0.0.1 rbitly.local" | sudo tee -a /etc/hosts
```

## ✅ Verify Deployment

```bash
# Check status
pnpm k8s:status

# Test health endpoint
curl http://rbitly.local:8080/health

# Access the app
open http://rbitly.local:8080
```

## 🔧 Common Tasks

| Task               | Command             |
| ------------------ | ------------------- |
| View logs          | `pnpm k8s:logs:app` |
| Restart app        | `pnpm k8s:restart`  |
| Rebuild & redeploy | `pnpm k8s:rebuild`  |
| PostgreSQL shell   | `pnpm k8s:psql`     |
| Redis CLI          | `pnpm k8s:redis`    |
| Delete cluster     | `pnpm k8s:cleanup`  |

## 📊 Monitoring

```bash
# Watch pods
kubectl -n rbitly get pods -w

# Follow all app logs
kubectl -n rbitly logs -f deployment/rbitly --all-containers

# Port forward for direct access
kubectl -n rbitly port-forward svc/rbitly 3000:3000
```

## 🐛 Troubleshooting

### Pods not ready?

```bash
kubectl -n rbitly describe pod <pod-name>
kubectl -n rbitly logs <pod-name>
```

### Migration failed?

```bash
pnpm k8s:logs:migrate
kubectl -n rbitly delete job rbitly-migrate
kubectl apply -f k8s/base/app.yaml
```

### Can't reach app?

```bash
# Test without ingress
kubectl -n rbitly port-forward svc/rbitly 3000:3000
curl http://localhost:3000/health
```

## 📚 Full Documentation

See [k8s/README.md](k8s/README.md) for detailed documentation.

## 🧹 Cleanup

```bash
pnpm k8s:cleanup
```

---

**Note**: This is a development setup using Kind. For production, use a managed Kubernetes service and proper security configurations.
