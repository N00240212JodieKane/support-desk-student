# Week 6: a production-style image for the API — see "API containerization"
# in PLAN.md's Key decisions for why this is the first Dockerfile in the
# project. `npm run dev` on the host stays how you iterate day to day; this
# is "what running it for real looks like", built once and reused by both
# the `api` and `worker` services in docker-compose.yml (they run the same
# image, just with a different command — see that file).

# ---- deps: install every dependency, including devDependencies ----------
# `prisma generate` (package.json's postinstall) needs the `prisma` CLI —
# a devDependency — plus prisma/schema.prisma to generate against. This
# stage exists purely to produce a node_modules with the generated Prisma
# client in it; nothing in it ends up in the final image directly.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- production: the image actually shipped ------------------------------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Takes the whole node_modules built above (devDependencies included) and
# then prunes them out — this keeps @prisma/client and the query engine
# `prisma generate` already produced (npm prune only removes packages
# listed in package.json's devDependencies, not generated files sitting
# inside a dependency that stays), while ending up with the same
# dev-dependency-free node_modules a plain `npm ci --omit=dev` would give,
# without re-running (and needing the `prisma` CLI for) postinstall here.
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY prisma ./prisma
COPY src ./src

# The official node image already ships a non-root `node` user — no need to
# create one. Never run the app as root in a container: a bug or dependency
# vulnerability that lets an attacker execute code should not hand them
# root inside the container as a bonus.
USER node

EXPOSE 3000

# The `api` service in docker-compose.yml runs this image as-is; the
# `worker` service overrides `command` to run src/worker.js instead — same
# image, same node_modules, different entry point.
CMD ["node", "src/server.js"]
