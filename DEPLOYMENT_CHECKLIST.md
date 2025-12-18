# Deployment Security Checklist

Use this checklist when deploying your home server for the first time or when adding new services.

## Pre-Deployment Checklist

### System Preparation
- [ ] Host operating system is up to date
- [ ] Docker Engine is installed (version 20.10+)
- [ ] Docker Compose is installed (v2.0+)
- [ ] Sufficient disk space available (check with `df -h`)
- [ ] Backup strategy planned and tested

### Network Planning
- [ ] Static IP assigned to server (or DHCP reservation)
- [ ] Router port forwarding configured (if needed)
- [ ] DNS records configured (if using domain names)
- [ ] Firewall rules planned

### Security Preparation
- [ ] Read [SECURITY.md](./SECURITY.md) completely
- [ ] Read [SECURITY_HARDENING.md](./SECURITY_HARDENING.md)
- [ ] Password manager ready for credential generation
- [ ] 2FA apps ready for services that support it
- [ ] VPN account active (for Gluetun)

## Configuration Checklist

### Environment Setup
- [ ] Copy `.env.example` to `.env`: `cp .env.example .env`
- [ ] Set restrictive permissions: `chmod 600 .env`
- [ ] Fill in all required environment variables in `.env`
- [ ] Generate strong passwords (20+ characters) for:
  - [ ] GRAFANA_ADMIN_PASSWORD
  - [ ] DB_PASSWORD (Immich)
  - [ ] All other database passwords in stack.env files
- [ ] Configure VPN credentials:
  - [ ] OPENVPN_USERNAME
  - [ ] OPENVPN_PASSWORD
- [ ] Set correct storage paths:
  - [ ] CONFIG_DIR
  - [ ] STORAGE_DIR
  - [ ] MEDIA_PATH
  - [ ] TORRENT_PATH
