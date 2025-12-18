# Home Server Docker Compose

A comprehensive Docker Compose setup for a home server running various media management, monitoring, and utility services.

## 🏗️ Services Overview

### Media Management (arr/)
- **Prowlarr** - Indexer manager/proxy
- **Sonarr** - TV show management
- **Radarr** - Movie management
- **Lidarr** - Music management
- **Bazarr** - Subtitle management
- **Whisparr** - Adult content management
- **Overseerr** - Request management
- **qBittorrent** - Torrent client (running through VPN)
- **Gluetun** - VPN killswitch for torrenting
- **Flaresolverr** - Cloudflare bypass
- **Profilarr** - Profile management
- **MAM API** - MyAnonamouse integration
- **slskd** - Soulseek client

### Media Streaming (media/)
- **Plex** - Media server

### Music (music/)
- **Soulsync** - Music synchronization service

### Document Management (paperless/)
- **Paperless-NGX** - Document management system
- **PostgreSQL** - Database for Paperless
- **Redis** - Cache for Paperless
- **Gotenberg** - Document conversion
- **Tika** - Text extraction

### Monitoring (monitoring/)
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Node Exporter** - Host metrics
- **cAdvisor** - Container metrics
- **Alertmanager** - Alert management
- **Smartctl Exporter** - Disk health metrics
- **Watchtower** - Automatic container updates

### Photos (immich/)
- **Immich** - Photo and video management
- **PostgreSQL** - Database for Immich
- **Redis** - Cache for Immich
- **Machine Learning** - AI features

### Dashboard (homepage/)
- **Homepage** - Unified dashboard

### Recipes (kitchen/)
- **Tandoor** - Recipe management
- **PostgreSQL** - Database
- **Nginx** - Web server

### Management (portainer/)
- **Portainer** - Docker container management

## 🔒 Security

**IMPORTANT**: This setup includes security best practices for running Docker containers on a home server. Please review the security documentation before deploying.

### Security Documentation
- **[SECURITY.md](./SECURITY.md)** - Comprehensive security best practices guide
- **[SECURITY_HARDENING.md](./SECURITY_HARDENING.md)** - Quick start security hardening guide

### Key Security Features
- ✅ VPN killswitch for P2P traffic (Gluetun)
- ✅ Network segmentation with Docker networks
- ✅ `no-new-privileges` security option on all containers
- ✅ Non-root users for application containers
- ✅ Environment variables for sensitive data
- ✅ Read-only Docker socket where possible
- ✅ Health checks for all critical services
- ✅ Traefik reverse proxy with TLS

### Security Checklist
Before deploying, ensure you:
1. ✅ Copy `.env.example` to `.env` and fill in your values
2. ✅ Set strong, unique passwords for all services
3. ✅ Review and update the security options in compose files
4. ✅ Configure firewall rules on the host
5. ✅ Set up regular backups
6. ✅ Review the [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) guide

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+
- Sufficient storage for media and databases
- (Optional) VPN subscription for Gluetun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MoritzPalm/home_server_compose.git
   cd home_server_compose
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   chmod 600 .env
   nano .env  # Edit with your values
   ```

3. **Review security settings**
   ```bash
   # Read the security documentation
   cat SECURITY_HARDENING.md
   ```

4. **Create required directories**
   ```bash
   mkdir -p ${CONFIG_DIR}/{prowlarr,sonarr,radarr,lidarr,overseerr,qbittorrent,gluetun,bazarr,whisparr,slskd,profilarr}
   mkdir -p ${STORAGE_DIR}/{downloads,media/{tv,movies,music}}
   ```

5. **Start services**
   ```bash
   # Start all services
   docker-compose -f arr/arr.yml -f media/media.yml -f monitoring/monitoring.yml -f homepage/homepage.yml up -d
   
   # Or start individual stacks
   docker-compose -f arr/arr.yml up -d
   docker-compose -f monitoring/monitoring.yml up -d
   ```

6. **Verify deployment**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 📁 Directory Structure

```
home_server_compose/
├── arr/                    # Media management services
│   └── arr.yml
├── media/                  # Media streaming
│   └── media.yml
├── music/                  # Music services
│   └── music.yml
├── monitoring/             # Monitoring stack
│   └── monitoring.yml
├── paperless/              # Document management
│   └── paperless.yml
├── immich/                 # Photo management
│   └── immich.yml
├── homepage/               # Dashboard
│   └── homepage.yml
├── kitchen/                # Recipe management
│   └── kitchen.yml
├── portainer/              # Container management
│   └── portainer.yml
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── SECURITY.md             # Security best practices
├── SECURITY_HARDENING.md   # Security hardening guide
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Key environment variables to configure in `.env`:

