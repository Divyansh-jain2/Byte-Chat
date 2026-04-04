# Cache which we are using for now

**1. Session & Token Management**
- Session storage (user/session data): session.service.ts — **useful**
- Refresh token storage: session.service.ts — **useful**
- OTP & password reset tokens: authOtpCache.service.ts — **useful**
- Token validation cache: authCache.service.ts — **useful**
- Token blacklist: authCache.service.ts — **useful**
- User permission cache: authCache.service.ts — **kindoffine**

**2. User Profile & Block List**
- User profile cache: userProfileCache.service.ts — **useful**
- Blocked users list/set: blockCache.service.ts — **useful**
- Block pair status: blockCache.service.ts — **kindoffine**

**3. Messaging & Chat**
- Message page cache: messagePaginationCache.service.ts — **useful**
- Recent message cache: messageCache.service.ts — **useful**
- Message deduplication: messageDeliveryOptimization.service.ts — **useful**
- Offline message queue: offlineMessage.service.ts — **useful**
- Unread count cache: unread.service.ts — **useful**

**4. Notifications**
- Notification list: notification.service.ts — **useful**
- Notification count: notification.service.ts — **kindoffine**

**5. Presence, Typing, Socket Routing**
- Online users set: presence.service.ts — **useful**
- Typing indicator: typing.service.ts — **useful**
- Socket routing (userId <-> socketId): socketRouting.service.ts — **useful**
- WebSocket auth cache: wsAuth.service.ts — **useful**

**6. Polls**
- Live poll cache: pollCache.service.ts — **useful**

**7. Rate Limiting**
- Rate limiter: rateLimiter.ts — **useful**

**8. Other**
- Redis adapter for Socket.IO: socket/index.ts — **useful**
- General cache utils: cache.util.ts — **useful**
