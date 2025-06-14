#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load deployment configuration
if [ -f "./deploy.config" ]; then
    source ./deploy.config
else
    echo -e "${RED}Error: deploy.config file not found. Please create it from deploy.config.example${NC}"
    exit 1
fi

# Verify required variables are set
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_DIR" ] || [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}Error: Missing required configuration variables in deploy.config${NC}"
    exit 1
fi

# Set default Docker registry values if not provided
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_USERNAME="${DOCKER_USERNAME:-$USER}"
DOCKER_IMAGE="${DOCKER_IMAGE:-roysrock}"
DOCKER_TAG="${DOCKER_TAG:-latest}"

# Full Docker image name
DOCKER_FULL_IMAGE="${DOCKER_REGISTRY}/${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}"

# Parse command line arguments
NO_CACHE=false
PRUNE_IMAGES=true

for arg in "$@"; do
    case $arg in
        --no-cache)
            NO_CACHE=true
            ;;
        --no-prune)
            PRUNE_IMAGES=false
            ;;
    esac
done

echo -e "${GREEN}Starting deployment process for Roy's Rock Machine...${NC}"
echo "Target server: ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}"
echo "Docker image: ${DOCKER_FULL_IMAGE}"
echo "Domain: ${DOMAIN_NAME}"

# Step 1: Prepare server
echo -e "\n${GREEN}Preparing server for deployment...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR/db $SERVER_DIR/public/audio/generated"

# Copy deployment files
echo "Copying deployment files to server..."
scp docker-compose.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/

# Copy production environment file
if [ -f ".env-prod" ]; then
    echo "Copying production environment file to server..."
    scp .env-prod $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env
elif [ -f ".env" ]; then
    echo "No .env-prod file found. Copying .env file to server..."
    scp .env $SERVER_USER@$SERVER_IP:$SERVER_DIR/
else
    echo "Creating basic .env file on server..."
    ssh $SERVER_USER@$SERVER_IP "echo 'NODE_ENV=production\nPORT=5060' > $SERVER_DIR/.env"
fi

# Step 2: Build and push Docker image
echo -e "\n${GREEN}Building and pushing Docker image...${NC}"
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

BUILD_ARGS="--build-arg BUILDKIT_INLINE_CACHE=1"

if [ "$NO_CACHE" = true ]; then
    echo "Performing a clean build with --no-cache..."
    docker build $BUILD_ARGS --platform linux/amd64 --no-cache --pull -t ${DOCKER_FULL_IMAGE} .
else
    echo "Using cached layers where possible..."
    docker build $BUILD_ARGS --platform linux/amd64 --pull -t ${DOCKER_FULL_IMAGE} .
fi

# Push with retry logic
MAX_RETRIES=3
for ((i=1; i<=MAX_RETRIES; i++)); do
    if docker push ${DOCKER_FULL_IMAGE}; then
        echo -e "${GREEN}Successfully pushed image${NC}"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo -e "${RED}Failed to push image after $MAX_RETRIES attempts${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Push failed, retrying in 5 seconds... (attempt $i/$MAX_RETRIES)${NC}"
    sleep 5
done

# Step 3: Deploy on server
echo -e "\n${GREEN}Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR && \
    docker-compose pull && \
    docker-compose down && \
    docker-compose up -d && \
    docker system prune -af && \
    docker volume prune -f
"

# Step 4: Check if the app is running
echo -e "\n${GREEN}Checking if the app is running...${NC}"
MAX_ATTEMPTS=6
for i in $(seq 1 $MAX_ATTEMPTS); do
    echo "Attempt $i: Checking container status..."
    if ssh $SERVER_USER@$SERVER_IP "docker ps | grep ${DOCKER_IMAGE}" > /dev/null; then
        echo -e "${GREEN}Container is running!${NC}"
        break
    fi
    
    if [ $i -eq $MAX_ATTEMPTS ]; then
        echo -e "${YELLOW}Warning: Container not found after multiple attempts.${NC}"
        echo "Check logs with: ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_DIR && docker-compose logs web'"
    else
        echo "Container not found yet, waiting..."
        sleep 5
    fi
done

# Step 5: Check health endpoint
echo -e "\n${GREEN}Checking health endpoint...${NC}"
MAX_HEALTH_ATTEMPTS=6
for i in $(seq 1 $MAX_HEALTH_ATTEMPTS); do
    if curl -s -f -m 5 https://$DOMAIN_NAME/api/health > /dev/null; then
        echo -e "${GREEN}Deployment successful! Health check passed.${NC}"
        break
    fi
    
    if [ $i -eq $MAX_HEALTH_ATTEMPTS ]; then
        echo -e "${YELLOW}Health check failed, but deployment might still be successful.${NC}"
        echo "Check the logs with: ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_DIR && docker-compose logs web'"
    else
        echo "Health check attempt $i failed, retrying in 5 seconds..."
        sleep 5
    fi
done

# Clean up local Docker resources after successful deployment
if [ "$PRUNE_IMAGES" = true ]; then
    echo -e "\n${GREEN}Cleaning up local Docker resources...${NC}"
    docker image rm ${DOCKER_FULL_IMAGE} 2>/dev/null || true
    docker system prune -af --filter "until=24h"
    docker builder prune -f --filter "until=24h"
fi

echo -e "\n${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}Roy's Rock Machine should be available at: https://$DOMAIN_NAME${NC}"