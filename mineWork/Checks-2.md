
# Keys Lifecycle Map

## 1) chat_messages fields
Fields: content_iv, content_auth_tag, key_id

Created when:
1. A message is inserted in regular chat, group chat, or anonymous chat.
2. Insert happens in:
- chat.controller.ts
- group.controller.ts
- anonymous-chat.controller.ts

Used when:
1. Messages are fetched and returned with user_session_key (joined from chat_session_keys using key_id).
2. Frontend decrypts encrypted_content using content_iv + content_auth_tag + session AES key.
3. Message edit flow also updates encrypted_content, content_iv, content_auth_tag:
- message-management.controller.ts
- [frontend/src/app/chat/[conversationId]/page.tsx](frontend/src/app/chat/[conversationId]/page.tsx)
- [frontend/src/app/groups/[groupId]/chat/page.tsx](frontend/src/app/groups/[groupId]/chat/page.tsx)

Meaning:
1. key_id points to a session key grouping id (session_key_id in chat_session_keys).
2. content_iv and content_auth_tag are per-message AES-GCM metadata.

---

## 2) chat_session_keys
Fields: session_key_id, aes_key_encrypted (plus encrypted_for_user_id, etc.)

Created when:
1. Frontend initializes or rotates session key for a conversation/group and sends encrypted key copies for participants.
2. API endpoint for writing keys is:
- chat.routes.ts
3. Backend writer is:
- chat.controller.ts

How it is built:
1. Frontend generates AES key.
2. Frontend fetches participant public keys.
3. Frontend encrypts AES key with each participant public key.
4. Frontend posts array of encrypted keys to store endpoint.
5. One common session_key_id is used as grouping id for all participant rows.

Where frontend does this:
- [frontend/src/app/chat/[conversationId]/page.tsx](frontend/src/app/chat/[conversationId]/page.tsx)
- [frontend/src/app/groups/[groupId]/chat/page.tsx](frontend/src/app/groups/[groupId]/chat/page.tsx)
- chat.service.ts

Used when:
1. Backend fetch joins chat_messages.key_id to chat_session_keys.session_key_id and selects row for current user as user_session_key.
2. Frontend decrypts that user_session_key with private key, imports AES key, then decrypts messages.

Important design note:
1. Your schema/comments indicate session_key_id is a grouping id, not strict single-row primary identity now:
- -2-CurrTables.sql

---

## 3) group_session_keys
Created when:
1. In current runtime code, it is not created.
2. I only found deletion in seed script:
- seed.ts

Used when:
1. Not used by controllers/routes for active chat encryption.
2. Group E2EE currently uses chat_session_keys with group_id, not group_session_keys.

Conclusion:
1. This table is currently dormant/legacy in your app flow.

---

## 4) groups.master_key
Created when:
1. Present in schema snapshot:
- -1-Schema.txt

Used when:
1. No backend/frontend runtime references found in app code.
2. No active create/update/read logic tied to master_key in controllers/services.

Conclusion:
1. Also dormant in this codebase today.

---

## 5) user_encryption_keys
Fields: public_key, encrypted_private_key

Created when:
1. Signup receives client-generated publicKey + encryptedPrivateKey and inserts row:
- auth.controller.ts
2. Frontend key generation/encryption at signup:
- page.tsx
- e2ee.utils.ts

Used when:
1. Login query returns encrypted_private_key:
- auth.controller.ts
2. Frontend decrypts encryptedPrivateKey using login password and stores decrypted private key in sessionStorage:
- page.tsx
3. Public keys are fetched for participant key wrapping:
- chat.controller.ts
- group.controller.ts

Meaning:
1. Public key is server-readable distribution key.
2. Private key is stored encrypted in DB and only decrypted client-side.

---

## 6) user_sessions
Created when:
1. On login and signup-OTP auto-login, refresh token hash is inserted into user_sessions:
- auth.controller.ts

Used when:
1. Logout resolves session by refresh token hash and deletes it.
2. Password reset deletes all user_sessions to force re-login.
3. Routes:
- auth.routes.ts

Not used for:
1. Message encryption/decryption.
2. Day-to-day API auth middleware (that uses JWT or Redis session header):
- auth.middleware.ts
- session.service.ts

---

## Important Current Gaps You Should Add Rules For

1. storeSessionKeys endpoint currently does not strongly validate membership/target users before insert.
- chat.controller.ts

2. Group chat send path effectively expects encrypted fields; regular chat path still allows fallback placeholders if E2EE init failed on client.
- [frontend/src/app/groups/[groupId]/chat/page.tsx](frontend/src/app/groups/[groupId]/chat/page.tsx)
- [frontend/src/app/chat/[conversationId]/page.tsx](frontend/src/app/chat/[conversationId]/page.tsx)

3. group_session_keys and groups.master_key are not participating in runtime crypto flow, which can cause confusion in policy/rules design.

---

## Recommended Rule Set (practical)

1. Enforce key_id required for all non-system messages in chat_messages once E2EE is mandatory.
2. Validate key_id belongs to same conversation/group context as message.
3. In storeSessionKeys, verify caller is member/participant and each encrypted_for_user_id is valid participant.
4. Rotate session keys on group membership changes (join/leave/kick) and mark previous key_id versions as expired.
5. Add explicit key metadata: created_by_user_id, rotation_reason, expires_at, active flag.
6. Reject placeholder or malformed content_iv/content_auth_tag formats server-side.
7. Decide one canonical group-key table strategy:
- either fully adopt chat_session_keys for both direct and group, or
- migrate cleanly to group_session_keys and update runtime code.
