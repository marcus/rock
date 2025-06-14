Server config note port 5060, for the backend use something above 5051. Cert is already installed. 
server {
    server_name beats.opentangle.com;

    location / {
        proxy_pass http://localhost:5060;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for long polling / EventSource / WebSocket fallback
        proxy_buffering off;
        proxy_cache off;
    }


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/beats.opentangle.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/beats.opentangle.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}

server {
    listen 80;
    server_name beats.opentangle.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}
server {
    if ($host = beats.opentangle.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    server_name beats.opentangle.com;
    listen 80;
    return 404; # managed by Certbot


}

// Example deploy for another project on the same server:
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
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_DIR" ]; then
    echo -e "${RED}Error: Missing required configuration variables in deploy.config${NC}"
    exit 1
fi

echo -e "${GREEN}Starting pre-deployment checks...${NC}"

# Check 1: Local environment
echo -e "\n${GREEN}Checking local environment:${NC}"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Docker is installed${NC}"
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed or not in PATH${NC}"
    exit 1
else
    echo -e "${GREEN}✅ docker-compose is installed${NC}"
fi

# Check if required files exist
echo -e "\n${GREEN}Checking required files:${NC}"
required_files=("Dockerfile" "docker-compose.yml" "app.py" "requirements.txt")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Required file $file not found${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ $file exists${NC}"
    fi
done

# Check if local .env file exists
echo -e "\n${GREEN}Checking local .env file:${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️ Local .env file not found. Creating a basic one.${NC}"
    echo "FLASK_ENV=production" > .env
    echo -e "${GREEN}✅ Created basic .env file${NC}"
else
    echo -e "${GREEN}✅ Local .env file exists${NC}"
fi

# Check 2: Remote server accessibility
echo -e "\n${GREEN}Checking remote server accessibility:${NC}"

# Check SSH connection
echo "Checking SSH connection to $SERVER_USER@$SERVER_IP..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo 2>&1" > /dev/null; then
    echo -e "${RED}❌ Cannot connect to server via SSH. Check your SSH keys and server status.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ SSH connection successful${NC}"
fi

# Check 3: Remote server environment
echo -e "\n${GREEN}Checking remote server environment:${NC}"

# Check if Docker is installed on the server
echo "Checking if Docker is installed on the server..."
if ! ssh $SERVER_USER@$SERVER_IP "command -v docker > /dev/null && echo yes || echo no" | grep -q "yes"; then
    echo -e "${RED}❌ Docker is not installed on the server${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Docker is installed on the server${NC}"
fi

# Check if docker-compose is installed on the server
echo "Checking if docker-compose is installed on the server..."
if ! ssh $SERVER_USER@$SERVER_IP "command -v docker-compose > /dev/null && echo yes || echo no" | grep -q "yes"; then
    echo -e "${RED}❌ docker-compose is not installed on the server${NC}"
    exit 1
else
    echo -e "${GREEN}✅ docker-compose is installed on the server${NC}"
fi

# Check if the deployment directory exists
echo "Checking if deployment directory exists on the server..."
if ! ssh $SERVER_USER@$SERVER_IP "[ -d $SERVER_DIR ] && echo yes || echo no" | grep -q "yes"; then
    echo -e "${YELLOW}⚠️ Deployment directory $SERVER_DIR does not exist on the server${NC}"
    read -p "Do you want to create it? (y/n): " create_dir
    if [ "$create_dir" = "y" ] || [ "$create_dir" = "Y" ]; then
        ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR"
        echo -e "${GREEN}✅ Created deployment directory on the server${NC}"
    else
        echo -e "${RED}❌ Deployment directory must exist before deployment${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Deployment directory exists on the server${NC}"
fi

# Check if .env file exists on the server
echo "Checking if .env file exists on the server..."
if ! ssh $SERVER_USER@$SERVER_IP "[ -f $SERVER_DIR/.env ] && echo yes || echo no" | grep -q "yes"; then
    echo -e "${YELLOW}⚠️ .env file not found on the server.${NC}"
    
    if [ -f ".env" ]; then
        read -p "Do you want to copy your local .env file to the server? (y/n): " copy_env
        if [ "$copy_env" = "y" ] || [ "$copy_env" = "Y" ]; then
            scp .env $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env
            echo -e "${GREEN}✅ Copied .env file to the server${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Creating basic .env file on server${NC}"
        ssh $SERVER_USER@$SERVER_IP "echo 'FLASK_ENV=production' > $SERVER_DIR/.env"
    fi
else
    echo -e "${GREEN}✅ .env file exists on the server${NC}"
fi

# Check 4: Docker registry access
echo -e "\n${GREEN}Checking Docker registry access:${NC}"

# Set default Docker registry values if not provided
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_USERNAME="${DOCKER_USERNAME:-$USER}"

# Check if logged in to GitHub Container Registry locally
echo "Checking local $DOCKER_REGISTRY login status..."
if ! docker info | grep -q "$DOCKER_REGISTRY"; then
    echo -e "${YELLOW}⚠️ Not logged in to $DOCKER_REGISTRY locally${NC}"
    echo -e "${YELLOW}⚠️ You may need to run: echo '<your_personal_access_token>' | docker login $DOCKER_REGISTRY -u $DOCKER_USERNAME --password-stdin${NC}"
else
    echo -e "${GREEN}✅ Logged in to $DOCKER_REGISTRY locally${NC}"
fi

# Check if logged in to GitHub Container Registry on the server
echo "Checking server $DOCKER_REGISTRY login status..."
if ! ssh $SERVER_USER@$SERVER_IP "docker info 2>/dev/null | grep -q \"$DOCKER_REGISTRY\""; then
    echo -e "${YELLOW}⚠️ Not logged in to $DOCKER_REGISTRY on the server${NC}"
    echo -e "${YELLOW}⚠️ You may need to run on the server: echo '<your_personal_access_token>' | docker login $DOCKER_REGISTRY -u $DOCKER_USERNAME --password-stdin${NC}"
else
    echo -e "${GREEN}✅ Logged in to $DOCKER_REGISTRY on the server${NC}"
fi

# Check 5: Network connectivity
echo -e "\n${GREEN}Checking network connectivity:${NC}"

# Get port from docker-compose.yml or use default
PORT=$(grep -E '"([0-9]+):' docker-compose.yml | head -1 | sed -E 's/.*"([0-9]+).*/\1/')
PORT=${PORT:-5050}

# Check if port is available on the server
echo "Checking if port $PORT is available on the server..."
if ssh $SERVER_USER@$SERVER_IP "netstat -tuln | grep ':$PORT '" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Port $PORT is already in use on the server${NC}"
    echo -e "${YELLOW}⚠️ You may need to choose a different port or stop the service using it${NC}"
else
    echo -e "${GREEN}✅ Port $PORT is available on the server${NC}"
fi

# Check 6: Database
echo -e "\n${GREEN}Checking database:${NC}"

# Check if local database exists for seeding
if [ -f "./db/dogvertize.db" ]; then
    echo -e "${GREEN}✅ Local database exists for seeding${NC}"
else
    echo -e "${YELLOW}⚠️ Local database not found at ./db/dogvertize.db${NC}"
    echo -e "${YELLOW}⚠️ Database will be created automatically on first run${NC}"
fi

# Final summary
echo -e "\n${GREEN}Pre-deployment check summary:${NC}"
echo -e "${GREEN}✅ Local environment is ready for deployment${NC}"
echo -e "${GREEN}✅ Remote server is accessible${NC}"
echo -e "${GREEN}✅ Remote server environment is properly configured${NC}"
echo -e "${GREEN}✅ All required files are present${NC}"

echo -e "\n${GREEN}You are ready to deploy! Run ./deploy.sh to start the deployment process.${NC}"


example config:
# Deployment configuration
# This file should be gitignored and not committed to the repository

# Server details
SERVER_IP="146.190.117.215"
SERVER_USER="marcus"
SERVER_DIR="/home/marcus/dogvertize"
DOMAIN_NAME="dogvertize.com"

# Docker registry
DOCKER_REGISTRY="ghcr.io"
DOCKER_USERNAME="marcus"
DOCKER_IMAGE="dogvertize"
DOCKER_TAG="web-latest"

# Port configuration
PORT="5050"

example deploy script:
#!/bin/bash

# Exit on any error
set -e

# Load deployment configuration
if [ -f "./deploy.config" ]; then
    source ./deploy.config
else
    echo "Error: deploy.config file not found. Please create it from deploy.config.example"
    exit 1
fi

# Verify required variables are set
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_DIR" ] || [ -z "$DOMAIN_NAME" ]; then
    echo "Error: Missing required configuration variables in deploy.config"
    exit 1
fi

# Set default Docker registry values if not provided
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_USERNAME="${DOCKER_USERNAME:-$USER}"
DOCKER_IMAGE="${DOCKER_IMAGE:-dogvertize}"
DOCKER_TAG="${DOCKER_TAG:-web-latest}"

# Full Docker image name
DOCKER_FULL_IMAGE="${DOCKER_REGISTRY}/${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}"

# Parse command line arguments
NO_CACHE=false
SEED_DB=false
PRUNE_IMAGES=true

for arg in "$@"; do
    case $arg in
        --no-cache)
            NO_CACHE=true
            ;;
        --seed-db)
            SEED_DB=true
            ;;
        --no-prune)
            PRUNE_IMAGES=false
            ;;
    esac
