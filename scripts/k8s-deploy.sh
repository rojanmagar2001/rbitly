#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== rbitly Kubernetes Deployment ===${NC}\n"

# Step 1: Create Kind cluster
echo -e "${GREEN}[1/10] Creating Kind cluster...${NC}"
if kind get clusters | grep -q "rbitly"; then
  echo -e "${YELLOW}Cluster 'rbitly' already exists. Deleting...${NC}"
  kind delete cluster --name rbitly
fi
kind create cluster --config k8s/kind/cluster.yaml
echo ""

# Step 2: Install NGINX Ingress Controller
echo -e "${GREEN}[2/10] Installing NGINX Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
echo ""

# Step 3: Wait for NGINX Ingress Controller
echo -e "${GREEN}[3/10] Waiting for NGINX Ingress Controller to be ready...${NC}"

# Wait until the deployment exists (handles slow API registration)
until kubectl -n ingress-nginx get deployment ingress-nginx-controller >/dev/null 2>&1; do
  sleep 2
done

# Now wait for it to become available
kubectl -n ingress-nginx wait \
  --for=condition=Available deployment/ingress-nginx-controller \
  --timeout=300s

kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=300s
echo ""

# Step 4: Build Docker image
echo -e "${GREEN}[4/10] Building Docker image...${NC}"
docker build -t rbitly:local .
echo ""

# Step 5: Load image into Kind
echo -e "${GREEN}[5/10] Loading Docker image into Kind cluster...${NC}"
kind load docker-image rbitly:local --name rbitly
echo ""

# Step 6: Create namespace
echo -e "${GREEN}[6/10] Creating namespace...${NC}"
kubectl apply -f k8s/base/namespace.yaml
echo ""

# Step 7: Apply configuration
echo -e "${GREEN}[7/10] Applying ConfigMap and Secrets...${NC}"
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml
echo ""

# Step 8: Deploy databases
echo -e "${GREEN}[8/10] Deploying PostgreSQL and Redis...${NC}"
kubectl apply -f k8s/base/postgres.yaml
kubectl apply -f k8s/base/redis.yaml

echo "Waiting for PostgreSQL to be ready..."
kubectl wait --namespace rbitly \
  --for=condition=ready pod \
  --selector=app=postgres \
  --timeout=300s

echo "Waiting for Redis to be ready..."
kubectl wait --namespace rbitly \
  --for=condition=ready pod \
  --selector=app=redis \
  --timeout=300s
echo ""

# Step 9: Deploy application
echo -e "${GREEN}[9/10] Deploying application...${NC}"
kubectl apply -f k8s/base/app.yaml

echo "Waiting for migration job to complete..."
kubectl wait --namespace rbitly \
  --for=condition=complete \
  --timeout=300s \
  job/rbitly-migrate || {
  echo -e "${RED}Migration job failed. Checking logs:${NC}"
  kubectl -n rbitly logs job/rbitly-migrate
  exit 1
}

echo "Waiting for application to be ready..."
kubectl -n rbitly rollout status deployment/rbitly --timeout=300s
echo ""

# Step 10: Apply ingress
echo -e "${GREEN}[10/10] Configuring ingress...${NC}"
kubectl apply -f k8s/base/ingress.yaml
echo ""

# Add hosts entry reminder
echo -e "${BLUE}=== Deployment Complete! ===${NC}\n"
echo -e "${YELLOW}Add this line to your /etc/hosts file:${NC}"
echo "127.0.0.1 rbitly.local"
echo ""

echo -e "${BLUE}Useful commands:${NC}"
echo "  View pods:        kubectl -n rbitly get pods"
echo "  View logs:        kubectl -n rbitly logs -f deployment/rbitly"
echo "  Check health:     curl -i http://rbitly.local:8080/health"
echo "  Check metrics:    curl -i http://rbitly.local:8080/metrics"
echo "  Port forward:     kubectl -n rbitly port-forward svc/rbitly 3000:3000"
echo ""

# Test health endpoint
echo -e "${GREEN}Testing health endpoint...${NC}"
sleep 5
if curl -s http://rbitly.local:8080/health >/dev/null; then
  echo -e "${GREEN}✓ Health check passed!${NC}"
else
  echo -e "${YELLOW}⚠ Health check failed. The service might still be starting.${NC}"
  echo "  Try: curl -i http://rbitly.local:8080/health"
fi
echo ""

echo -e "${GREEN}All done! Your application should be running at http://rbitly.local:8080${NC}"
