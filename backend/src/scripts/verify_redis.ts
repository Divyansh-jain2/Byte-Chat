// // import { redis } from '../lib/redis.js';
// // import { createSession, getSession, deleteSession } from '../services/session.service.js';
// // import { storeWsAuth, getWsAuth, deleteWsAuth } from '../services/wsAuth.service.js';
// // import { mapUserSocket, getSocketUser, getUserSockets, removeSocketMapping } from '../services/socketRouting.service.js';
// // import { addOnlineUser, removeOnlineUser, isUserOnline, getOnlineUsersCount } from '../services/presence.service.js';
// // import { joinRoom, leaveRoom, getRoomSockets, removeSocketFromAllRooms } from '../services/room.service.js';
// // import { setTyping, isTyping, getTypingUsers } from '../services/typing.service.js';
// // import { cacheMessage, getCachedMessages } from '../services/messageCache.service.js';
// // import { queueOfflineMessage, getOfflineMessages } from '../services/offlineMessage.service.js';
// // import { incrementUnread, resetUnread, getUnread } from '../services/unread.service.js';
// // import { pushNotification, getNotifications, getNotificationCount, resetNotificationCount } from '../services/notification.service.js';
// // import { initPollCache, votePoll, getLivePoll } from '../services/pollCache.service.js';
// // import { v4 as uuidv4 } from 'uuid';

// // async function runTests() {
// //     console.log("🚀 Starting Redis Features Verification...");

// //     try {
// //         // 1. Test Connection
// //         await redis.set("test_ping", "pong");
// //         const ping = await redis.get("test_ping");
// //         console.log(`📡 Redis Connection: ${ping === "pong" ? "✅ Success" : "❌ Failed"}`);

// //         // 2. Test Session Service
// //         const sessionId = uuidv4();
// //         const testUser = {
// //             userId: "test-uuid",
// //             rollNo: "B23XX",
// //             email: "test@example.com",
// //             ipAddress: "127.0.0.1",
// //             userAgent: "VerificationScript"
// //         };

// //         console.log("📝 Creating Session...");
// //         await createSession(sessionId, testUser);

// //         console.log("🔍 Retrieving Session...");
// //         const session = await getSession(sessionId);
// //         if (session && session.userId === testUser.userId) {
// //             console.log("✅ Session Service: Working");
// //         } else {
// //             console.error("❌ Session Service: Failed", session);
// //         }

// //         // 3. Test TTL
// //         const ttl = await redis.ttl(`session:${sessionId}`);
// //         console.log(`⏳ Session TTL: ${ttl}s (Expected ~604800)`);

// //         // 4. Test Deletion
// //         await deleteSession(sessionId);
// //         const deletedSession = await getSession(sessionId);
// //         console.log(`🗑️ Session Deletion: ${!deletedSession ? "✅ Success" : "❌ Failed"}`);

// //         // 5. Rate Limiting Logic Check
// //         const rateKey = `rate_limit:testuser:/api/test:12345`;
// //         await redis.del(rateKey);
// //         const count = await redis.incr(rateKey);
// //         const count2 = await redis.incr(rateKey);
// //         console.log(`🛡️ Rate Limiter Logic: ${count2 === 2 ? "✅ Success" : "❌ Failed"}`);
// //         await redis.del(rateKey);

// //         // 6. Login Attempt Logic Check
// //         const attemptKey = `login_attempts:127.0.0.1:9999`;
// //         await redis.del(attemptKey);
// //         const attempts = await redis.incr(attemptKey);
// //         console.log(`🧱 Login Protection Logic: ${attempts === 1 ? "✅ Success" : "❌ Failed"}`);
// //         await redis.del(attemptKey);

// //         // 7. WebSocket Auth Logic Check
// //         console.log("🔌 Testing WebSocket Auth...");
// //         const socketId = "test-socket-123";
// //         const wsData = { userId: "test-user", authenticatedAt: Date.now() };
// //         await storeWsAuth(socketId, wsData);
// //         const retrievedWs = await getWsAuth(socketId);
// //         if (retrievedWs && retrievedWs.userId === wsData.userId) {
// //             console.log("✅ WebSocket Auth: Working");
// //         } else {
// //             console.error("❌ WebSocket Auth: Failed", retrievedWs);
// //         }

