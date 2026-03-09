
Sessions make the app faster.
Rate Limiting makes the app stable.
Login Protection makes the app secure.
Socket Handshake -> Redis Session Check -> WsAuth Storage flow is working perfectly!.
ws_auth proves WHO you are.
user_socket proves WHERE to send your messages.
online_users is like being inside the Building (you are logged into the app).
room:{chatId} is like walking into a specific Room in that building.


## Notifications

13. `notifications:{userId}`
14. `notification_count:{userId}`

Integration:

```text
poll created / admin action
 ↓
LPUSH notifications
 ↓
INCR notification_count
```

Yes — **TTL 7 days works**. Redis supports TTL on lists.

---

## Poll System

15. `poll_live:{pollId}`
16. `user_voted:{pollId}`

Integration:

```text
vote
 ├─ HINCRBY poll_live
 └─ SADD user_voted
```

DB remains source of truth.

---

## Anonymous Identity System

17. `anon_map:{randomString}`
18. `user_anon:{userId}:{targetId}`

Integration:

```text
user enters anonymous chat
 ↓
generate randomString
 ↓
store both mappings
```

Used when sending anonymous messages.


# Final Implementation Order

```text
13 notifications:{userId}
14 notification_count:{userId}

15 poll_live:{pollId}
16 user_voted:{pollId}

17 anon_map:{randomString}
18 user_anon:{userId}:{targetId}
```

---

# Small Improvements (Recommended)

## Limit message cache

```text
LPUSH message_cache:{chatId}:recent
LTRIM message_cache:{chatId}:recent 0 49
```

---

## Limit offline queue

```text
LPUSH offline_messages:{userId}
LTRIM offline_messages:{userId} 0 99
```

---

## Notification TTL

Better approach:

```text
LPUSH notifications:{userId}
LTRIM notifications:{userId} 0 49
EXPIRE notifications:{userId} 604800
```


-- 1. session:{sessionId}
-- 2. ws_auth:{socketId}
-- 3. user_socket:{userId}
-- 4. socket_user:{socketId}
-- 5. online_users
-- 6. room:{chatId}
-- 7. typing:{chatId}:{userId}
-- 8. unread_counts:{userId}:{chatId}
-- 9. message_cache:{chatId}:recent
-- 10. offline_messages:{userId}
11. notifications:{userId}
12. notification_count:{userId}
13. poll_live:{pollId}
14. user_voted:{pollId}
15. anon_map:{randomString}
16. user_anon:{userId}:{targetId}
-- 17. rate_limit:{userId}:{endpoint}:{minute}
-- 18. login_attempts:{ip}:{hour}


NOT IMPs [later for future]:
| Key                               | Reason                       |
| --------------------------------- | ---------------------------- |
| `ws_connections`                  | can be computed from sockets |
| `session_cache:{userId}:{chatId}` | premature optimization       |
| `anon_cache:{userId}:{chatId}`    | DB lookup is cheap           |
| `key_cache:{userId}:{chatId}`     | only needed for E2EE         |
| `key_version:{chatId}`            | only needed for E2EE         |


OPTIONAL [Later in future]:
| Key                                       | Reason                     |
| ----------------------------------------- | -------------------------- |
| `user_sessions:{userId}`                  | logout all devices feature |
| `user_presence:{userId}`                  | last seen tracking         |
| `notifications:{userId}`                  | faster notifications       |
| `notification_count:{userId}`             | notification badge         |


Notifications (Lists/Sorted Sets)
    // Key: notifications:{userId}
    // Type: List of notification JSON
    // Max length: 50
    // Used for: In-app notifications
    // TTL: 7 days -- will this work?

    // Key: notification_count:{userId}
    // Type: Integer
    // TTL: 7 days
    // Used: Unread badge

Poll & Voting Cache
    // Key: poll_live:{pollId}
    // Type: Hash
    // Value: {votesFor: 0, votesAgainst: 0, totalVoters: 0}
    // TTL: 6 hours (poll duration)
    // Used for: Live vote updates

    // Key: user_voted:{pollId}
    // Type: Set of user IDs
    // TTL: 6 hours
    // Used for: Prevent double voting

Anonymous Identity Cache
    // Key: anon_map:{randomString}
    // Type: String (userId)
    // TTL: 30 days
    // Used for: Quick anonymous ID resolution

    // Key: user_anon:{userId}:{targetId}
    // Type: String (randomString)
    // TTL: 30 days
    // Used for: Reverse lookup

-- ## **1. SESSION & AUTH**

## **4. NOTIFICATIONS**

### 4.1 Pending Notifications
```redis
Key: notifications:{userId}
Type: List
TTL: None
Value: JSON notification objects

Purpose: Store pending notifications for user

Example:
LPUSH notifications:uuid-123 '{"type":"chat_request","from":"uuid-456","timestamp":"..."}'
LRANGE notifications:uuid-123 0 9  // Get 10 latest
```

### 4.2 Unread Notification Counter
```redis
Key: notification_count:{userId}
Type: String (counter)
TTL: None
Value: unread count

Example:
INCR notification_count:uuid-123
SET notification_count:uuid-123 0  // Mark all as read
```

## **5. POLL & VOTING CACHE**

### 5.1 Live Poll Vote Counts
```redis
Key: poll_live:{pollId}
Type: Hash
TTL: 6 hours (21600 seconds)
Fields:
  - totalVotes: number
  - votesInFavor: number
  - votesAgainst: number
  - expiresAt: timestamp

Purpose: Real-time vote counting without DB hits

Example:
HSET poll_live:poll-123 totalVotes 10 votesInFavor 7 votesAgainst 3
HINCRBY poll_live:poll-123 votesInFavor 1
EXPIRE poll_live:poll-123 21600
```

### 5.2 Poll Voter Tracking
```redis
Key: user_voted:{pollId}
Type: Set
TTL: 6 hours (21600 seconds)
Members: userId1, userId2, ...

Purpose: Prevent duplicate voting, track who voted

Example:
SADD user_voted:poll-123 "uuid-456"
SISMEMBER user_voted:poll-123 "uuid-456"  // Check if voted
```

## **6. ANONYMOUS IDENTITY CACHE**

### 6.1 Anonymous String to User Mapping
```redis
Key: anon_map:{randomString}
Type: String
TTL: None (persistent)
Value: userId

Purpose: Quick lookup of who owns an anonymous identity

Example:
SET anon_map:anon_xyz789 "uuid-123"
GET anon_map:anon_xyz789
```

### 6.2 User to Anonymous String Mapping
```redis
Key: user_anon:{userId}:{targetId}
Type: String
TTL: None (persistent)
Value: randomString

Purpose: Find anonymous identity for user-target pair

Example:
SET user_anon:uuid-123:uuid-456 "anon_xyz789"
GET user_anon:uuid-123:uuid-456
```
