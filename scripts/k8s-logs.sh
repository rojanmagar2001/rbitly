#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}=== rbitly Kubernetes Logs ===${NC}\n"

# Get component from argument or default to app
COMPONENT=${1:-app}

case $COMPONENT in
app | rbitly)
  echo -e "${GREEN}Following application logs...${NC}"
  kubectl -n rbitly logs -f deployment/rbitly --all-containers=true
  ;;
postgres | pg | db)
  echo -e "${GREEN}Following PostgreSQL logs...${NC}"
  kubectl -n rbitly logs -f statefulset/postgres
  ;;
redis)
  echo -e "${GREEN}Following Redis logs...${NC}"
  kubectl -n rbitly logs -f statefulset/redis
  ;;
migrate | migration)
  echo -e "${GREEN}Showing migration job logs...${NC}"
  kubectl -n rbitly logs job/rbitly-migrate
  ;;
all)
  echo -e "${GREEN}Showing all pod logs...${NC}"
  kubectl -n rbitly get pods
  echo ""
  read -p "Enter pod name: " POD_NAME
  kubectl -n rbitly logs -f "$POD_NAME"
  ;;
*)
  echo "Usage: $0 [app|postgres|redis|migrate|all]"
  echo ""
  echo "Examples:"
  echo "  $0 app       # Application logs"
  echo "  $0 postgres  # PostgreSQL logs"
  echo "  $0 redis     # Redis logs"
  echo "  $0 migrate   # Migration job logs"
  echo "  $0 all       # Choose from all pods"
  exit 1
  ;;
esac