// //         // Test WS TTL
// //         const wsTtl = await redis.ttl(`ws_auth:${socketId}`);
// //         console.log(`⏳ WebSocket Auth TTL: ${wsTtl}s (Expected ~30)`);

// //         await deleteWsAuth(socketId);
// //         const deletedWs = await getWsAuth(socketId);
// //         console.log(`🗑️ WebSocket Auth Deletion: ${!deletedWs ? "✅ Success" : "❌ Failed"}`);

// //         // 8. Socket Routing Logic Check
// //         console.log("📍 Testing Socket Routing...");
// //         const userId = "test-user-routing";
// //         const s1 = "socket-1";
// //         const s2 = "socket-2";

// //         await mapUserSocket(userId, s1);
// //         await mapUserSocket(userId, s2);

// //         const sockets = await getUserSockets(userId);
// //         console.log(`📡 Multi-device Mapping: ${sockets.length === 2 && sockets.includes(s1) && sockets.includes(s2) ? "✅ Success" : "❌ Failed"} (${sockets.join(",")})`);

// //         const u1 = await getSocketUser(s1);
// //         console.log(`🔍 Reverse Lookup: ${u1 === userId ? "✅ Success" : "❌ Failed"}`);

// //         await removeSocketMapping(s1);
// //         const afterS1 = await getUserSockets(userId);
// //         console.log(`🗑️ Partial Socket Removal: ${afterS1.length === 1 && afterS1[0] === s2 ? "✅ Success" : "❌ Failed"}`);

// //         await removeSocketMapping(s2);
// //         const finalSockets = await getUserSockets(userId);
// //         console.log(`🧹 Final Cleanup: ${finalSockets.length === 0 ? "✅ Success" : "❌ Failed"}`);

// //         // 9. Presence Logic Check
// //         console.log("👤 Testing Presence System...");
// //         const pUserId = "test-presence-user";
// //         await addOnlineUser(pUserId);
// //         const isOnline = await isUserOnline(pUserId);
// //         console.log(`✅ User Online: ${isOnline ? "✅ Success" : "❌ Failed"}`);

// //         const onlineCount = await getOnlineUsersCount();
// //         console.log(`📊 Online Count: ${onlineCount > 0 ? "✅ Success" : "❌ Failed"} (${onlineCount})`);

// //         await removeOnlineUser(pUserId);
// //         const isOffline = !(await isUserOnline(pUserId));
// //         console.log(`🗑️ User Offline: ${isOffline ? "✅ Success" : "❌ Failed"}`);

// //         // 10. Chat Room Logic Check
// //         console.log("🏠 Testing Chat Room System...");
// //         const chatId = "test-chat-room";
// //         const roomSocket = "socket-room-1";

// //         await joinRoom(chatId, roomSocket);
// //         const roomSockets = await getRoomSockets(chatId);
// //         console.log(`📥 Join Room: ${roomSockets.includes(roomSocket) ? "✅ Success" : "❌ Failed"}`);

// //         await leaveRoom(chatId, roomSocket);
// //         const afterLeave = await getRoomSockets(chatId);
// //         console.log(`📤 Leave Room: ${!afterLeave.includes(roomSocket) ? "✅ Success" : "❌ Failed"}`);

// //         // Multi-room cleanup check
// //         await joinRoom("room-a", roomSocket);
// //         await joinRoom("room-b", roomSocket);
// //         await removeSocketFromAllRooms(roomSocket);
// //         const ra = await getRoomSockets("room-a");
// //         const rb = await getRoomSockets("room-b");
// //         console.log(`🧹 Multi-room Cleanup: ${ra.length === 0 && rb.length === 0 ? "✅ Success" : "❌ Failed"}`);

// //         // 11. Typing Indicators Logic Check
// //         console.log("⌨️  Testing Typing Indicators...");
// //         const tChatId = "test-chat-typing";
// //         const tUserId = "test-user-A";

