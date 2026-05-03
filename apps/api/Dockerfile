# Build from repository root: docker build -f apps/api/Dockerfile .
# Kaggle connector invokes Python (kagglehub) from the API; install both runtimes.
# Mount a persistent volume on LOCAL_CONNECTOR_DIR (e.g. /var/lib/factuam/connector-data) in production.

FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY . .
RUN yarn install --frozen-lockfile
RUN python3 -m pip install --no-cache-dir -r connectors/requirements-connectors.txt --break-system-packages

RUN yarn workspace @factuam/api build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["yarn", "workspace", "@factuam/api", "start"]
