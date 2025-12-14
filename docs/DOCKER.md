# Docker Deployment Guide

This guide explains how to deploy and run the Help Desk application using Docker.

## Overview

The Help Desk application includes Docker configuration for easy deployment and containerization. The setup uses a multi-stage build process to create an optimized production image.

## Docker Files

### Dockerfile

The main `Dockerfile` uses a multi-stage build:

1. **Build Stage**: Uses Node.js 20 Alpine to build the React application
2. **Production Stage**: Uses Nginx Alpine to serve the static files

### docker-compose.yml

Provides a complete service definition with:
- Port mapping (3000:80)
- Health checks
- Volume mounting for logs
- Automatic restart policy

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and run the application:**
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application:**
   - Open your browser to `http://localhost:3000`

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t helpdesk-app .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:80 helpdesk-app
   ```

## Configuration Details

### Build Process

The Docker build process:
1. Copies `react/package*.json` files
2. Installs dependencies with `npm ci`
3. Copies the entire React application source
4. Builds the application with `npm run build`
5. Creates a production Nginx image with the built files

### Nginx Configuration

The container includes a custom Nginx configuration for Single Page Application (SPA) routing:
- Serves files from `/usr/share/nginx/html`
- Handles client-side routing with `try_files`
- Redirects all routes to `index.html` for proper SPA behavior

### Health Checks

The docker-compose configuration includes health checks:
- Uses `wget` to test application availability
- Checks every 30 seconds
- 10-second timeout
- 3 retries before marking as unhealthy
- 40-second startup grace period

## Development vs Production

### Development
For development, use the standard development server:
```bash
cd react
npm install
npm run dev
```

### Production
For production deployment, use Docker:
```bash
docker-compose up -d --build
```

## Volumes and Persistence

### Log Files
The docker-compose setup mounts `./logs` to `/var/log/nginx` for log persistence:
```yaml
volumes:
  - ./logs:/var/log/nginx
```

## Port Configuration

- **External Port**: 3000 (configurable in docker-compose.yml)
- **Internal Port**: 80 (Nginx default)

To change the external port, modify the docker-compose.yml:
```yaml
ports:
  - "8080:80"  # Changes external port to 8080
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Change port in docker-compose.yml or stop conflicting service
   ```

2. **Build failures:**
   ```bash
   # Clean build with no cache
   docker-compose build --no-cache
   ```

3. **Application not loading:**
   ```bash
   # Check container logs
   docker-compose logs helpdesk
   
   # Check container status
   docker ps
   ```

### Viewing Logs

```bash
# View live logs
docker-compose logs -f helpdesk

# View Nginx access logs (if volume mounted)
tail -f logs/access.log

# View Nginx error logs
tail -f logs/error.log
```

## Stopping the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all
```

## Environment Variables

Currently, the Docker setup doesn't use environment variables. Configuration is handled through:
- Firebase configuration in the React application
- Build-time settings in the Vite configuration

## Security Considerations 

- The container runs Nginx as a non-root user
- Only port 80 is exposed within the container
- Static files are served without execute permissions
- Health checks ensure application availability

## Next Steps

For production deployments, consider:
- Adding SSL/TLS termination
- Using a reverse proxy (Traefik, nginx-proxy)
- Implementing monitoring and logging solutions
- Setting up automated backups
- Configuring CI/CD pipelines