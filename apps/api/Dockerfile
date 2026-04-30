FROM node:20-alpine AS base
WORKDIR /app
COPY package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/proof-receipts/package.json packages/proof-receipts/package.json
COPY packages/og-storage/package.json packages/og-storage/package.json
COPY packages/og-compute/package.json packages/og-compute/package.json
COPY packages/og-chain/package.json packages/og-chain/package.json
COPY packages/openclaw-adapter/package.json packages/openclaw-adapter/package.json
RUN yarn install
COPY . .
CMD ["yarn", "workspace", "@prooflayer/api", "dev"]
