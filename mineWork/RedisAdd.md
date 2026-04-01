# Redis Usage in Byte-Chat

## Overview
This document explains how Redis is used in the Byte-Chat project, what features it powers in the backend, and how the frontend consumes these features.

---

## 1. Redis in the Backend

Redis is used as a fast, in-memory data store to support real-time features and caching. The backend uses Redis for:

### Session Management
- **Stores user sessions** (login state, metadata) for quick access and validation.
- Functions: `createSession`, `getSession`, `deleteSession`, `updateLastActivity` in `session.service.ts`.

### Notifications
- **Stores notifications** and **unread counts** for each user.
- Functions: `pushNotification`, `getNotifications`, `getNotificationCount`, `resetNotificationCount` in `notification.service.ts`.

### Message Caching
- **Caches recent messages** for each chat for fast retrieval.
- Functions: `cacheMessage`, `getCachedMessages` in `messageCache.service.ts`.

### Polls
- **Caches live poll data** and user votes.
- Functions: `initPollCache`, `votePoll`, `getLivePoll` in `pollCache.service.ts`.

### Unread Counts
- **Tracks unread message counts** per user per chat.
- Functions: `incrementUnread`, `resetUnread`, `getUnread` in `unread.service.ts`.

### Presence
- **Tracks online users** globally.
- Functions: `addOnlineUser`, `removeOnlineUser`, `isUserOnline`, `getOnlineUsersCount`, `getOnlineUsers` in `presence.service.ts`.

### Socket Routing
- **Maps user IDs to socket IDs** for real-time communication.
- Functions: `mapUserSocket`, `getUserSockets`, `getSocketUser`, `removeSocketMapping` in `socketRouting.service.ts`.

### Room Management
- **Manages chat/group room memberships**.
- Functions: `joinRoom`, `leaveRoom`, `getRoomSockets`, `removeSocketFromAllRooms` in `room.service.ts`.

### Typing Indicators
- **Tracks who is typing** in a chat.
- Functions: `setTyping`, `isTyping`, `getTypingUsers` in `typing.service.ts`.

### Offline Messages
- **Queues messages for offline users**.
- Functions: `queueOfflineMessage`, `getOfflineMessages` in `offlineMessage.service.ts`.

### WebSocket Auth
- **Stores temporary WebSocket authentication** for socket connections.
- Functions: `storeWsAuth`, `getWsAuth`, `deleteWsAuth` in `wsAuth.service.ts`.

---

## 2. Redis in the Frontend

- **No direct Redis usage in the frontend.**
- The frontend interacts with the backend via HTTP APIs and WebSocket (Socket.IO).
- All real-time and cached data is provided by the backend, which uses Redis internally.

### How the Frontend Consumes Redis-backed Features

- **Notifications:** Receives notification events from the backend and displays them in the UI.
- **Unread Counts:** Fetches unread counts from the backend and shows badges/indicators.
- **Typing Indicators:** Uses `sendTyping` in `SocketContext` to notify the backend, and listens for typing events to show indicators.
- **Presence:** Shows online/offline status using backend data.
- **Message Caching/Offline Messages:** Fetches recent/queued messages from the backend when a chat is opened.
- **Polls:** Uses group service to create, vote, and fetch poll results via backend APIs.

**Note:** The frontend should only consume these features via backend APIs/WebSocket events. No direct Redis logic is needed in the frontend.

---

## 3. Where to Implement/Consume in the Frontend

- Use the backend APIs and WebSocket events for all real-time and cached features.
- UI components should:
  - Listen for events (e.g., notifications, typing, presence) via `SocketContext`.
  - Fetch data (e.g., unread counts, polls, messages) via service functions that call backend APIs.

If you want to add a new UI feature for any Redis-backed functionality, consume the backend data as described above.

---
