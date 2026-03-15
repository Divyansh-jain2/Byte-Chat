# Byte-Chat Redis Implementation & Testing Guide

This document details all the Redis data structures implemented in the Byte-Chat backend, explaining what they do, what actions trigger them, and how you can manually test and verify them using the `redis-cli`.

## Prerequisites for Testing

To test these in real-time, you should open a terminal and connect to your Redis instance using the monitor command. This will output every command the backend sends to Redis in real-time.

```bash
docker exec -it redis redis-cli MONITOR
```
*(Leave this terminal window open while you perform actions in the app).*

Alternatively, you can query specific keys using the standard CLI:
```bash
docker exec -it redis redis-cli
```

---

## 1. Authentication & Sessions

### `session:{sessionId}`
- **Type**: JSON String
- **Purpose**: Stores the user's active login session details.
- **Trigger**: User logs in.
- **TTL**: 7 days.
- **How to Test**:
  1. Login to the application.
  2. **Monitor Output**: You should see `SET session:<uuid> "{\"userId\":\"...\"}" EX 604800`.
  3. **CLI Check**: `GET session:<your-session-id>` (You can find the session ID in your browser cookies).

### `rate_limit:{userId}:{endpoint}:{minute}` & `login_attempts:{ip}:{hour}`
- **Type**: Integer (Counter)
- **Purpose**: Prevents API abuse and brute-force login attempts.
- **Trigger**: Making API requests or failing login.
- **How to Test**:
  1. Spam an API endpoint or fail login multiple times.
  2. **Monitor Output**: You should see `INCR rate_limit:...` and `EXPIRE`.

---

## 2. Real-Time Presence & Sockets

### `ws_auth:{socketId}`
- **Type**: String (UserId)
- **Purpose**: Temporarily links a socket connection to a user during the WS handshake.
- **Trigger**: Socket connects.
- **TTL**: 30 seconds.

### `user_socket:{userId}` (Set) & `socket_user:{socketId}` (String)
- **Type**: Set & String
- **Purpose**: Maps a user to their active socket(s) for delivering targeted messages.
- **Trigger**: User successfully authenticates their socket connection.
- **How to Test**:
  1. Open the app in a browser (connects socket).
  2. **Monitor Output**: `SADD user_socket:<userId> <socketId>` and `SET socket_user:<socketId> <userId>`.
  3. **CLI Check**: `SMEMBERS user_socket:<userId>`.

### `online_users`
- **Type**: Set
- **Purpose**: Global tracker of who is currently online in the app.
- **Trigger**: User connects/disconnects.
- **How to Test**:
  1. Open the app.
  2. **CLI Check**: `SISMEMBER online_users <userId>` (Should return `1`).
  3. Close the app.
  4. **CLI Check**: `SISMEMBER online_users <userId>` (Should return `0`).

---

## 3. Chat Rooms & Typing

### `room:{chatId}`
- **Type**: Set
- **Purpose**: Tracks which users are actively looking at a specific chat screen.
- **Trigger**: User opens a specific 1v1 or group chat.
- **How to Test**:
  1. Click on a chat in the sidebar.
  2. **Monitor Output**: `SADD room:<chatId> <userId>`.
  3. Click away to another chat.
  4. **Monitor Output**: `SREM room:<chatId> <userId>`.

### `typing:{chatId}:{userId}`
- **Type**: String (Timestamp)
- **Purpose**: Indicates a user is currently typing in a chat.
- **Trigger**: User types in the message input box.
- **TTL**: 5 seconds.
- **How to Test**:
  1. Start typing a message.
  2. **Monitor Output**: `SET typing:<chatId>:<userId> "<timestamp>" EX 5`.
  3. **CLI Check**: `KEYS typing:<chatId>:*` to see who is typing.

---

## 4. Messaging Performance