// //         await setTyping(tChatId, tUserId);
// //         const typingNow = await isTyping(tChatId, tUserId);
// //         console.log(`📡 Typing Status: ${typingNow ? "✅ Success" : "❌ Failed"}`);

// //         const typers = await getTypingUsers(tChatId);
// //         console.log(`🔍 List Typers: ${typers.includes(tUserId) ? "✅ Success" : "❌ Failed"}`);

// //         // Test auto-expiration (conceptual, we don't want to wait 5s in a fast script usually, 
// //         // but it's good for manual verification)
// //         console.log("⏳ Typing TTL is 5s (managed by Redis)");

// //         // 12. Message Caching Logic Check
// //         console.log("💾 Testing Message Caching...");
// //         const cChatId = "test-chat-cache";
// //         const cMsg = { id: "msg-123", content: "Hello Cache" };
// //         await cacheMessage(cChatId, cMsg);
// //         const cachedMsgs = await getCachedMessages(cChatId);
// //         console.log(`📦 Message Cached: ${cachedMsgs.some(m => m.id === "msg-123") ? "✅ Success" : "❌ Failed"}`);

// //         // 13. Offline Message Logic Check
// //         console.log("📬 Testing Offline Message Queue...");
// //         const oUserId = "test-user-offline";
// //         const oMsg = { id: "offline-1", content: "Don't miss this" };
// //         await queueOfflineMessage(oUserId, oMsg);
// //         const offMsgs = await getOfflineMessages(oUserId);
// //         const offMsgsAfter = await getOfflineMessages(oUserId);
// //         console.log(`✉️  Message Queued: ${offMsgs.some(m => m.id === "offline-1") ? "✅ Success" : "❌ Failed"}`);
// //         console.log(`🗑️  Queue Cleared: ${offMsgsAfter.length === 0 ? "✅ Success" : "❌ Failed"}`);

// //         // 14. Unread Count Logic Check
// //         console.log("🔢 Testing Unread Counters...");
// //         const uUserId = "test-user-unread";
// //         const uChatId = "test-chat-unread";
// //         await incrementUnread(uUserId, uChatId);
// //         await incrementUnread(uUserId, uChatId);
// //         const mUnreadCount = await getUnread(uUserId, uChatId);
// //         console.log(`📈 Increment Count: ${mUnreadCount === 2 ? "✅ Success" : "❌ Failed"}`);
// //         await resetUnread(uUserId, uChatId);
// //         const resetCount = await getUnread(uUserId, uChatId);
// //         console.log(`📉 Reset Count: ${resetCount === 0 ? "✅ Success" : "❌ Failed"}`);

// //         // 15. Notification Logic Check
// //         console.log("🔔 Testing Notifications...");
// //         const nUserId = "test-user-notifications";
// //         const notification = { type: "poll_created", groupId: "test-group", createdBy: "test-creator" };
// //         await pushNotification(nUserId, notification);
// //         const notifications = await getNotifications(nUserId);
// //         const nUnreadCount = await getNotificationCount(nUserId);
// //         console.log(`📥 Notification Received: ${notifications.some((n: any) => n.type === "poll_created") ? "✅ Success" : "❌ Failed"}`);
// //         console.log(`📈 Notification Count: ${nUnreadCount === 1 ? "✅ Success" : "❌ Failed"}`);
// //         await resetNotificationCount(nUserId);
// //         const nResetCount = await getNotificationCount(nUserId);
// //         console.log(`📉 Reset Notification Count: ${nResetCount === 0 ? "✅ Success" : "❌ Failed"}`);

// //         // 16. Poll Live Cache Logic Check
// //         console.log("🗳️  Testing Live Poll Cache...");
// //         const pPollId = "test-poll-123";
// //         const pTestUserId = "test-user-voter";
// //         await initPollCache(pPollId, { votes_for: 0, votes_against: 0, total_voters: 0, expires_at: new Date(Date.now() + 100000) });
// //         await votePoll(pPollId, pTestUserId, true);
// //         const pLivePoll = await getLivePoll(pPollId);
// //         console.log(`📊 Live Poll Cache: ${pLivePoll.votesFor === '1' && pLivePoll.totalVoters === '1' ? "✅ Success" : "❌ Failed"}`);
// //         try {
// //             await votePoll(pPollId, pTestUserId, false);
// //             console.log(`🚫 Double Voting Prevention: ❌ Failed`);
// //         } catch (e: any) {
// //             console.log(`🚫 Double Voting Prevention: ${e.message === "User already voted" ? "✅ Success" : "❌ Failed"}`);
// //         }
// //         await redis.del(`poll_live:${pPollId}`);
// //         await redis.del(`user_voted:${pPollId}`);

