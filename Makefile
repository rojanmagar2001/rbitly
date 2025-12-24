.PHONY: k8s-deploy k8s-cleanup k8s-logs k8s-status k8s-restart k8s-rebuild

# Kubernetes deployment commands
k8s-deploy:
	@chmod +x scripts/k8s-deploy.sh
	@./scripts/k8s-deploy.sh

k8s-cleanup:
	@chmod +x scripts/k8s-cleanup.sh
	@./scripts/k8s-cleanup.sh

k8s-logs:
	@chmod +x scripts/k8s-logs.sh
	@./scripts/k8s-logs.sh $(filter-out $@,$(MAKECMDGOALS))

k8s-status:
	@echo "=== Cluster Status ==="
	@kubectl cluster-info --context kind-rbitly 2>/dev/null || echo "Cluster not running"
	@echo ""
	@echo "=== Namespace Resources ==="
	@kubectl -n rbitly get all 2>/dev/null || echo "Namespace not found"
	@echo ""
	@echo "=== Ingress ==="
	@kubectl -n rbitly get ingress 2>/dev/null || echo "No ingress found"
	@echo ""
	@echo "=== PVCs ==="
	@kubectl -n rbitly get pvc 2>/dev/null || echo "No PVCs found"

k8s-restart:
	@echo "Restarting application deployment..."
	@kubectl -n rbitly rollout restart deployment/rbitly
	@kubectl -n rbitly rollout status deployment/rbitly

k8s-rebuild:
	@echo "Rebuilding and redeploying application..."
	@docker build -t rbitly:local .
	@kind load docker-image rbitly:local --name rbitly
	@kubectl -n rbitly rollout restart deployment/rbitly
	@kubectl -n rbitly rollout status deployment/rbitly
	@echo "✓ Application redeployed"

k8s-shell:
	@echo "Available pods:"
	@kubectl -n rbitly get pods
	@echo ""
	@read -p "Enter pod name: " pod; \
	kubectl -n rbitly exec -it $$pod -- sh

k8s-psql:
	@kubectl -n rbitly exec -it statefulset/postgres -- psql -U rbitly -d rbitly

k8s-redis-cli:
	@kubectl -n rbitly exec -it statefulset/redis -- redis-cli

# Allow passing arguments to k8s-logs
%:
	@:
