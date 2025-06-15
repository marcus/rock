#!/bin/bash

# Load deployment configuration
if [ -f "./deploy.config" ]; then
    source ./deploy.config
else
    echo "Error: deploy.config file not found. Please create it from deploy.config.example"
    exit 1
fi

# Verify required variables are set
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_DIR" ]; then
    echo "Error: Missing required configuration variables in deploy.config"
    exit 1
fi

echo "Debugging server at $SERVER_USER@$SERVER_IP:$SERVER_DIR"
echo "----------------------------------------"

ssh $SERVER_USER@$SERVER_IP "
    echo 'Container status:'
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    echo ''
    
    echo 'Directory structure:'
    ls -la $SERVER_DIR/
    echo ''
    
    echo 'Public audio directory:'
    ls -la $SERVER_DIR/public/audio/ 2>/dev/null || echo 'No public/audio directory found'
    echo ''
    
    echo 'Generated audio directory:'
    ls -la $SERVER_DIR/public/audio/generated/ 2>/dev/null || echo 'No public/audio/generated directory found'
    echo ''
    
    echo 'Container volume mounts:'
    docker inspect \$(docker ps --format '{{.Names}}' | grep -E '(web|roysrock)' | head -1) | grep -A 10 '\"Mounts\"' 2>/dev/null || echo 'Could not inspect container mounts'
    echo ''
    
    echo 'Disk space:'
    df -h $SERVER_DIR
    echo ''
    
    echo 'Container environment variables:'
    cd $SERVER_DIR && docker-compose exec -T web printenv | grep -E '^(NODE_ENV|PORT|ELEVENLABS_API_KEY)=' 2>/dev/null || echo 'Could not check environment variables'
    echo ''
    
    echo 'Recent container logs (last 20 lines):'
    cd $SERVER_DIR && docker-compose logs --tail=20 web 2>/dev/null || echo 'No logs available'
"