
**P1 High Priority Hardening**
1. Implement refresh-token rotation endpoint and full session renewal flow.  
Evidence: refresh token issuance in auth.controller.ts and auth.controller.ts, but no refresh route in auth.routes.ts.  
Change needed: add refresh endpoint, rotate token on use, revoke old session, detect reuse.

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
