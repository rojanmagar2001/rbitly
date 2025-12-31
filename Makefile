.PHONY: docker-build docker-clean docker-ps
.PHONY: docker-dev-up docker-dev-down docker-dev-logs docker-dev-restart docker-dev-shell docker-dev-psql docker-dev-redis
.PHONY: docker-prod-up docker-prod-down docker-prod-logs docker-prod-restart docker-prod-shell docker-prod-psql docker-prod-redis
.PHONY: db-migrate db-generate db-deploy db-studio db-push db-status
.PHONY: stack-deploy stack-rm stack-ps stack-services stack-logs
.PHONY: k8s-deploy k8s-cleanup k8s-logs k8s-status k8s-restart k8s-rebuild

############################
# Docker Commands
############################

# General Docker commands
docker-build:
	@echo "Building Docker image..."
	@docker build -t rbitly:local .
	@echo "✓ Image built successfully"

docker-clean:
	@echo "Cleaning up Docker resources..."
	@docker system prune -f
	@echo "✓ Cleanup complete"

docker-ps:
	@docker ps -a --filter "label=com.rbitly.environment"

# Development Docker commands
docker-dev-up:
	@echo "Starting development environment..."
	@docker compose up -d --build
	@echo "✓ Development environment started"
	@echo "App: http://localhost:3000"

docker-dev-down:
	@echo "Stopping development environment..."
	@docker compose down
	@echo "✓ Development environment stopped"

docker-dev-down-volumes:
	@echo "Stopping development environment and removing volumes..."
	@docker compose down -v
	@echo "✓ Development environment stopped and volumes removed"

docker-dev-logs:
	@docker compose logs -f app

docker-dev-logs-all:
	@docker compose logs -f

docker-dev-restart:
	@echo "Restarting development containers..."
	@docker compose restart
	@echo "✓ Development containers restarted"

docker-dev-shell:
	@docker compose exec app sh

docker-dev-psql:
	@docker compose exec postgres psql -U rbitly -d rbitly

docker-dev-redis:
	@docker compose exec redis redis-cli

docker-dev-migrate:
	@docker compose exec app pnpm prisma migrate deploy

# Production Docker commands
docker-prod-up:
	@echo "Starting production environment..."
	@if [ ! -f .env.production ]; then \
		echo "❌ Error: .env.production file not found!"; \
		echo "Please create .env.production from .env.production template"; \
		exit 1; \
	fi
	@docker compose -f docker-compose.prod.yml up -d --build
	@echo "✓ Production environment started"
	@echo "App: http://localhost:3000"

docker-prod-down:
	@echo "Stopping production environment..."
	@docker compose -f docker-compose.prod.yml down
	@echo "✓ Production environment stopped"

docker-prod-down-volumes:
	@echo "Stopping production environment and removing volumes..."
	@docker compose -f docker-compose.prod.yml down -v
	@echo "✓ Production environment stopped and volumes removed"

docker-prod-logs:
	@docker compose -f docker-compose.prod.yml logs -f app

docker-prod-logs-all:
	@docker compose -f docker-compose.prod.yml logs -f

docker-prod-restart:
	@echo "Restarting production containers..."
	@docker compose -f docker-compose.prod.yml restart
	@echo "✓ Production containers restarted"

docker-prod-shell:
	@docker compose -f docker-compose.prod.yml exec app sh

docker-prod-psql:
	@docker compose -f docker-compose.prod.yml exec postgres psql -U rbitly -d rbitly

docker-prod-redis:
	@docker compose -f docker-compose.prod.yml exec redis redis-cli

docker-prod-migrate:
	@docker compose -f docker-compose.prod.yml exec app pnpm prisma migrate deploy

############################
# Database Commands (Local)
############################

db-migrate:
	@pnpm prisma migrate dev

db-generate:
	@pnpm prisma generate

db-deploy:
	@pnpm prisma migrate deploy

db-studio:
	@pnpm prisma studio

db-push:
	@pnpm prisma db push

db-status:
	@pnpm prisma migrate status

############################
# Docker Stack Commands (Swarm)
############################

stack-deploy:
	@echo "Deploying Docker Stack..."
	@if [ ! -f .env.production ]; then \
		echo "❌ Error: .env.production file not found!"; \
		exit 1; \
	fi
	@export $$(grep -v '^#' .env.production | xargs) && \
		docker stack deploy -c docker-stack.yml rbitly --with-registry-auth --prune
	@echo "✓ Stack deployed"

stack-rm:
	@echo "Removing Docker Stack..."
	@docker stack rm rbitly
	@echo "✓ Stack removed"

stack-ps:
	@docker stack ps rbitly

stack-services:
	@docker stack services rbitly

stack-logs:
	@docker service logs -f rbitly_app

stack-migrate:
	@echo "Running migrations for stack..."
	@if [ ! -f .env.production ]; then \
		echo "❌ Error: .env.production file not found!"; \
		exit 1; \
	fi
	@export $$(grep -v '^#' .env.production | xargs) && \
		docker run --rm \
			--network rbitly-network-prod \
			--env DATABASE_URL=$$DATABASE_URL \
			ghcr.io/$${GITHUB_REPOSITORY_OWNER:-rojanmagar2001}/rbitly:latest \
			pnpm prisma migrate deploy
	@echo "✓ Migrations completed"

############################
# Kubernetes Commands
############################

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
