# Security Hardening Quick Start Guide

This guide provides immediate, actionable steps to improve the security of your home server setup.

## Immediate Actions (Do These First)

### 1. Secure Sensitive Data (CRITICAL)
```bash
# Remove hardcoded secrets from compose files
# Edit monitoring/monitoring.yml - Remove hardcoded Grafana password
# Edit media/media.yml - Remove hardcoded Plex claim token

# Create .env file from template
cp .env.example .env
chmod 600 .env  # Restrict permissions
# Edit .env and fill in your actual values

# Update compose files to use environment variables
```

**Files to update:**
- `monitoring/monitoring.yml`: Replace `GF_SECURITY_ADMIN_PASSWORD=grafana` with `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}`
- `media/media.yml`: Replace `PLEX_CLAIM=claim-n3RF9y2y2jn6_pcRV-SQ` with `PLEX_CLAIM=${PLEX_CLAIM_TOKEN}`

### 2. Add Security Options to All Containers

Add this to every service in your compose files:

```yaml
security_opt:
  - no-new-privileges:true
```

**Services currently missing this:**
- monitoring.yml: prometheus, node-exporter, alertmanager, cadvisor, grafana, smartctl-exporter, watchtower
- media.yml: plex-server
- portainer/portainer.yml: portainer
- homepage/homepage.yml: homepage
- kitchen/kitchen.yml: db_recipes, web_recipes, nginx_recipes
- music/music.yml: soulsync
- paperless/paperless.yml: broker, db, gotenberg, tika
- immich/immich.yml: immich-server, immich-machine-learning, redis, database

### 3. Add Resource Limits

Add to all services to prevent resource exhaustion:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Adjust based on service needs
      memory: 1G       # Adjust based on service needs
    reservations:
      cpus: '0.25'
      memory: 256M
```

### 4. Secure Docker Socket Access

For services that mount the Docker socket, use read-only when possible:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro  # Add :ro for read-only
```

**Services with Docker socket:**
- portainer/portainer.yml: portainer (keep read-write for management)
- homepage/homepage.yml: homepage (change to :ro)
- monitoring/monitoring.yml: watchtower (keep read-write for updates)

### 5. Bind Ports to Localhost

For services that don't need external access, bind to localhost:

```yaml
ports:
  - "127.0.0.1:9090:9090"  # Only accessible from localhost
```

**Recommended for:**
- Prometheus (9090) - Access via Grafana
- Node Exporter (9100) - Only needs Prometheus access
- Alertmanager (9093) - Access via Grafana
- cAdvisor (8082) - Only needs Prometheus access

## Medium Priority Actions

### 6. Replace Privileged Mode

For smartctl-exporter in monitoring.yml:

**Current (Insecure):**
```yaml
smartctl-exporter:
  privileged: true
```

**Better (More Secure):**
```yaml
smartctl-exporter:
  cap_add:
    - SYS_RAWIO
    - SYS_ADMIN
  devices:
    - /dev/sda
    - /dev/sdb
    # Add all your drives
```

Or consider running smartctl monitoring directly on the host instead of in a container.

### 7. Review Watchtower Auto-Updates

Auto-updates are convenient but can break things. Consider:

**Option A: Opt-in updates only**
```yaml
watchtower:
  environment:
    - WATCHTOWER_LABEL_ENABLE=true  # Only update containers with label
    
# Then on containers you want to auto-update:
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

**Option B: Notification only**
```yaml
watchtower:
  environment:
    - WATCHTOWER_MONITOR_ONLY=true  # Notify but don't update
```

### 8. Implement Reverse Proxy Only Access

Use Traefik for all web services and don't expose container ports directly:

**Before:**
```yaml
services:
  myservice:
    ports:
      - "8080:8080"  # Directly exposed
```

**After:**
```yaml
services:
  myservice:
    # Remove ports section
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myservice.rule=Host(`myservice.yourdomain.com`)"
      - "traefik.http.services.myservice.loadbalancer.server.port=8080"
    networks:
      - internal
