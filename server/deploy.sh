#!/bin/bash
set -e

echo "=== Deploying Excellent AI Tutor API Server ==="
cd /var/www/excellent-ai-tutor

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
npm install

echo "3. Generating Prisma client..."
npx prisma generate

echo "4. Restarting API server..."
pm2 restart excellent-api || pm2 start server/ecosystem.config.js

echo "5. Checking status..."
pm2 status

echo "=== Deployment complete at $(date) ==="
