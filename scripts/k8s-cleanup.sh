#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Cleaning up rbitly Kubernetes resources ===${NC}\n"

# Check if cluster exists
if ! kind get clusters | grep -q "rbitly"; then
  echo -e "${YELLOW}Cluster 'rbitly' does not exist. Nothing to clean up.${NC}"
  exit 0
fi

# Ask for confirmation
echo -e "${RED}This will delete the entire Kind cluster and all data.${NC}"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo -e "\n${GREEN}Deleting Kind cluster...${NC}"
kind delete cluster --name rbitly

echo -e "${GREEN}✓ Cleanup complete!${NC}"
