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

echo "Tailing logs from $SERVER_USER@$SERVER_IP:$SERVER_DIR"
echo "Press Ctrl+C to stop"
echo "----------------------------------------"

# Tail the logs from the server
ssh $SERVER_USER@$SERVER_IP "cd $SERVER_DIR && docker-compose logs -f --tail=50 web"