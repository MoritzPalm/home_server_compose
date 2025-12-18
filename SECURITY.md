# Security Best Practices for Docker Home Server

This document outlines security best practices for running Docker containers on a home server. Following these guidelines will help protect your infrastructure, data, and network from potential threats.

## Table of Contents

- [General Security Principles](#general-security-principles)
- [Container Security](#container-security)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Access Control](#access-control)
- [Monitoring and Logging](#monitoring-and-logging)
- [Updates and Maintenance](#updates-and-maintenance)
- [Secrets Management](#secrets-management)
- [Security Checklist](#security-checklist)

## General Security Principles

### Defense in Depth
Implement multiple layers of security controls. If one layer is compromised, others provide protection:
- Network segmentation
- Container isolation
- Application-level security
- Access controls
- Monitoring and alerting

### Principle of Least Privilege
Grant only the minimum permissions necessary for each container and user:
- Use non-root users inside containers
- Limit container capabilities
- Restrict network access
- Use read-only filesystems where possible

## Container Security

### 1. Use Minimal Base Images
- Prefer official images from trusted sources
- Use Alpine or distroless images when possible
- Regularly scan images for vulnerabilities

### 2. Run as Non-Root User
Always specify a non-root user (PUID/PGID) for containers:

```yaml
environment:
  - PUID=1000
  - PGID=1000
```

### 3. Security Options
Apply security hardening options to all containers:

```yaml
security_opt:
  - no-new-privileges:true  # Prevents privilege escalation
read_only: true             # Read-only root filesystem (when possible)
```

**Current Implementation**: Several services already use `no-new-privileges:true` (prowlarr, sonarr, radarr, lidarr, gluetun, overseerr, paperless).

**Action Required**: Add these options to services that don't have them yet.

### 4. Limit Container Capabilities
Drop unnecessary capabilities and only add required ones:

```yaml
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE  # Only if needed
```

**Note**: Some containers like `gluetun` require `NET_ADMIN` for VPN functionality - this is acceptable but should be documented.

### 5. Resource Limits
Prevent resource exhaustion attacks by setting limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Current Implementation**: Only `soulsync` service has resource limits.

**Action Required**: Add resource limits to all services based on their typical usage.

### 6. Avoid Privileged Mode
**Never** use `privileged: true` unless absolutely necessary.

**Current Issue**: `smartctl-exporter` uses privileged mode. Consider alternatives:
- Use specific device bindings instead
- Run on host with monitoring agent
- Use capability bindings: `cap_add: [SYS_ADMIN, SYS_RAWIO]` with device access

### 7. Docker Socket Access
Mounting the Docker socket (`/var/run/docker.sock`) gives **full control** over the host.

**Current Usage**:
- `portainer` - Management interface (acceptable with strong authentication)
- `homepage` - Dashboard (read-only recommended)
- `watchtower` - Auto-updates (acceptable but risky)

**Best Practices**:
- Use read-only mounts when possible: `/var/run/docker.sock:/var/run/docker.sock:ro`
- Restrict access with strong authentication
- Consider using Docker socket proxies (e.g., tecnativa/docker-socket-proxy)
- Monitor socket access in logs

### 8. Health Checks
Implement health checks for all services to detect compromised containers:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Network Security

### 1. Network Segmentation
Use Docker networks to isolate services:

**Current Implementation**:
- `arr` network for media management services
- `media_network` for media streaming
- `monitoring` network for monitoring stack
- `paperless` network for document management
- `internal` and `external` networks for homepage/immich

**Best Practice**: This is well implemented. Continue isolating services by function.

### 2. Minimize Port Exposure
Only expose necessary ports and bind to localhost when possible:

```yaml
ports:
  - "127.0.0.1:8080:8080"  # Only accessible from localhost
  - "8080:8080"             # Accessible from network (avoid if possible)
```

**Current Issue**: Many ports are exposed to the network without localhost binding.

**Recommendation**: 
- Use a reverse proxy (Traefik is already configured) for all web services
- Only expose reverse proxy ports (80/443) to the network
- Bind service ports to localhost or don't expose them at all
- Use internal networks for inter-container communication

### 3. VPN for Sensitive Traffic
Use VPN tunnels for traffic that shouldn't be visible to your ISP:

**Current Implementation**: 
- Gluetun VPN killswitch for torrenting services (excellent!)
- Services run through VPN: prowlarr, qbittorrent, slskd, mamapi

**Best Practice**: This is well implemented for P2P traffic.

### 4. Firewall Configuration
Configure host firewall rules:

```bash
# Allow only necessary incoming connections
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH (consider changing port)
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable
```

### 5. Reverse Proxy with TLS
Use a reverse proxy with valid TLS certificates:

**Current Implementation**: Traefik is used with Cloudflare cert resolver (excellent!)

**Best Practices**:
- Always use HTTPS for external access
- Implement HTTP to HTTPS redirect
- Use strong TLS cipher suites
- Enable HSTS headers
- Consider mutual TLS for sensitive services

## Data Protection

### 1. Volume Security
Protect sensitive data in volumes:

```yaml
volumes:
  - ${CONFIG_DIR}/service:/config:ro  # Read-only when possible
  - database_data:/var/lib/data       # Named volumes for databases
```

**Best Practices**:
- Use named volumes for databases
- Set proper file permissions on bind mounts (chmod 600 for secrets)
- Regularly backup volumes
- Encrypt sensitive volumes at rest

### 2. Backups
Implement regular backup strategy:

**Recommendations**:
- Automated daily backups of configurations
- Weekly backups of media metadata/databases
- Store backups off-site (encrypted)
- Test restore procedures regularly
- Use backup tools like `duplicati` or `restic`

### 3. Secrets Management
Never commit secrets to version control:

**Current Issues**:
- Hardcoded Grafana admin password in `monitoring.yml`
- Hardcoded Plex claim token in `media.yml`

**Best Practices**:
- Use environment variables from `.env` files
- Add `.env` to `.gitignore`
- Use Docker secrets for sensitive data
- Rotate credentials regularly
- Use password managers for credential storage

## Access Control

### 1. Authentication
Implement strong authentication for all services:

**Recommendations**:
- Use strong, unique passwords (20+ characters)
- Enable 2FA/MFA where available
- Consider SSO (e.g., Authelia, Authentik) for centralized authentication
- Disable default accounts
- Implement account lockout policies

### 2. Authorization
Implement role-based access control:

**Current Implementation**: Portainer has admin password file (good!)

**Recommendations**:
- Create separate accounts for different users
- Grant minimum necessary permissions
- Regularly review access rights
- Implement API key rotation for service-to-service communication

### 3. SSH Security
Secure SSH access to the host:

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers your_user
```

Consider:
- Use SSH keys instead of passwords
- Change default SSH port
- Implement fail2ban for brute force protection
- Use SSH certificates for better key management

## Monitoring and Logging

### 1. Container Logging
Configure proper logging for all containers:

**Current Implementation**: Prometheus, Grafana, and exporters are set up (excellent!)

**Best Practices**:
- Centralize logs (e.g., ELK stack, Loki)
- Set log rotation policies
- Monitor logs for suspicious activity
- Alert on security events

### 2. Security Monitoring
Implement security-specific monitoring:

**Recommendations**:
- Monitor failed authentication attempts
- Track Docker API calls
- Alert on privilege escalation attempts
- Monitor network traffic patterns
- Track container resource usage
- Use tools like Falco for runtime security

### 3. Vulnerability Scanning
Regularly scan for vulnerabilities:

**Tools**:
- `docker scan` or `trivy` for image scanning
- `grype` for vulnerability detection
- OWASP Dependency-Check for dependencies
- Host vulnerability scanning with tools like `Lynis`

**Process**:
```bash
# Scan a Docker image
trivy image linuxserver/sonarr:latest

# Scan running containers
docker ps -q | xargs -I {} docker inspect {} | jq -r '.[].Config.Image' | xargs -I {} trivy image {}
```

## Updates and Maintenance

### 1. Container Updates
Keep containers up to date:

**Current Implementation**: Watchtower is configured for automatic updates (convenient but risky)

**Recommendations**:
- **Option A** (Current - Automatic): Keep Watchtower but:
  - Enable notifications for updates
  - Exclude critical services from auto-update
  - Use `WATCHTOWER_LABEL_ENABLE=true` for opt-in updates only
  
- **Option B** (Recommended - Manual): 
  - Disable automatic updates
  - Review changelogs before updating
  - Test updates in staging environment
  - Implement manual update schedule (weekly/monthly)

### 2. Host System Updates
Keep the host OS updated:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

### 3. Update Strategy
Implement a structured update process:

1. **Monitor** - Subscribe to security advisories
2. **Test** - Test updates in isolated environment
3. **Backup** - Always backup before updates
4. **Update** - Apply updates during maintenance window
5. **Verify** - Confirm services work after update
6. **Rollback Plan** - Be prepared to revert if needed

## Secrets Management

### 1. Environment Variables
Use `.env` files for configuration:

**Create `.env.example`**:
```bash
# VPN Configuration
OPENVPN_USERNAME=your_username_here
OPENVPN_PASSWORD=your_password_here

# Database Passwords
DB_PASSWORD=change_me
DB_USERNAME=change_me

# API Keys
MAM_SESSION_ID=your_session_id
DISCORD_TOKEN=your_discord_token
DISCORD_WEBHOOKID=your_webhook_id

# Paths
CONFIG_DIR=/path/to/config
STORAGE_DIR=/path/to/storage
MEDIA_PATH=/path/to/media
```

### 2. Docker Secrets
For production deployments, use Docker Swarm secrets:

```yaml
secrets:
  db_password:
    file: ./db_password.txt
    
services:
  db:
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
```

**Current Implementation**: Portainer uses secrets file for admin password (good!)

### 3. Secrets Rotation
Regularly rotate sensitive credentials:

- Database passwords: Every 90 days
- API keys: Every 180 days
- VPN credentials: As required by provider
- TLS certificates: Auto-renewed (Let's Encrypt)

## Security Checklist

Use this checklist when deploying new services or reviewing existing ones:

### Pre-Deployment
- [ ] Review image source (official/trusted)
- [ ] Scan image for vulnerabilities
- [ ] Check for available security updates
- [ ] Review default credentials
- [ ] Plan network segmentation

### Container Configuration
- [ ] Run as non-root user (PUID/PGID)
- [ ] Apply `no-new-privileges:true`
- [ ] Set read-only root filesystem (if applicable)
- [ ] Drop unnecessary capabilities
- [ ] Set resource limits (CPU/memory)
- [ ] Implement health checks
- [ ] Configure restart policy

### Network Configuration
- [ ] Use appropriate Docker networks
- [ ] Minimize port exposure
- [ ] Bind to localhost where possible
- [ ] Configure reverse proxy
- [ ] Enable TLS/HTTPS
- [ ] Review firewall rules

### Data Protection
- [ ] Use environment variables for secrets
- [ ] Never commit secrets to git
- [ ] Set proper volume permissions
- [ ] Plan backup strategy
- [ ] Encrypt sensitive data at rest

### Access Control
- [ ] Change default passwords
- [ ] Enable 2FA/MFA where available
- [ ] Implement least privilege
- [ ] Review user permissions
- [ ] Configure SSH security

### Monitoring
- [ ] Configure logging
- [ ] Set up alerts
- [ ] Enable security monitoring
- [ ] Plan vulnerability scanning
- [ ] Review logs regularly

### Maintenance
- [ ] Document update schedule
- [ ] Test backup/restore
- [ ] Review security advisories
- [ ] Audit access logs
- [ ] Review and update configurations

## Additional Resources

### Security Tools
- **Container Security**: Docker Bench Security, Anchore, Clair
- **Network Security**: Wireshark, tcpdump, nmap
- **Vulnerability Scanning**: Trivy, Grype, Clair
- **Security Monitoring**: Falco, Sysdig, Wazuh
- **Secrets Management**: HashiCorp Vault, Bitwarden

### Documentation
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [NSA/CISA Kubernetes Hardening Guide](https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF)

### Security Advisories
- Docker Security Advisories: https://docs.docker.com/engine/security/
- CVE Database: https://cve.mitre.org/
- GitHub Security Advisories: https://github.com/advisories
- NVD Database: https://nvd.nist.gov/

## Incident Response

### If a Container is Compromised

1. **Isolate**: Stop the container immediately
   ```bash
   docker stop <container_name>
   ```

2. **Investigate**: Examine logs and container state
   ```bash
   docker logs <container_name>
   docker inspect <container_name>
   docker diff <container_name>
   ```

3. **Preserve Evidence**: Create a snapshot
   ```bash
   docker commit <container_name> compromised_evidence:$(date +%Y%m%d)
   ```

4. **Analyze**: Review logs, network connections, file changes
   ```bash
   docker exec <container_name> ps aux
   docker exec <container_name> netstat -tulpn
   ```

5. **Remediate**: 
   - Update to latest image
   - Review and fix configuration
   - Rotate all credentials
   - Scan for malware
   - Deploy clean container

6. **Review**: 
   - Document the incident
   - Update security controls
   - Review similar containers
   - Implement additional monitoring

### Emergency Contacts
- Docker Security Team: security@docker.com
- Hosting Provider Security Team: [Your provider]
- Incident Response Team: [Your team/contact]

## Conclusion

Security is an ongoing process, not a one-time configuration. Regularly review and update your security posture, stay informed about new threats and vulnerabilities, and maintain a proactive approach to protecting your home server infrastructure.

Remember: **Defense in depth, principle of least privilege, and regular monitoring are your best defenses.**