// //         console.log("\n✨ All core Redis logic verified!");
// //     } catch (error) {
// //         console.error("❌ Verification failed:", error);
// //     } finally {
// //         await redis.quit();
// //         process.exit(0);
// //     }
// // }

// // runTests();


// import { redis } from "../lib/redis.js";

// const INTERVAL_MS = 5000; // check every 5 seconds
// const KEY_PATTERN = process.env.REDIS_PATTERN || "*";

// async function inspectKey(key: string) {
//   try {
//     const type = await redis.type(key);
//     const ttl = await redis.ttl(key);

//     let value: any;

//     switch (type) {
//       case "string":
//         value = await redis.get(key);
//         break;

//       case "list":
//         value = await redis.lrange(key, 0, -1);
//         break;

//       case "set":
//         value = await redis.smembers(key);
//         break;

//       case "hash":
//         value = await redis.hgetall(key);
//         break;

//       case "zset":
//         value = await redis.zrange(key, 0, -1, "WITHSCORES");
//         break;

//       default:
//         value = "Unknown type";
//     }

//     return {
//       key,
//       type,
//       ttl,
//       value,
//     };
//   } catch (err) {
//     return {
//       key,
//       error: err,
//     };
//   }
// }

// async function scanKeys(pattern: string) {
//   const keys: string[] = [];

//   let cursor = "0";

//   do {
//     const result = await redis.scan(
//       cursor,
//       "MATCH",
//       pattern,
//       "COUNT",
//       100
//     );

//     cursor = result[0];
//     keys.push(...result[1]);

//   } while (cursor !== "0");

//   return keys;
// }

// async function monitor() {
//   console.log("📡 Redis Monitor Started");
//   console.log("Pattern:", KEY_PATTERN);
//   console.log("Interval:", INTERVAL_MS, "ms");

//   setInterval(async () => {
//     try {
//       console.log("\n==============================");
//       console.log("🕒 Time:", new Date().toISOString());
//       console.log("==============================");

//       const keys = await scanKeys(KEY_PATTERN);

//       if (keys.length === 0) {
//         console.log("No keys found");
//         return;
//       }

//       for (const key of keys) {
//         const data = await inspectKey(key);

//         console.log("\nKEY:", data.key);
//         console.log("TYPE:", data.type);
//         console.log("TTL:", data.ttl);

//         console.log("VALUE:");
//         console.log(JSON.stringify(data.value, null, 2));
//       }

//     } catch (err) {
//       console.error("Monitor error:", err);
//     }
//   }, INTERVAL_MS);
// }

// monitor();


import { redis } from "../lib/redis.js";

async function checkMessageCache() {
  console.log("🔍 Scanning for cached messages...");
  
  // Find all message cache keys
  const keys = await redis.keys("message_cache:*:recent");
  
  if (keys.length === 0) {
    console.log("No messages currently cached. (Remember, they expire after 1 hour!)");
    process.exit(0);
  }

  for (const key of keys) {
    console.log(`\n=========================================`);
    console.log(`📂 Cache Key: ${key}`);
    const ttl = await redis.ttl(key);
    console.log(`⏳ Expires in: ${ttl} seconds`);
    
    // Get all messages from this list
    const messages = await redis.lrange(key, 0, -1);
    console.log(`📝 Total Cached Messages: ${messages.length}`);
    
    // Parse and display the latest message as an example
    if (messages.length > 0) {
      console.log(`\nLatest Message Preview:`);
      console.log(messages); 
    }
  }
  
  process.exit(0);
}

checkMessageCache();


