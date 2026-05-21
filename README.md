# Task Manager DevOps Pipeline (SIT223/SIT753 — 7.3HD)

A RESTful Task Manager API with a full seven-stage Jenkins CI/CD pipeline,
deployed to a DigitalOcean droplet via EasyPanel with MongoDB persistence.

The application started life as a vanilla JavaScript To-Do app. The original
pure functions (`addTask`, `deleteTask`, `toggleTask`, `countTasks`) are kept
intact in `src/lib/taskLogic.js` and remain the tested core of the domain logic.

## What it does

- REST API for tasks (create, list, toggle, delete) built with Express
- JWT authentication protecting the task endpoints
- MongoDB persistence via Mongoose (in-memory fallback for tests)
- `/health` endpoint for container and uptime checks
- `/metrics` endpoint exposing Prometheus-compatible data
- The original To-Do UI, now driving the API instead of in-memory state

## Tech stack

| Concern          | Tool                              |
|------------------|-----------------------------------|
| Runtime          | Node.js 20                        |
| Web framework    | Express 4                         |
| Database         | MongoDB via Mongoose              |
| Auth             | JSON Web Tokens (jsonwebtoken)    |
| Unit testing     | Jest 29                           |
| Integration test | Supertest 6                       |
| Code quality     | ESLint + SonarCloud               |
| Security         | npm audit + Snyk                  |
| Containerisation | Docker + Docker Compose           |
| Hosting          | EasyPanel on DigitalOcean         |
| Release          | Docker registry + GitHub Releases |
| Monitoring       | Prometheus + Grafana              |
| CI/CD            | Jenkins (declarative pipeline)    |

## Store factory (why tests need no database)

`src/store/index.js` chooses the persistence layer at runtime:

- `NODE_ENV=test` or no `MONGODB_URI` -> in-memory store (uses the pure functions)
- `MONGODB_URI` present -> MongoDB via Mongoose

This keeps the 19 tests fast and database-free in CI, while the deployed app
uses MongoDB. The route handlers are identical in both cases.

## Run locally

```bash
npm install
npm test                          # 19 tests, ~95% coverage, no DB needed
npm run lint

# Full stack with MongoDB:
docker compose up -d --build      # http://localhost:3000
```

Demo login (used automatically by the UI): `demo` / `demo123`.

## Run the monitoring stack locally

```bash
docker compose -f docker-compose.monitoring.yml up -d --build
```

- App: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin / admin)

## Deployment (EasyPanel + Jenkins in control)

1. In EasyPanel, create a MongoDB database (one click) and copy its connection
   string, or use a MongoDB Atlas cluster.
2. Create two App Services from the Docker image (registry), e.g. one for
   staging and one for production. Set `MONGODB_URI` and `JWT_SECRET` in each
   service's Environment tab.
3. Each EasyPanel app service has a "deploy URL" that triggers a redeploy when
   called. Copy the staging and production deploy URLs.
4. Add them to Jenkins as secret-text credentials `easypanel-staging-url` and
   `easypanel-prod-url`.

The pipeline then builds and pushes the image to the registry and calls the
EasyPanel deploy URL, so Jenkins (not GitHub) drives every deployment.

## The seven pipeline stages

1. **Build** — `npm ci` then `docker build`, producing a tagged Docker image.
2. **Test** — Jest unit tests on the pure functions plus Supertest integration
   tests, including auth gating (401 vs 200) and coverage thresholds that fail
   the build if not met.
3. **Code Quality** — ESLint plus SonarCloud with a configured quality gate
   (`sonar-project.properties` sets sources, tests, exclusions, lcov path).
4. **Security** — `npm audit --audit-level=high` and Snyk dependency scanning;
   findings are interpreted and documented in the report.
5. **Deploy** — pushes the `:staging` image and triggers the EasyPanel staging
   deploy URL, then gates on the staging `/health` check.
6. **Release** — on `main`, tags a versioned image, pushes it, triggers the
   EasyPanel production deploy URL, gates on production health, and creates a
   GitHub Release.
7. **Monitoring** — Prometheus scrapes `/metrics`; Grafana dashboards;
   `monitoring/alert.rules.yml` defines alerts (API down, high error rate,
   high latency).

## Jenkins setup (summary)

1. Install Jenkins with the Docker, NodeJS, and Pipeline plugins.
2. Add credentials: `dockerhub`, `easypanel-staging-url`, `easypanel-prod-url`,
   `sonar-token`, `snyk-token`, `github-token`.
3. Create a Pipeline job pointing at this repo's `Jenkinsfile`.
4. Enable Poll SCM or a webhook so commits trigger the pipeline.

## Note for the remote monitoring case

`monitoring/prometheus.yml` targets `app:3000` for the all-local stack. When
Prometheus runs separately from the deployed app, change the target to your
EasyPanel app domain (the app exposes `/metrics` publicly).
