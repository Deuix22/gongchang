#!/bin/bash

app_env=${1:-development}

# Set MongoDB connection string (can be overridden by environment variable)
export MONGODB_URI=${MONGODB_URI:-"mongodb://root:6n2825zx@test-db-mongodb.ns-o9xuidp4.svc:27017/attendance?authSource=admin"}

# Development environment commands
dev_commands() {
    echo "Running development environment commands..."
    NODE_ENV=development npm run dev
}

# Production environment commands
prod_commands() {
    echo "Running production environment commands..."
    NODE_ENV=production npm start
}

# Check environment variables to determine the running environment
if [ "$app_env" = "production" ] || [ "$app_env" = "prod" ] ; then
    echo "Production environment detected"
    prod_commands
else
    echo "Development environment detected"
    dev_commands
fi