### `message_cache:{chatId}:recent`
- **Type**: List
- **Purpose**: Caches the 50 most recent messages in a chat for blazing-fast initial load times.
- **Trigger**: A message is sent in the chat.
- **TTL**: 1 hour.
- **How to Test**:
  1. Send a message in any chat.
  2. **Monitor Output**: `LPUSH message_cache:<chatId>:recent "{...}"` followed by `LTRIM` and `EXPIRE`.
  3. **CLI Check**: `LRANGE message_cache:<chatId>:recent 0 -1`.

### `offline_messages:{userId}`
- **Type**: List
- **Purpose**: Queues messages for a user if they are entirely disconnected from the app.
- **Trigger**: A message is sent to a user who is NOT in the `online_users` set.
- **How to Test**:
  1. Have User A close the app entirely.
  2. Have User B send User A a message.
  3. **Monitor Output**: `LPUSH offline_messages:<UserA_ID> "{...}"`.
  4. Have User A open the app.
  5. **Monitor Output**: `LRANGE offline_messages:<UserA_ID> 0 -1` followed by `DEL offline_messages:<UserA_ID>` (Messages are delivered and queue is cleared).

### `unread_counts:{userId}:{chatId}`
- **Type**: Integer (Counter)
- **Purpose**: Tracks how many unread messages a user has in a specific chat.
- **Trigger**: Message is sent (Increments) / User opens chat (Resets).
- **How to Test**:
  1. Have User B send a message to User A (while User A is not in the chat).
  2. **Monitor Output**: `INCR unread_counts:<UserA_ID>:<chatId>`.
  3. User A opens the chat.
  4. **Monitor Output**: `SET unread_counts:<UserA_ID>:<chatId> 0`.

---

## 5. Notifications Layer

### `notifications:{userId}`
- **Type**: List
- **Purpose**: Stores the user's latest in-app notifications (e.g., poll created, added to group).
- **Trigger**: A group admin adds a member, promotes someone, or creates a poll.
- **Max Length**: 50.
- **TTL**: 7 days.
- **How to Test**:
  1. As an admin, create a poll in a group.
  2. **Monitor Output**: `LPUSH notifications:<otherUserId> "{...}"` for every other member in the group.

### `notification_count:{userId}`
- **Type**: Integer (Counter)
- **Purpose**: Drives the red unread badge icon for notifications.
- **Trigger**: A new notification is pushed (Increments) / User views notifications panel (Resets).
- **TTL**: 7 days.
- **How to Test**:
  1. Trigger a notification (like creating a poll).
  2. **Monitor Output**: `INCR notification_count:<userId>`.
  3. **CLI Check**: `GET notification_count:<userId>`.

---

## 6. Poll Live Cache

### `poll_live:{pollId}`
- **Type**: Hash
- **Purpose**: Tracks live vote counts to prevent hammering the PostgreSQL database every time someone votes.
- **Trigger**: A poll is created (Initializes Hash) / A vote is cast (`HINCRBY`).
- **TTL**: 6 hours (or poll duration).
- **How to Test**:
  1. Create a poll.
  2. **Monitor Output**: `HSET poll_live:<pollId> votesFor 0 votesAgainst 0 ...`
  3. Cast a vote.
  4. **Monitor Output**: `HINCRBY poll_live:<pollId> votesFor 1` and `HINCRBY poll_live:<pollId> totalVoters 1`.
  5. **CLI Check**: `HGETALL poll_live:<pollId>`.

### `user_voted:{pollId}`
- **Type**: Set
- **Purpose**: Remembers which users have already voted to prevent double-voting.
- **Trigger**: User casts a vote.
- **TTL**: 6 hours (or poll duration).
- **How to Test**:
  1. Cast a vote on a poll.
  2. **Monitor Output**: `SISMEMBER user_voted:<pollId> <userId>` (returns 0), then `SADD user_voted:<pollId> <userId>`.
  3. Try to vote again using an API tool.
  4. **Monitor Output**: `SISMEMBER user_voted:<pollId> <userId>` (returns 1, backend throws custom Error).