```

### 9. Enable Firewall on Host

```bash
# Install UFW (Ubuntu/Debian)
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if you use non-standard)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (for reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow any other required ports (e.g., Plex)
sudo ufw allow 32400/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 10. Implement Regular Backups

Create a backup script:

```bash
#!/bin/bash
# backup-docker.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup compose files
tar -czf "${BACKUP_DIR}/compose_${DATE}.tar.gz" \
  /path/to/home_server_compose

# Backup Docker volumes (stop containers first for consistency)
docker-compose down
tar -czf "${BACKUP_DIR}/volumes_${DATE}.tar.gz" \
  /var/lib/docker/volumes
docker-compose up -d

# Backup configuration directories
tar -czf "${BACKUP_DIR}/config_${DATE}.tar.gz" \
  ${CONFIG_DIR}

# Keep only last 30 days of backups
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: ${DATE}"
```

Add to crontab:
```bash
crontab -e
# Add: Daily backup at 2 AM
0 2 * * * /path/to/backup-docker.sh >> /var/log/docker-backup.log 2>&1
```

## Long-term Security Practices

### 11. Regular Security Scanning

Add to your maintenance routine:

```bash
# Scan all running containers
docker ps --format "{{.Image}}" | sort -u | xargs -I {} docker run --rm aquasec/trivy image {}

# Scan specific image
docker run --rm aquasec/trivy image linuxserver/sonarr:latest

# Host vulnerability scan
sudo lynis audit system
```

### 12. Enable Automatic Security Updates on Host

```bash
# Ubuntu/Debian
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Configure to only install security updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

### 13. Set Up Monitoring Alerts

Configure Prometheus/Grafana alerts for:
- High CPU/Memory usage (possible cryptomining)
- Unusual network traffic
- Failed authentication attempts
- Container restarts
- Disk space warnings

### 14. Review Access Logs

Schedule regular reviews:

```bash
# Check Docker logs for suspicious activity
docker logs --since 24h watchtower | grep -i error
docker logs --since 24h portainer | grep -i failed

# Check auth logs on host
sudo journalctl -u ssh --since today | grep -i failed
```

### 15. Credential Rotation Schedule

Create a reminder system:

| Credential | Rotation Frequency | Next Due |
|-----------|-------------------|----------|
| Grafana Admin | 90 days | ___ |
| Database Passwords | 90 days | ___ |
| VPN Credentials | As needed | ___ |
| API Keys | 180 days | ___ |
| SSH Keys | Annually | ___ |

## Quick Security Audit Checklist

Run through this checklist monthly:

```bash
# 1. Check for security updates
docker images | grep -v REPOSITORY | awk '{print $1":"$2}' | xargs -L1 docker pull

# 2. Review running containers
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# 3. Check for stopped/failed containers
docker ps -a --filter "status=exited"

# 4. Review disk usage
docker system df

# 5. Check for unused resources
docker system prune -a --dry-run

# 6. Review network configuration
docker network ls
docker network inspect bridge

# 7. Check for privilege escalation
docker ps --quiet | xargs docker inspect --format='{{ .Name }}: {{ .HostConfig.Privileged }}'

# 8. List containers with Docker socket access
docker ps --quiet | xargs docker inspect --format='{{ .Name }}: {{ .Mounts }}' | grep docker.sock

# 9. Review exposed ports
docker ps --format "table {{.Names}}\t{{.Ports}}"

# 10. Check log sizes
docker ps --quiet | xargs docker inspect --format='{{ .Name }}: {{ .LogPath }}' | xargs -I {} ls -lh {}
```

## Emergency Procedures

### If You Detect a Security Breach:

1. **Immediate Response**
   ```bash
   # Stop all containers
   docker-compose down
   
   # Disconnect from network (if compromised from outside)
   sudo ifconfig eth0 down  # Or your network interface
   ```

2. **Investigation**
   ```bash
   # Save logs before cleaning up
   docker-compose logs > incident_logs_$(date +%Y%m%d).txt
   
   # Check what changed in containers
   docker diff <container_name>
   
   # Review recent commands
   history
   ```

3. **Recovery**
   ```bash
   # Pull fresh images
   docker-compose pull
   
   # Restore from backup
   # (Your backup restoration process)
   
   # Rotate all credentials
   # (Update all passwords, API keys, etc.)
   
   # Start with clean slate
   docker-compose up -d
   ```

## Testing Your Security

### 1. Port Scan from External Network
```bash
# From another machine on your network
nmap -Pn -p- your.server.ip
```

Should only show ports you intentionally exposed (typically 80, 443, and maybe 22).

### 2. Check TLS Configuration
```bash
# Test your HTTPS configuration
curl -I https://your.domain.com
sslscan your.domain.com
```

### 3. Attempt Privilege Escalation (Safe Test)
```bash
# This should fail with "operation not permitted"
docker exec some-container su -
docker exec some-container sudo su
```

### 4. Verify File Permissions
```bash
# .env should be 600 (only owner can read/write)
ls -la .env

# Should show: -rw------- or similar
```

## Resources and References

- [SECURITY.md](./SECURITY.md) - Comprehensive security documentation
- [.env.example](./.env.example) - Environment variable template
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)

## Getting Help

If you're unsure about any security configuration:

1. **Don't guess** - Research or ask for help
2. **Test in isolation** - Use a test environment first
3. **Document changes** - Keep track of what you modify
4. **Have backups** - Always have a way to roll back

## Conclusion

Security is iterative. Start with immediate actions, then work through medium and long-term improvements. Regular maintenance and monitoring are key to maintaining a secure home server.

**Most Important:** Keep your system updated, use strong unique passwords, and minimize exposed services.