done

echo "Starting deployment process..."
echo "Target server: ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}"
echo "Docker image: ${DOCKER_FULL_IMAGE}"

# Step 1: Optimize and prepare server in parallel
echo "Preparing server for update..."
# Copy essential files in one SSH connection
(
    ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR"
    scp docker-compose.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/
    
    # Check if .env-prod file exists locally
    if [ -f ".env-prod" ]; then
        echo "Copying production environment file to server..."
        scp .env-prod $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env
    elif [ -f ".env" ]; then
        echo "No .env-prod file found. Copying .env file to server..."
        scp .env $SERVER_USER@$SERVER_IP:$SERVER_DIR/
        # Ensure FLASK_ENV=production is set in the .env file
        echo "Ensuring FLASK_ENV is set to production in .env file..."
        ssh $SERVER_USER@$SERVER_IP "grep -q '^FLASK_ENV=' $SERVER_DIR/.env && sed -i 's/^FLASK_ENV=.*/FLASK_ENV=production/' $SERVER_DIR/.env || echo 'FLASK_ENV=production' >> $SERVER_DIR/.env"
    else
        echo "No environment files found. Creating a basic .env file on the server..."
        ssh $SERVER_USER@$SERVER_IP "echo 'FLASK_ENV=production' > $SERVER_DIR/.env"
    fi

) &
PREPARE_PID=$!

