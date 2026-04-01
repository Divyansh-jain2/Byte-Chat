
# Keys flow from onboarding

## 1) User opens signup form (client-side, before API call)
Created on frontend:

1. RSA keypair is generated in browser:
- `publicKey`
- `privateKey`
- Logic: e2ee.utils.ts
- Triggered from signup page: page.tsx

2. Private key is encrypted with user password (AES-GCM, PBKDF2-derived key):
- Output stored as `encryptedPrivateKey` string (`salt:iv:ciphertext`)
- Logic: e2ee.utils.ts
- Triggered from signup page: page.tsx

So at this point:
- Client has plaintext private key in memory
- Client sends `publicKey` + `encryptedPrivateKey` to backend

---

## 2) Signup API is called (backend)
Backend inserts user and encryption key record:

1. User row is created in `users`
- Signup flow: auth.controller.ts

2. If `publicKey` + `encryptedPrivateKey` are present, backend inserts row in `user_encryption_keys`:
- Columns used:
  - `public_key`
  - `encrypted_private_key`
- Insert point: auth.controller.ts

3. OTP and verification token are created for email verification:
- Inserted in `user_verifications`
- Not encryption keys, but auth verification artifacts
- Flow: auth.controller.ts

So after signup submission:
- `user_encryption_keys` exists for that user (if keys were sent)
- No chat session key yet
- No message key yet

---

## 3) User enters OTP (verify signup)
On OTP verification for signup:

1. Access token (JWT) is generated
2. Refresh token is generated
3. **Hashed** refresh token is inserted in `user_sessions` (`session_token`)
- Flow: auth.controller.ts
- Table definition: -2-CurrTables.sql

This is **session/auth token storage**, not chat encryption key storage.

---

## 4) User logs in later (normal login path)
On login:

1. Backend returns `encrypted_private_key` in user payload
- Query includes it: auth.controller.ts

2. Frontend decrypts private key using entered password and stores plaintext private key in sessionStorage:
- `sessionStorage['decryptedPrivateKey']`
- Flow: page.tsx

3. Backend also creates:
- new refresh token hash in `user_sessions`
- Redis session object via `createSession`
- Flow: auth.controller.ts, auth.controller.ts, session.service.ts

Again, this is auth/session, not message encryption key creation.

---

## 5) First time user enters a chat/group (E2EE session key creation)
This is when **chat encryption session keys** are created.

1. Frontend tries to decrypt an existing message session key from fetched messages (`user_session_key` + `key_id`).
2. If none exists, frontend:
- Generates new AES session key
- Fetches participant public keys
- Encrypts AES key once per participant using each participant public key
- Sends all encrypted copies to backend `/api/chat/keys`
- Frontend flow:
  - 1:1 chat: [frontend/src/app/chat/[conversationId]/page.tsx](frontend/src/app/chat/[conversationId]/page.tsx#L153)
  - Group chat: [frontend/src/app/groups/[groupId]/chat/page.tsx](frontend/src/app/groups/[groupId]/chat/page.tsx#L121)

3. Backend stores rows in `chat_session_keys` with common `session_key_id` (grouping id):
- Insert flow: chat.controller.ts
- Route: chat.routes.ts

This is the first true **conversation encryption key material** creation event.

---

## 6) User sends a message (per-message crypto fields creation)
Each message creates message-level encryption metadata:

1. Frontend encrypts plaintext with AES-GCM session key:
- `ciphertext`
- `iv`
- `authTag`
- Logic: e2ee.utils.ts

2. Backend stores in `chat_messages`:
- `encrypted_content`
- `content_iv`
- `content_auth_tag`
- `key_id` (points to session key group id)
- 1:1 insert: chat.controller.ts
- Group insert: group.controller.ts
- Anonymous insert: anonymous-chat.controller.ts

So message-level key artifacts are created **every send**.

---

## What is NOT created during signup
1. `chat_session_keys` is not created at signup.
2. `chat_messages.key_id`, `content_iv`, `content_auth_tag` are not created at signup.
3. `group_session_keys` is currently not part of active runtime flow.
4. `groups.master_key` is present in schema snapshots but not used by current runtime controller paths.

