# Local Kubernetes (kind)

## 1) Create cluster

```bash
kind create cluster --config k8s/kind/cluster.yaml


kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller



docker build -t rbitly:local .
kind load docker-image rbitly:local --name rbitly



kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml
kubectl apply -f k8s/base/postgres.yaml
kubectl apply -f k8s/base/redis.yaml
kubectl apply -f k8s/base/app.yaml
kubectl apply -f k8s/base/ingress.yaml



kubectl -n rbitly get pods
kubectl -n rbitly rollout status deploy/rbitly



curl -i http://rbitly.local:8080/health
curl -i http://rbitly.local:8080/metrics | head
```