# Step 2: Build and push Docker images with BuildKit enabled
echo "Building and pushing Docker images..."
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Add build args to improve caching
BUILD_ARGS="--build-arg BUILDKIT_INLINE_CACHE=1"

# Add --no-cache flag if a full rebuild is needed
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
        echo "Successfully pushed image"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo "Failed to push image after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "Push failed, retrying in 5 seconds... (attempt $i/$MAX_RETRIES)"
    sleep 5
done

# Wait for server preparation to complete
wait $PREPARE_PID

# Step 3: SSH into server and update
echo "Updating server..."
ssh $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR && \
    docker-compose pull && \
    docker-compose down && \
    docker-compose up -d && \
    docker system prune -af && \
    docker volume prune -f
"

# Step 4: Check if the app is running
echo "Checking if the app is running..."
MAX_ATTEMPTS=6
for i in $(seq 1 $MAX_ATTEMPTS); do
    echo "Attempt $i: Checking container status..."
    if ssh $SERVER_USER@$SERVER_IP "docker ps | grep ${DOCKER_IMAGE}" > /dev/null; then
        echo "Container is running!"
        break
    fi
    
    if [ $i -eq $MAX_ATTEMPTS ]; then
        echo "Warning: Container not found after multiple attempts."
    else
        echo "Container not found yet, waiting..."
        sleep 5
    fi
