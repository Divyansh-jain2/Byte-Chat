# Byte-Chat Backend Performance Playbook

This document provides a practical optimization plan for low-latency chat behavior in this repository.

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

---

## Your Requested Items: How, Where, and Why

## 1) Message Pagination

### What it means

Do not load entire message history at once. Load small batches (for example 30-50), then load older batches when the user scrolls up.

### Where to implement

- Backend already supports `limit` and `before` for:
  - `getMessages` in `backend/src/controllers/chat.controller.ts`
  - `getAnonymousMessages` in `backend/src/controllers/anonymous-chat.controller.ts`
- Implement same pagination contract for group messages if not already consistent:
  - `getGroupMessages` in `backend/src/controllers/group.controller.ts`
- Frontend integration points:
  - `frontend/src/app/chat/[conversationId]/page.tsx`
  - `frontend/src/services/chat.service.ts`
  - `frontend/src/services/anonymous-chat.service.ts`
  - Group chat page and `frontend/src/services/group.service.ts`

### How to implement

1. Standardize API contract:
   - Request query: `?limit=50&before=<ISO timestamp or message created_at>`
   - Response should include:
     - `messages`
     - `nextCursor` (timestamp/id of oldest message returned)
     - `hasMore`
2. Frontend state:
   - Keep `messages`, `hasMore`, `isFetchingMore`, `cursor`.
   - First load: fetch latest 50.
   - On top-scroll threshold: fetch older messages with `before=cursor` and prepend.
3. Prevent overfetch:
   - Debounce scroll-triggered fetches.
   - Ignore if `isFetchingMore` is true.
4. Add indexes for pagination:
   - `chat_messages(conversation_id, created_at DESC)`
   - `chat_messages(group_id, created_at DESC)`

### Why this reduces latency

- Smaller payload size means faster DB read, faster JSON serialization, and faster network transfer.
- Lower frontend render cost improves perceived chat smoothness.
- For large histories, this changes worst-case behavior from "load everything" to "load what is visible now".

### Typical latency gain

- For conversations with large history, first open time often improves by 40% to 80%.
- Time-to-first-message render can drop from seconds to sub-second on weak networks/devices.

---

## 2) Lazy Loading (Images and Media)

### What it means

Only download heavy media when it is near or inside the viewport, not immediately for all messages.

### Where to implement

- Message media rendering:
  - `frontend/src/components/MessageBubble.tsx`
- Conversation page list rendering:
  - `frontend/src/app/chat/[conversationId]/page.tsx`
  - Group chat page equivalent

### How to implement

1. Keep text message render immediate.
2. For image messages:
   - Continue using `next/image`.
   - Ensure lazy behavior is active for non-priority images.
   - Use reasonable display sizes and responsive `sizes`.
3. Add lightweight placeholder logic:
   - Render a low-cost placeholder box first.
   - Load full image when near viewport (IntersectionObserver or default browser lazy if sufficient).
4. For videos/files:
   - Do not autoplay in timeline.
   - Load metadata first and fetch full payload on click.
5. Optional but high value:
   - Virtualize message list for long chats (`react-window` or `react-virtualized`).

### Why this reduces latency

- Reduces initial bandwidth and decode work.
- Cuts main-thread blocking from image decoding/layout.
- Keeps scroll performance smooth in media-heavy chats.

### Typical latency/perf gain

- Initial page data transfer reduced significantly in media-heavy threads.
- Better FPS and reduced jank during fast scroll.
- Faster first meaningful paint for chat screen.

---

## 3) CDN Integration (Static and Media Delivery)

### What it means

Serve images/static assets from edge locations near users, not only from origin.

### Where to implement

- Chat media upload currently uses Cloudinary:
  - `backend/src/controllers/chat.controller.ts` (`uploadChatImage`)
  - `backend/src/controllers/group.controller.ts` (`uploadGroupChatImage`)
  - `backend/src/controllers/anonymous-chat.controller.ts` (upload path)
- Frontend rendering of returned `media_url`:
  - `frontend/src/components/MessageBubble.tsx`
- Next image remote host allowlist:
  - `frontend/next.config.ts`

### How to implement

1. Ensure all chat media URLs are CDN-backed URLs (Cloudinary secure URLs already are CDN-distributed).
2. Normalize upload transformations at upload time:
   - Generate optimized image variants (format auto, quality auto, width bounds).
3. Set aggressive caching headers for immutable assets.
4. If you host app static files separately, put static assets behind CDN as well.
5. In Next.js:
   - Allow remote CDN domain in `next.config.ts`.
   - Use `next/image` with correct `sizes` so browser downloads right size.

### Why this reduces latency

- Lower RTT from edge POPs reduces media fetch time.
- Cache hit from edge avoids origin trip.
- Smaller transformed assets reduce transfer and decode time.

### Typical latency gain

- 20% to 70% faster media load depending on user geography and cache hit rate.
- Major improvement for first image open in distant regions.

---

## Highest-Impact Backend Fixes (Next Steps)

1. Replace room-wide scan on disconnect.
   - Current issue in `backend/src/services/room.service.ts`: scanning all `room:*` keys on disconnect is O(total rooms).
   - Use reverse mapping `socket_rooms:{socketId}` to remove only relevant rooms.

2. Remove duplicate typing fan-out logic.
   - Current `typing` in `backend/src/socket/index.ts` emits to multiple room styles plus manual socket loop.
   - Keep one canonical emit target per chat type.

3. Pipeline Redis command groups.
   - Use `multi` for `lpush+ltrim+expire`, `incr+expire`, and similar patterns.
   - Apply in message cache, offline queue, notifications, and custom rate limiter services.

4. Avoid double rate-limiting overhead.
   - Rationalize global Express limiter in `backend/src/index.ts` and Redis limiter in `backend/src/middleware/rateLimiter.ts`.

5. Add/verify DB indexes for hot queries.
   - Start with message fetch and conversation list queries.

## Suggested Rollout Plan

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
