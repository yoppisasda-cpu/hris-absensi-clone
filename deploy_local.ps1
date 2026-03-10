# Deployment script for Aivola SaaS (Synology NAS)
# This script builds the Docker images and saves them as .tar files

$BACKEND_TAG = "aivola-backend:v1.1"
$FRONTEND_TAG = "aivola-admin:v1.1"
$API_URL = "https://api.aivola.id/api"

Write-Host "--- 1. Building Backend Image ---" -ForegroundColor Cyan
docker build -t $BACKEND_TAG ./backend

Write-Host "--- 2. Building Web Admin Image ---" -ForegroundColor Cyan
# Next.js needs the API URL during build time
docker build --build-arg NEXT_PUBLIC_API_URL=$API_URL -t $FRONTEND_TAG ./web-admin

Write-Host "--- 3. Exporting Images to .tar ---" -ForegroundColor Cyan
docker save -o aivola-backend-v1.1.tar $BACKEND_TAG
docker save -o aivola-admin-v1.1.tar $FRONTEND_TAG

Write-Host "--- SUCCESS ---" -ForegroundColor Green
Write-Host "Images are ready: aivola-backend-v1.1.tar, aivola-admin-v1.1.tar"
Write-Host "Copy these files and backend/docker-compose.yml to your NAS (/volume1/docker/aivola)"