done

# Step 5: Check health endpoint with retries
echo "Checking health endpoint..."
MAX_HEALTH_ATTEMPTS=6
for i in $(seq 1 $MAX_HEALTH_ATTEMPTS); do
    if curl -s -f -m 5 https://$DOMAIN_NAME/health > /dev/null; then
        echo "Deployment successful! Health check passed."
        break
    fi
    
    if [ $i -eq $MAX_HEALTH_ATTEMPTS ]; then
        echo "Health check failed, but deployment might still be successful."
        echo "Check the logs with: ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_DIR && docker-compose logs web'"
    else
        echo "Health check attempt $i failed, retrying in 5 seconds..."
        sleep 5
    fi
done

# Step 6: Seed database if --seed-db flag was provided
if [ "$SEED_DB" = true ]; then
    echo "Seeding the database from local data..."
    
    # Check if local database exists
    if [ -f "./db/dogvertize.db" ]; then
        # Optimize database transfer
        echo "Preparing database transfer..."
        
        # Create a compressed backup of the database with efficient settings
        echo "Creating compressed database backup..."
        sqlite3 ./db/dogvertize.db ".backup './db/dogvertize.db.bak'"
        tar -czf ./db/dogvertize.db.tar.gz -C ./db dogvertize.db.bak
        
        # Stop the container before copying the database
        echo "Stopping the container to safely copy the database..."
        ssh $SERVER_USER@$SERVER_IP "cd $SERVER_DIR && docker-compose stop web"
        
        # Ensure db directory exists on server
        ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR/db"
        
        # Backup existing database if it exists
        ssh $SERVER_USER@$SERVER_IP "if [ -f $SERVER_DIR/db/dogvertize.db ]; then cp $SERVER_DIR/db/dogvertize.db $SERVER_DIR/db/dogvertize.db.backup; echo 'Existing database backed up.'; fi"
        
        # Copy compressed database to server with compression
        echo "Copying compressed database to server..."
        scp -C ./db/dogvertize.db.tar.gz $SERVER_USER@$SERVER_IP:$SERVER_DIR/db/
        
        # Extract and restore database on server
        echo "Extracting and restoring database on server..."
        ssh $SERVER_USER@$SERVER_IP "
            cd $SERVER_DIR/db && \
            tar -xzf dogvertize.db.tar.gz && \
            mv dogvertize.db.bak dogvertize.db && \
            chmod 666 dogvertize.db && \
            rm dogvertize.db.tar.gz
        "
        
        # Clean up local temporary files
        rm ./db/dogvertize.db.bak ./db/dogvertize.db.tar.gz
        
        # Restart the container
        echo "Restarting the container..."
        ssh $SERVER_USER@$SERVER_IP "cd $SERVER_DIR && docker-compose start web"
        
        echo "Database seeded successfully!"
    else
        echo "Error: Local database file not found at ./db/dogvertize.db"
        exit 1
    fi
fi

# Clean up local Docker resources after successful deployment
if [ "$PRUNE_IMAGES" = true ]; then
    echo "Cleaning up local Docker resources..."
    docker image rm ${DOCKER_FULL_IMAGE} 2>/dev/null || true
    docker system prune -af --filter "until=24h"
    docker builder prune -f --filter "until=24h"
fi

echo "Deployment completed!"
echo "Site should be available at: https://$DOMAIN_NAME"

given that it's the same server, assuming we get the dockerfile right and get that .env file in place i think we should be able to get this deployed in one go, no?