- [ ] Add API keys/tokens:
  - [ ] PLEX_CLAIM_TOKEN (get from https://www.plex.tv/claim/)
  - [ ] MAM_SESSION_ID (if using)
  - [ ] DISCORD_TOKEN and DISCORD_WEBHOOKID (for notifications)

### Directory Structure
- [ ] Create base directories:
  ```bash
  mkdir -p ${CONFIG_DIR}
  mkdir -p ${STORAGE_DIR}
  mkdir -p ${MEDIA_PATH}/{tv,movies,music}
  mkdir -p ${TORRENT_PATH}
  ```
- [ ] Set proper ownership (PUID/PGID 1000):
  ```bash
  sudo chown -R 1000:1000 ${CONFIG_DIR}
  sudo chown -R 1000:1000 ${STORAGE_DIR}
  sudo chown -R 1000:1000 ${MEDIA_PATH}
  ```
- [ ] Set secure permissions:
  ```bash
  chmod 755 ${CONFIG_DIR}
  chmod 755 ${STORAGE_DIR}
  ```

### Docker Networks
- [ ] Create external networks:
  ```bash
  docker network create media_network
  docker network create external
  docker network create internal
  ```

## Security Hardening Checklist

### Host Security
- [ ] Update system packages:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```
- [ ] Configure firewall (UFW):
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp   # SSH
  sudo ufw allow 80/tcp   # HTTP
  sudo ufw allow 443/tcp  # HTTPS
  sudo ufw enable
  ```
- [ ] Configure SSH security:
  - [ ] Disable root login
  - [ ] Use SSH keys only
  - [ ] Change default SSH port (optional but recommended)
  - [ ] Install fail2ban
- [ ] Enable automatic security updates:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure unattended-upgrades
  ```

### Docker Security
- [ ] Review all compose files for security options
- [ ] Verify `no-new-privileges:true` on all services
- [ ] Check that no unnecessary containers use `privileged: true`
- [ ] Verify Docker socket mounts are read-only where possible
- [ ] Review network configurations
- [ ] Verify health checks are configured

### Access Control
- [ ] Change all default passwords
- [ ] Document all passwords in password manager
- [ ] Enable 2FA on services that support it:
  - [ ] Portainer
  - [ ] Grafana (if exposing externally)
  - [ ] Any externally accessible services
- [ ] Create separate user accounts (not using admin)
- [ ] Review and restrict user permissions

## Deployment Checklist

### Service Deployment
Deploy services in order:

1. **Core Infrastructure**
   - [ ] Deploy Portainer (for management):
     ```bash
     docker-compose -f portainer/portainer.yml up -d
     ```
   - [ ] Verify Portainer is accessible
   - [ ] Change Portainer admin password immediately

2. **Monitoring Stack**
   - [ ] Deploy monitoring services:
     ```bash
     docker-compose -f monitoring/monitoring.yml up -d
     ```
   - [ ] Verify Prometheus is collecting metrics
   - [ ] Login to Grafana and change admin password
   - [ ] Import dashboards for monitoring

3. **Networking/VPN**
   - [ ] Deploy Gluetun VPN:
     ```bash
     docker-compose -f arr/arr.yml up -d gluetun
     ```
   - [ ] Verify VPN connection:
     ```bash
     docker exec gluetun curl ifconfig.me
     ```
   - [ ] Confirm IP is different from host IP

4. **Media Management**
   - [ ] Deploy arr services:
     ```bash
     docker-compose -f arr/arr.yml up -d
     ```
   - [ ] Configure each service (API keys, indexers, etc.)
   - [ ] Test connectivity between services

5. **Media Streaming**
   - [ ] Deploy Plex:
     ```bash
     docker-compose -f media/media.yml up -d
     ```
   - [ ] Complete Plex setup wizard
   - [ ] Add media libraries
   - [ ] Test playback

6. **Additional Services**
   - [ ] Deploy other services as needed:
     ```bash
     docker-compose -f immich/immich.yml up -d
     docker-compose -f paperless/paperless.yml up -d
     docker-compose -f homepage/homepage.yml up -d
     docker-compose -f kitchen/kitchen.yml up -d
     docker-compose -f music/music.yml up -d
     ```

### Post-Deployment Verification

#### Container Health
- [ ] Check all containers are running:
  ```bash
  docker ps -a
  ```
- [ ] Check container logs for errors:
  ```bash
  docker-compose logs
  ```
- [ ] Verify health checks are passing:
  ```bash
  docker ps --format "table {{.Names}}\t{{.Status}}"
  ```

#### Network Connectivity
- [ ] Verify internal network connectivity
- [ ] Test reverse proxy (Traefik) if configured
- [ ] Verify VPN is working for torrent services
- [ ] Check services are accessible via dashboard

#### Security Verification
- [ ] Run Docker security scan:
  ```bash
  docker run --rm aquasec/trivy image <image_name>
  ```
- [ ] Check for exposed ports:
  ```bash
  nmap -Pn -p- localhost
  ```
- [ ] Verify firewall rules:
  ```bash
  sudo ufw status verbose
  ```
- [ ] Check Docker socket permissions:
  ```bash
  ls -l /var/run/docker.sock
  ```
- [ ] Review container privileges:
  ```bash
  docker ps -q | xargs docker inspect --format='{{.Name}}: Privileged={{.HostConfig.Privileged}}'
  ```

## Ongoing Maintenance Checklist

### Daily Tasks
- [ ] Check Watchtower notifications for updates
- [ ] Review error logs in Grafana
- [ ] Check disk space usage

### Weekly Tasks
- [ ] Review container logs for anomalies
- [ ] Check for failed services
- [ ] Review monitoring alerts
- [ ] Update containers if needed

### Monthly Tasks
- [ ] Review security advisories
- [ ] Update host system packages
- [ ] Rotate credentials (if on schedule)
- [ ] Test backup restoration
- [ ] Review firewall logs
- [ ] Scan for vulnerabilities:
  ```bash
  docker images --format "{{.Repository}}:{{.Tag}}" | xargs -I {} trivy image {}
  ```
- [ ] Review and update documentation

### Quarterly Tasks
- [ ] Full security audit using this checklist
- [ ] Review and update access controls
- [ ] Test disaster recovery procedures
- [ ] Review and update monitoring dashboards
- [ ] Clean up unused Docker resources:
  ```bash
  docker system prune -a
  ```

## Backup Checklist

### Before Making Changes
- [ ] Backup current configuration:
  ```bash
  tar -czf backup_$(date +%Y%m%d).tar.gz ${CONFIG_DIR}
  ```
- [ ] Document current state
- [ ] Test backup can be restored

### Regular Backups
- [ ] Daily backup of configurations
- [ ] Weekly backup of databases
- [ ] Monthly full system backup
- [ ] Off-site backup copy (encrypted)
- [ ] Verify backup integrity monthly

### Backup Verification
- [ ] Test restore procedure
- [ ] Verify all files are included
- [ ] Check backup size is reasonable
- [ ] Ensure backups are encrypted (if off-site)

## Incident Response Checklist

### If Security Breach Suspected
1. **Immediate Actions**
   - [ ] Disconnect server from network if actively compromised
   - [ ] Stop all containers: `docker-compose down`
   - [ ] Save logs: `docker-compose logs > incident_logs_$(date +%Y%m%d).txt`

2. **Investigation**
   - [ ] Review container changes: `docker diff <container>`
   - [ ] Check system logs: `journalctl -xe`
   - [ ] Review access logs
   - [ ] Identify entry point

3. **Containment**
   - [ ] Isolate affected containers
   - [ ] Block malicious IPs in firewall
   - [ ] Disable compromised accounts

4. **Recovery**
   - [ ] Restore from clean backup
   - [ ] Pull fresh container images
   - [ ] Rotate all credentials
   - [ ] Apply security patches

5. **Post-Incident**
   - [ ] Document incident
   - [ ] Update security controls
   - [ ] Implement additional monitoring
   - [ ] Review and update procedures

## Troubleshooting Checklist

### Container Won't Start
- [ ] Check logs: `docker logs <container>`
- [ ] Verify environment variables in `.env`
- [ ] Check disk space: `df -h`
- [ ] Verify permissions on volumes
- [ ] Check for port conflicts: `netstat -tulpn`

### Network Issues
- [ ] Verify Docker networks exist: `docker network ls`
- [ ] Check container network settings: `docker network inspect <network>`
- [ ] Test connectivity: `docker exec <container> ping <other_container>`
- [ ] Check firewall rules

### VPN Issues
- [ ] Check Gluetun logs: `docker logs gluetun`
- [ ] Verify VPN credentials in `.env`
- [ ] Test external IP: `docker exec gluetun curl ifconfig.me`
- [ ] Check VPN provider status

### Permission Issues
- [ ] Verify PUID/PGID settings (should be 1000)
- [ ] Check file ownership: `ls -la ${CONFIG_DIR}`
- [ ] Fix permissions: `sudo chown -R 1000:1000 ${CONFIG_DIR}`

## Resources

- [SECURITY.md](./SECURITY.md) - Comprehensive security guide
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) - Quick hardening guide
- [README.md](./README.md) - General documentation
- `.env.example` - Environment variable template

## Notes

- This checklist should be reviewed and updated regularly
- Keep a record of when each task was last completed
- Document any deviations from standard procedures
- Store securely with other operational documentation

## Sign-off

Initial deployment completed by: _________________ Date: _________

Security review completed by: _________________ Date: _________

Last full audit: _________________ Next audit due: _________
