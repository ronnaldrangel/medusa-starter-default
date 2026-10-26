FROM public.ecr.aws/docker/library/node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
RUN corepack enable

FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN yarn build

FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
# `medusa build` deja la app autocontenida en .medusa/server
COPY --from=build /app/.medusa/server ./
RUN npm install --omit=dev --no-audit --no-fund
EXPOSE 9000
CMD ["npm", "run", "start"]
