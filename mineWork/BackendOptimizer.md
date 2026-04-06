# Byte-Chat Backend Performance Playbook

## Performance Targets
  - API p95 latency for message fetch: under 150 ms
  - API p95 latency for send message: under 120 ms
  - Socket fan-out delay (server side): under 50 ms
  - Redis command p95: under 5 ms
  - Database query p95 for hot queries: under 30 ms

## Where Your Current Hot Paths Are
- Regular message fetch/send:
  - `backend/src/controllers/chat.controller.ts`
  - `backend/src/routes/chat.routes.ts`
  - `frontend/src/app/chat/[conversationId]/page.tsx`
  - `frontend/src/services/chat.service.ts`
- Group message fetch/send:
  - `backend/src/controllers/group.controller.ts`
  - `backend/src/routes/group.routes.ts`
  - `frontend/src/services/group.service.ts`
- Anonymous message fetch/send:
  - `backend/src/controllers/anonymous-chat.controller.ts`
  - `frontend/src/services/anonymous-chat.service.ts`
- Socket delivery/presence/typing:
  - `backend/src/socket/index.ts`
  - `backend/src/services/room.service.ts`
  - `backend/src/services/socketRouting.service.ts`
  - `backend/src/services/presence.service.ts`
- Redis messaging helpers:
  - `backend/src/services/messageCache.service.ts`
  - `backend/src/services/offlineMessage.service.ts`
  - `backend/src/services/notification.service.ts`
  - `backend/src/services/unread.service.ts`

1. Replace room-wide scan on disconnect.
   - Current issue in `backend/src/services/room.service.ts`: scanning all `room:*` keys on disconnect is O(total rooms).
   - Use reverse mapping `socket_rooms:{socketId}` to remove only relevant rooms.

3. Pipeline Redis command groups.
   - Use `multi` for `lpush+ltrim+expire`, `incr+expire`, and similar patterns.
   - Apply in message cache, offline queue, notifications, and custom rate limiter services.

### Phase 1 (1-2 days)
- Implement frontend infinite scroll pagination for regular + anonymous + group chat.
- Add/verify message indexes.
- Add response fields `hasMore` and `nextCursor`.

### Phase 2 (1-2 days)
- Refactor socket room removal to reverse index model.
- Simplify typing event broadcast path.
- Pipeline Redis helper operations.

### Phase 3 (1 day)
- Media optimization pass:
  - confirm CDN-backed URLs,
  - tune image variants,
  - add lazy placeholder behavior,
  - ensure Next remote image config is correct.

## Validation Checklist
- Measure before/after with same dataset:
  - chat open latency,
  - message send ack time,
  - image first-load time,
  - socket event processing time.
- Confirm no regression in:
  - E2EE decrypt flow,
  - read receipts,
  - message reactions,
  - offline delivery.

## Quick Instrumentation to Add
- API request timing middleware with route-level p50/p95/p99.
- Redis command duration tracking for hot commands.
- DB slow query log threshold (for example, 50 ms).
- Socket event counters and average handler duration.
