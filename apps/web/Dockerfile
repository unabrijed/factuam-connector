FROM node:20-alpine
WORKDIR /app
COPY package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN yarn install
COPY . .
CMD ["yarn", "workspace", "@prooflayer/web", "dev"]
