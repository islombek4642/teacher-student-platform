#!/bin/bash
# Teacher-Student Platform — Production Deployment Script
# Run on the Hetzner server: bash scripts/deploy.sh

set -e  # Exit on error

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo -e "${GREEN}=== Teacher-Student Platform Deployment ===${NC}"
echo "Project directory: $PROJECT_DIR"
echo ""

# Step 1: Pre-flight checks
echo -e "${YELLOW}[1/8] Pre-flight checks...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not installed. Installing...${NC}"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo -e "${YELLOW}Please log out and back in, then re-run this script.${NC}"
    exit 1
fi

# Step 2: Backup the database
echo -e "${YELLOW}[2/8] Creating backup...${NC}"
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p backups
if [[ -f .env ]]; then
    cp .env "backups/${BACKUP_NAME}.env"
fi

if sudo docker ps --format '{{.Names}}' | grep -q 'tsp_db'; then
    DB_USER_FOR_DUMP=$(grep -E '^DB_USER=' .env 2>/dev/null | cut -d '=' -f2)
    DB_NAME_FOR_DUMP=$(grep -E '^DB_NAME=' .env 2>/dev/null | cut -d '=' -f2)
    sudo docker exec tsp_db pg_dump -U "${DB_USER_FOR_DUMP:-app}" "${DB_NAME_FOR_DUMP:-teacher_student}" \
        | gzip > "backups/${BACKUP_NAME}.sql.gz" 2>/dev/null && \
    echo -e "${GREEN}DB backup created: backups/${BACKUP_NAME}.sql.gz${NC}" || \
    echo -e "${YELLOW}DB backup failed (maybe DB not ready yet)${NC}"

    # Keep only the 7 most recent backups
    ls -t backups/*.sql.gz 2>/dev/null | tail -n +8 | xargs -d '\n' rm -f 2>/dev/null || true
else
    echo -e "${YELLOW}DB backup skipped (container not running yet)${NC}"
fi

# Step 3: Pull latest code
echo -e "${YELLOW}[3/8] Pulling latest code...${NC}"
git stash
git pull origin master
git stash pop 2>/dev/null || true

# Step 4: Validate .env
echo -e "${YELLOW}[4/8] Checking .env configuration...${NC}"
if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
        cp .env.example .env
        echo -e "${RED}Created .env from .env.example — edit it now (DB_PASSWORD, "
        echo -e "SUPER_ADMIN_PASSWORD, API_DOMAIN, APP_DOMAIN, SSL_EMAIL), then re-run this script.${NC}"
        exit 1
    else
        echo -e "${RED}.env and .env.example not found! Cannot proceed.${NC}"
        exit 1
    fi
fi

# JWT_SECRET and CREDENTIALS_ENCRYPTION_KEY are internal-only secrets
# nobody ever needs to type or remember, so generate them automatically
# instead of asking for them. An existing .env from before these lines
# existed in .env.example won't have them at all, so append the
# placeholder first if the key is missing entirely — then the placeholder
# check below fills in a real value. CREDENTIALS_ENCRYPTION_KEY must never
# change once generated — doing so would make every already-stored
# teacher/student password permanently undecryptable, so this only ever
# replaces the placeholder, never an already-generated value.
if ! grep -qE '^JWT_SECRET=' .env; then
    echo 'JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_VALUE' >> .env
fi
if grep -qE '^JWT_SECRET=CHANGE_THIS' .env; then
    GENERATED_JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${GENERATED_JWT_SECRET}|" .env
    echo -e "${GREEN}Generated a random JWT_SECRET.${NC}"
fi

if ! grep -qE '^CREDENTIALS_ENCRYPTION_KEY=' .env; then
    echo 'CREDENTIALS_ENCRYPTION_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_VALUE' >> .env
fi
if grep -qE '^CREDENTIALS_ENCRYPTION_KEY=CHANGE_THIS' .env; then
    GENERATED_CREDENTIALS_KEY=$(openssl rand -hex 32)
    sed -i "s|^CREDENTIALS_ENCRYPTION_KEY=.*|CREDENTIALS_ENCRYPTION_KEY=${GENERATED_CREDENTIALS_KEY}|" .env
    echo -e "${GREEN}Generated a random CREDENTIALS_ENCRYPTION_KEY.${NC}"
fi

if grep -qE '^(DB_PASSWORD|SUPER_ADMIN_PASSWORD)=CHANGE_THIS' .env; then
    echo -e "${RED}.env still has placeholder secrets (CHANGE_THIS...). Edit .env and re-run.${NC}"
    exit 1
fi

if ! grep -qE '^API_DOMAIN=.+' .env || ! grep -qE '^APP_DOMAIN=.+' .env; then
    echo -e "${RED}API_DOMAIN / APP_DOMAIN are not set in .env. Edit .env and re-run.${NC}"
    exit 1
fi

echo -e "${GREEN}.env looks good.${NC}"

# Step 5: Ensure the shared proxy network exists
echo -e "${YELLOW}[5/8] Checking proxy_network...${NC}"
if ! sudo docker network inspect proxy_network &>/dev/null; then
    echo -e "${YELLOW}Creating proxy_network (required for the shared nginx-proxy)...${NC}"
    sudo docker network create proxy_network
else
    echo "proxy_network already exists."
fi

# Step 6: Rebuild containers
echo -e "${YELLOW}[6/8] Rebuilding Docker containers...${NC}"
sudo $COMPOSE down
sudo $COMPOSE up -d --build

echo "Waiting for containers to initialize..."
sleep 10
sudo $COMPOSE ps

# Step 7: Database migrations + seed
echo -e "${YELLOW}[7/8] Running database migrations...${NC}"
sudo $COMPOSE exec -T api npx prisma migrate deploy || echo -e "${RED}Migration failed! Check logs.${NC}"
sudo $COMPOSE exec -T api node dist/seed.js || echo -e "${RED}Seed failed! Check logs.${NC}"

# Step 8: Health check
echo -e "${YELLOW}[8/8] Running health checks...${NC}"

MAX_RETRIES=10
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(sudo $COMPOSE exec -T api curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" ]]; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 3
done

echo ""
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}API is healthy (Status: 200) after $RETRY_COUNT retries.${NC}"
else
    echo -e "${RED}API health check failed after $MAX_RETRIES attempts.${NC}"
fi

API_DOMAIN=$(grep -E '^API_DOMAIN=' .env | cut -d '=' -f2)
APP_DOMAIN=$(grep -E '^APP_DOMAIN=' .env | cut -d '=' -f2)

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "The shared nginx-proxy will automatically handle SSL and routing."
echo "Frontend: https://${APP_DOMAIN}"
echo "Backend:  https://${API_DOMAIN}/health"
echo ""