```bash
# Storage Paths
CONFIG_DIR=/path/to/config
STORAGE_DIR=/path/to/storage
MEDIA_PATH=/path/to/media

# VPN Configuration
OPENVPN_USERNAME=your_vpn_username
OPENVPN_PASSWORD=your_vpn_password

# Database Credentials
DB_PASSWORD=strong_password
GRAFANA_ADMIN_PASSWORD=strong_password

# API Keys
PLEX_CLAIM_TOKEN=your_plex_claim
MAM_SESSION_ID=your_mam_session
```

See `.env.example` for complete list.

### Network Configuration

The setup uses multiple Docker networks for isolation:
- `arr` - Media management services
- `media_network` - Media streaming
- `monitoring` - Monitoring stack
- `paperless` - Document management
- `internal` / `external` - General purpose

### Port Mapping

Default ports (can be customized in compose files):
- Grafana: 3000
- Prometheus: 9090
- Portainer: 9443
- Plex: 32401
- Sonarr: 8989
- Radarr: 7878
- Overseerr: 5055
- qBittorrent: 8088 (via VPN)

## 🛡️ Security Best Practices

### Critical Security Actions

1. **Never commit secrets to git**
   - All sensitive data should be in `.env` (which is gitignored)
   - Use environment variables or Docker secrets

2. **Use strong passwords**
   - Minimum 20 characters
   - Generated with password manager
   - Unique for each service

3. **Keep containers updated**
   - Watchtower is configured for auto-updates
   - Review updates before applying in production

4. **Limit network exposure**
   - Use reverse proxy for external access
   - Bind ports to localhost when possible
   - Configure firewall rules

5. **Regular backups**
   - Backup configuration directories
   - Backup Docker volumes
   - Test restore procedures

See [SECURITY.md](./SECURITY.md) for comprehensive security guidelines.

## 📊 Monitoring

Access monitoring services:
- **Grafana**: http://your-server:3000
- **Prometheus**: http://your-server:9090
- **cAdvisor**: http://your-server:8082

Default Grafana credentials (change in .env):
- Username: admin
- Password: (set via GRAFANA_ADMIN_PASSWORD in .env)

## 🔄 Updates

### Automatic Updates (Watchtower)
Watchtower is configured to automatically update containers. Review configuration in `monitoring/monitoring.yml`.

### Manual Updates
```bash
# Update specific service
docker-compose -f arr/arr.yml pull sonarr
docker-compose -f arr/arr.yml up -d sonarr

# Update all services in a stack
docker-compose -f arr/arr.yml pull
docker-compose -f arr/arr.yml up -d
```

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f <stack>/stack.yml logs <service>

# Check container status
docker-compose -f <stack>/stack.yml ps

# Restart service
docker-compose -f <stack>/stack.yml restart <service>
```

### VPN connection issues
```bash
# Check Gluetun logs
docker logs gluetun

# Test VPN connection
docker exec gluetun curl ifconfig.me
```

### Permission issues
```bash
# Fix ownership of config directories
sudo chown -R 1000:1000 ${CONFIG_DIR}
sudo chown -R 1000:1000 ${STORAGE_DIR}
```

### Health check failures
```bash
# Check health status
docker inspect <container> | jq '.[0].State.Health'

# Test health check manually
docker exec <container> curl -f http://localhost:port/health
```

## 📚 Additional Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Gluetun Wiki](https://github.com/qdm12/gluetun-wiki)

## 🤝 Contributing

If you have suggestions for improving the security or functionality of this setup:

1. Review the current security posture
2. Test changes in a development environment
3. Document your changes
4. Submit a pull request

## ⚠️ Disclaimer

This is a personal home server setup. Use at your own risk. Always:
- Review configurations before deploying
- Keep systems updated
- Implement proper backups
- Follow security best practices
- Ensure compliance with local laws regarding content

## 📝 License

This configuration is provided as-is for personal use. Refer to individual service licenses for their terms.

## 🙏 Acknowledgments

This setup uses various open-source projects:
- LinuxServer.io for containerized applications
- Gluetun for VPN functionality
- Traefik for reverse proxy
- Prometheus/Grafana for monitoring
- And many more amazing open-source tools!
