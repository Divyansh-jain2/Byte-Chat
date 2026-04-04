
**P0 Launch Blockers**
2. Close or protect internal/debug endpoints before release.  
Evidence: index.ts exposes redis test route, index.ts mounts test routes, test.routes.ts.  
Change needed: remove these routes in production or guard with admin auth + environment gate.

3. Add real admin authorization for moderation reports endpoint.  
Evidence: block-report.controller.ts, block-report.routes.ts.  
Change needed: enforce role-based middleware so only admins can access all reports.

4. Fix backend build failures now.  
Evidence from build: missing Prisma generated client import at prisma.ts, type issue in session assignment at auth.middleware.ts.  
Change needed: generate and commit/produce Prisma client correctly in build pipeline, and harden session typing/null checks.

5. Eliminate hardcoded localhost API URLs in frontend.  
Evidence: group.service.ts, anonymous.service.ts, message-management.service.ts, page.tsx.  
Change needed: centralize API base URL from environment and remove all hardcoded localhost references.

6. Stop storing access tokens in localStorage for production auth.  
Evidence: auth.service.ts, auth.service.ts, auth.service.ts.  
Change needed: move to httpOnly cookie-based auth flow (or minimize token lifetime and add stronger CSP if you keep localStorage temporarily).

**P1 High Priority Hardening**
1. Implement refresh-token rotation endpoint and full session renewal flow.  
Evidence: refresh token issuance in auth.controller.ts and auth.controller.ts, but no refresh route in auth.routes.ts.  
Change needed: add refresh endpoint, rotate token on use, revoke old session, detect reuse.

2. Standardize API URL config mismatches.  
Evidence: image service defaults to different port in image.service.ts.  
Change needed: one shared environment-driven API client module for all services.

3. Tighten socket CORS config consistency.  
Evidence: socket uses direct env variable at index.ts while HTTP CORS uses config in index.ts.  
Change needed: unify both to one validated origin config source.

4. Remove sensitive/local artifact files from repository and add ignore rules.  
Evidence: supabase_backup.dump.  
Change needed: remove dumps from git history where possible, update ignore rules, move backup handling to secure storage.

5. Fix frontend lint errors before production release gate.  
Evidence from lint run includes failures in MessageBubble.tsx, NotificationContext.tsx, useGroupPresence.ts, e2ee.utils.ts.  
Change needed: make lint/build part of CI blocking checks.

**P2 Platform/Operations Readiness**
1. Add CI/CD workflows and deployment artifacts.  
Evidence: no Dockerfiles and no workflow files found in repository scan.  
Change needed: add build/test/lint workflow and environment-specific deployment pipeline.

2. Add test scripts and automated test suites for backend/frontend critical paths.  
Evidence: no test scripts in package.json and package.json.  
Change needed: add unit/integration/e2e tests, especially auth, messaging, notifications, poll voting.

3. Improve production observability.  
Evidence: mostly console logging across API/controllers, for example index.ts.  
Change needed: structured logs, error tracking, metrics, and alerting (API errors, Redis failures, socket disconnect spikes).

4. Revisit cookie policy for multi-domain deployment.  
Evidence: strict same-site cookie on auth at auth.controller.ts.  
Change needed: confirm final domain topology and configure cookie policy accordingly.
