# BYTE-CHAT - Sitemap & User Flows


## 🗺️ COMPLETE SITEMAP

```
┌─────────────────────────────────────────────────────────────────┐
│                         BYTE-CHAT                                │
│                    Student Messaging Platform                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                   ┌─────────────────────┐
                   │   LANDING PAGE (/)   │
                   │  - Hero Section      │
                   │  - Features          │
                   │  - Call to Actions   │
                   └─────────┬────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌──────────────┐
│  LOGIN PAGE   │   │  SIGNUP PAGE  │   │ FORGOT PASS  │
│  (/login)     │   │  (/signup)    │   │ (/forgot...  │
│               │   │               │   │              │
│ - Roll No     │   │ - Form Step   │   │ - Roll No    │
│ - Password    │   │ - OTP Step    │   │ - OTP Step   │
│ - Remember    │   │               │   │ - New Pass   │
└───────┬───────┘   └───────┬───────┘   └──────────────┘
        │                   │
        │                   ▼
        │           ┌─────────────────┐
        │           │ COMPLETE PROF.  │
        │           │ (/profile/      │
        │           │   complete)     │
        │           │                 │
        │           │ - DOB           │
        │           │ - Bio           │
        │           │ - Profile Pic   │
        │           └────────┬────────┘
        │                    │
        └────────────────────┼──────────────────┐
                             │                  │
                             ▼                  │
              ┌──────────────────────────┐      │
              │    DASHBOARD (/dashboard) │◄─────┘
              │  - Users Tab              │
              │  - Groups Tab             │
              │  - Search & Filters       │
              │  - Create Group           │
              └──────────┬────────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────────┐
         │               │               │                  │
         ▼               ▼               ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐
│  CHAT LIST  │  │  MY GROUPS  │  │ MY IDENTITI│  │ EDIT PROFILE │
│  (/chat)    │  │ (/my-groups)│  │ (/my-ident.│  │ (/profile/   │
│             │  │             │  │            │  │   edit)      │
│ - Convos    │  │ - Joined    │  │ - Anon     │  │ - Update Info│
│ - Requests  │  │   Groups    │  │   Personas │  │ - Avatar     │
└─────┬───────┘  └─────┬───────┘  └──────┬─────┘  └──────────────┘
      │                │                 │
      │                │                 │
      ▼                ▼                 │
┌──────────────┐  ┌──────────────┐      │
│  NEW CHAT    │  │ GROUP DETAIL │      │
│ (/chat/new)  │  │ (/groups/    │      │
│              │  │   [id])      │      │
│ - Loading    │  │              │      │
│ - Redirect   │  │ - Info       │      │
└─────┬────────┘  │ - Members    │      │
      │           └─────┬────────┘      │
      │                 │               │
      ▼                 ▼               │
┌──────────────┐  ┌──────────────┐      │
│  1V1 CHAT    │  │  GROUP CHAT  │      │
│ (/chat/[id]) │  │ (/groups/    │      │
│              │  │   [id]/chat) │      │
│ - Messages   │  │              │      │
│ - Input      │  │ - Messages   │      │
│ - Media      │  │ - Polls      │      │
│ - Actions    │  │ - Members    │      │
└──────────────┘  └──────────────┘      │
      │                                 │
      │                                 │
      └─────────────────┬───────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  VIEW PROFILE    │
              │  (/profile/      │
              │    [rollNo])     │
              │                  │
              │ - User Info      │
              │ - Start Chat     │
              │ - Block/Report   │
              └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FOOTER PAGES (All Pages)                      │
├─────────────────┬──────────────────┬─────────────────────────────┤
│  TERMS & COND.  │  PRIVACY POLICY  │  CONTACT DEVELOPERS         │
│  (/terms)       │  (/privacy)      │  (/contact)                 │
└─────────────────┴──────────────────┴─────────────────────────────┘
```

---

## 👤 USER FLOWS

### 1. NEW USER REGISTRATION FLOW

```
START
  │
  ▼
┌─────────────────┐
│  Landing Page   │
│  Click "SIGN UP"│
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│   Signup Page       │
│  Enter:             │
│  - Degree Type      │─── Selected: B.Tech
│  - Roll No (last 5) │─── Entered: 23397
│  - Full Name        │─── Entered: Raj Malik
│  - Gender           │─── Selected: Male
│  - Branch           │─── Entered: CSE
│  - Password         │─── Entered: ********
│  - Confirm Password │─── Entered: ********
│  Click "SIGN UP"    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Backend Process    │
│  1. Validate input  │
│  2. Create roll no  │──► B23397
│  3. Hash password   │
│  4. Create user     │
│  5. Generate OTP    │──► 6-digit code
│  6. Send email      │──► b23397@students.iitmandi.ac.in
│  7. Return success  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  OTP Verification   │
│  "Check your email" │
│  Enter 6-digit OTP  │─── User enters: 123456
│  Click "VERIFY"     │
└────────┬────────────┘
         │
         ▼
    ┌────────┐
    │ Valid? │
    └───┬─┬──┘
        │ │
    NO  │ │  YES
        │ │
        ▼ ▼
┌───────────┐   ┌──────────────────┐
│ Error Msg │   │  Complete Profile│
│ Try Again │   │  Optional:       │
└───────────┘   │  - DOB           │
                │  - Bio           │
                │  - Profile Pic   │
                │  Click "COMPLETE"│
                │  or "SKIP"       │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │    DASHBOARD     │
                │  ✓ Logged In     │
                │  ✓ Verified      │
                │  Browse & Chat   │
                └──────────────────┘
                         │
                         ▼
                       END
```

---

### 2. RETURNING USER LOGIN FLOW

```
START
  │
  ▼
┌─────────────────┐
│  Landing Page   │
│  Click "LOGIN"  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│   Login Page        │
│  Enter:             │
│  - Roll Number      │─── Entered: B23397
│  - Password         │─── Entered: ********
│  Click "LOGIN"      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Backend Process    │
│  1. Find user       │
│  2. Verify password │
│  3. Check verified  │
│  4. Generate JWT    │
│  5. Return token    │
└────────┬────────────┘
         │
         ▼
    ┌────────────┐
    │ Verified?  │
    └───┬───┬────┘
        │   │
    NO  │   │  YES
        │   │
        ▼   ▼
┌──────────────┐  ┌──────────────┐
│ Redirect to  │  │  Store Token │
│ OTP Verify   │  │  Redirect to │
└──────────────┘  │  DASHBOARD   │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  DASHBOARD   │
                  │  Welcome Back│
                  └──────────────┘
                         │
                         ▼
                       END
```

---

### 3. START A REGULAR CHAT FLOW

```
START (User on Dashboard)
  │
  ▼
┌─────────────────────┐
│  Dashboard          │
│  - Users Tab Active │
│  - Search: "John"   │──► Filter results
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Found User Card    │
│  Name: John Doe     │
│  Roll: B23412       │
│  Click "START CHAT" │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Navigate to        │
│  /chat/new?         │
│  userId=xxx         │
│  anonymous=false    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  New Chat Handler   │
│  "Sending request..." │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Backend Check      │
│  1. Both verified?  │
│  2. Blocked?        │─── If YES: Error "Cannot message"
│  3. Existing chat?  │─── If YES: Return conversation ID
│  4. Create request  │─── If NO: Create chat request
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│  Two Scenarios:      │
├──────────────────────┤
│  A) Existing Chat    │──► Redirect to /chat/[conversationId]
│                      │
│  B) New Request      │──► Show "Request sent, awaiting acceptance"
│     (pending)        │    Redirect to /chat (list)
└──────────────────────┘
         │
         │ (Scenario B continues...)
         ▼
┌──────────────────────┐
│  Receiver Side       │
│  1. Gets notification│
│  2. Goes to /chat    │
│  3. Sees "Requests"  │──► Badge shows (1)
│  4. Opens Requests   │
│  5. Sees:            │
│     From: Raj M.     │
│     [ACCEPT] [REJECT]│
└────────┬─────────────┘
         │
         ▼
    ┌─────────┐
    │ Accept? │
    └───┬─┬───┘
        │ │
    NO  │ │  YES
        │ │
        ▼ ▼
┌──────────┐  ┌─────────────────────┐
│ Request  │  │  Backend:            │
│ Deleted  │  │  1. Update status    │
│          │  │  2. Create convo     │
└──────────┘  │  3. Notify sender    │
              │  4. Return convo ID  │
              └────────┬─────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │  Chat Interface     │
              │  /chat/[id]         │
              │  Both can message   │
              └─────────────────────┘
                       │
                       ▼
                     END
```

---

### 4. START AN ANONYMOUS CHAT FLOW

```
START (User on Dashboard)
  │
  ▼
┌──────────────────────┐
│  Dashboard           │
│  Find User           │
│  Click "ANON CHAT" 🎭│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Navigate to         │
│  /chat/new?          │
│  userId=xxx          │
│  anonymous=true      │◄── Key difference
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Backend Process     │
│  1. Create anon ID   │──► UUID for this conversation
│  2. Hide sender info │
│  3. Create convo     │
│  4. Mark as anonymous│
│  5. Store mapping:   │
│     user_id ↔ anon_id│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Anonymous Chat Open │
│  /chat/[id]          │
│                      │
│  SENDER sees:        │
│  - "Chat with John"  │
│  - Normal messages   │
│                      │
│  RECEIVER sees:      │
│  - "Anonymous User"  │
│  - 🎭 icon          │
│  - Generic avatar    │
│  - Messages          │
└────────┬─────────────┘
         │
         │
    ┌────┴────┐
    │ Reveal? │ (Sender's choice)
    └───┬─┬───┘
        │ │
    NO  │ │  YES
        │ │
        ▼ ▼
┌───────────┐  ┌──────────────────────┐
│ Stay Anon │  │  Click "REVEAL" 🎭   │
│ Forever   │  │  Confirm dialog      │
└───────────┘  │  Click again         │
               └────────┬─────────────┘
                        │
                        ▼
               ┌──────────────────────┐
               │  Backend Update      │
               │  1. Set revealed=true│
               │  2. Store timestamp  │
               │  3. Notify receiver  │
               └────────┬─────────────┘
                        │
                        ▼
               ┌──────────────────────┐
               │  System Message      │
               │  "--- Raj Malik      │
               │   revealed their     │
               │   identity ---"      │
               └────────┬─────────────┘
                        │
                        ▼
               ┌──────────────────────┐
               │  Receiver Now Sees:  │
               │  - Real name         │
               │  - Real avatar       │
               │  - Can view profile  │
               │  - Can start own chat│
               └──────────────────────┘
                        │
                        ▼
                      END
```

---

### 5. JOIN & PARTICIPATE IN GROUP FLOW

```
START (User on Dashboard)
  │
  ▼
┌──────────────────────┐
│  Dashboard           │
│  Click "Groups" Tab  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Browse Groups       │
│  - See public groups │
│  - Not member yet    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Select Group        │
│  "IIT Mandi Memes"   │
│  👥 45 members       │
│  [JOIN] [JOIN ANON]  │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │ Choice? │
    └───┬─┬───┘
        │ │
   ANON │ │ REGULAR
        │ │
        ▼ ▼
┌──────────┐  ┌─────────────────────┐
│ Join as  │  │  Join as Self       │
│ Anon     │  │  1. Add to members  │
│ 🎭       │  │  2. Show real name  │
│          │  │  3. Notify group    │
│  Same    │  └────────┬────────────┘
│  process │           │
│  but     │           │
│  hidden  │           │
│  identity│◄──────────┘
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│  Group Added to      │
│  "My Groups"         │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Navigate to:        │
│  /groups/[id]/chat   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Group Chat UI       │
│  ├─ Header           │
│  │  - Group name     │
│  │  - 45 members     │
│  │  - Options ⋮      │
│  ├─ Messages Area    │
│  │  - Past messages  │
│  │  - Member messages│
│  ├─ Input            │
│  │  - Type message   │
│  │  - Emoji, Image   │
│  │  - [SEND]         │
│  └─ Options Menu     │
│     - Create Poll    │
│     - View Members   │
│     - Leave Group    │
└────────┬─────────────┘
         │
         ▼
    ┌─────────┐
    │ Action? │
    └───┬─┬─┬─┘
        │ │ │
        │ │ └────────────┐
        │ │              │
        ▼ ▼              ▼
┌──────────┐ ┌─────────┐ ┌──────────────┐
│ Send Msg │ │ Create  │ │ View Members │
│          │ │ Poll    │ │              │
│ - Type   │ │         │ │ - List       │
│ - Click  │ │ 1. Que? │ │ - Roles      │
│   SEND   │ │ 2. Opts │ │ - Online     │
│          │ │ 3. Post │ │              │
│ Backend: │ │         │ │ Admin can:   │
│ - Validate│ │ Members │ │ - Make admin │
│ - Store  │ │ can vote│ │ - Remove     │
│ - Socket │ │         │ │              │
│   emit   │ └─────────┘ └──────────────┘
│          │
│ All      │
│ members  │
│ receive  │
│ instantly│
└──────────┘
     │
     ▼
   END
```

---

### 6. MANAGE ANONYMOUS IDENTITIES FLOW

```
START (User has created multiple anon chats/groups)
  │
  ▼
┌──────────────────────┐
│  Dashboard           │
│  Click "MY IDENTIT." │
│  🎭                  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  My Identities Page  │
│  /my-identities      │
│                      │
│  Filter tabs:        │
│  [ALL] [CHAT] [GROUP]│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  List of Identities  │
│                      │
│  1. 🎭 Anon #abc123  │
│     Chat with: John  │
│     Created: 2d ago  │
│     [ACTIVE]         │
│     [GO TO CHAT]     │
│     [REVEAL] ← Click │
│                      │
│  2. 🎭 Anon #def456  │
│     Group: Memes     │
│     Created: 5d ago  │
│     [REVEALED] ✓     │
│     [GO TO CHAT]     │
│                      │
│  3. 🎭 Anon #ghi789  │
│     Chat with: Sarah │
│     ...              │
└────────┬─────────────┘
         │
         │ (User clicks REVEAL on #1)
         ▼
┌──────────────────────┐
│  Confirmation Toast  │
│  ⚠️ "Click REVEAL    │
│     again to confirm│
│     This cannot be  │
│     undone!"        │
└────────┬─────────────┘
         │
         │ (Timer: 5 seconds to click again)
         ▼
    ┌─────────┐
    │ Click   │
    │ again?  │
    └───┬─┬───┘
        │ │
    NO  │ │  YES
    (5s)│ │
        │ │
        ▼ ▼
┌──────────┐  ┌─────────────────────┐
│ Timeout  │  │  Reveal Process     │
│ Cancelled│  │  1. Update DB       │
└──────────┘  │  2. Set revealed=   │
              │     true            │
              │  3. Store timestamp │
              │  4. Notify receiver │
              │  5. Update UI       │
              └────────┬────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │  Identity Updated   │
              │  Now shows:         │
              │  [REVEALED] ✓       │
              │  Badge changed      │
              │  Can't unrevealed   │
              └────────┬────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │  In the Chat:       │
              │  System message     │
              │  posted:            │
              │  "Raj Malik         │
              │   revealed their    │
              │   identity"         │
              │                     │
              │  Receiver can now:  │
              │  - See profile      │
              │  - Start own chat   │
              └─────────────────────┘
                       │
                       ▼
                     END
```

---

### 7. BLOCK & REPORT USER FLOW

```
START (User in chat or viewing profile)
  │
  ▼
┌──────────────────────┐
│  Options Menu ⋮      │
│  - View Profile      │
│  - Block User        │◄─ Click this
│  - Report User       │
└────────┬─────────────┘
         │
         ▼
    ┌─────────┐
    │ Which?  │
    └───┬─┬───┘
        │ │
   BLOCK│ │REPORT
        │ │
        ▼ ▼
┌──────────────┐  ┌─────────────────────┐
│ Block Dialog │  │  Report Dialog      │
│              │  │                     │
│ "Block John?"│  │ "Report John Doe"   │
│              │  │                     │
│ Reason:      │  │ Reason dropdown:    │
│ [Textarea]   │  │ - Spam              │
│ (optional)   │  │ - Harassment        │
│              │  │ - Inappropriate     │
│ [CONFIRM]    │  │ - Other             │
│ [CANCEL]     │  │                     │
└──────┬───────┘  │ Details:            │
       │          │ [Textarea]          │
       │          │ (required)          │
       │          │                     │
       │          │ [SUBMIT]            │
       │          │ [CANCEL]            │
       │          └────────┬────────────┘
       │                   │
       │                   ▼
       │          ┌─────────────────────┐
       │          │  Report Submitted   │
       │          │  1. Store report    │
       │          │  2. Notify admins   │
       │          │  3. Thank user      │
       │          │  4. Close dialog    │
       │          └─────────────────────┘
       │                   │
       ▼                   │
┌──────────────────┐       │
│  Block Process   │       │
│  1. Create block │       │
│     record       │       │
│  2. Store reason │       │
│  3. Update perms │       │
│  4. Close chat   │       │
│     (redirect)   │       │
└────────┬─────────┘       │
         │                 │
         ▼                 │
┌──────────────────┐       │
│  Effects:        │       │
│  - Can't message │       │
│  - Chat hidden   │       │
│  - Profile shows │       │
│    "Blocked"     │       │
│  - Can unblock   │       │
│    later         │       │
└────────┬─────────┘       │
         │                 │
         └────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Blocked list    │
        │  accessible in   │
        │  Settings        │
        │                  │
        │  Can UNBLOCK:    │
        │  - Click button  │
        │  - Confirm       │
        │  - Permissions   │
        │    restored      │
        └──────────────────┘
                  │
                  ▼
                END
```

---

### 8. CREATE & MANAGE GROUP FLOW

```
START (User on Dashboard)
  │
  ▼
┌──────────────────────┐
│  Dashboard           │
│  Groups Tab          │
│  Click "CREATE       │
│         GROUP" +     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Create Group Modal  │
│                      │
│  Group Name:         │
│  [Input]             │─── "Study Group CSE 2023"
│                      │
│  Description:        │
│  [Textarea]          │─── "For exam prep..."
│                      │
│  Group Image:        │
│  [📷 Upload]         │─── Click to upload
│                      │
│  Visibility:         │
│  ○ Public            │
│  ● Private           │◄── Selected
│                      │
│  [CREATE] [CANCEL]   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Backend Process     │
│  1. Validate name    │
│  2. Upload image     │──► Cloudinary
│  3. Create group     │
│  4. Set owner        │──► You
│  5. Generate ID      │
│  6. Return group     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Group Created ✓     │
│  Auto-navigate to:   │
│  /groups/[id]        │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Group Details Page  │
│                      │
│  [Group Image]       │
│  Study Group...      │
│  Created by: You     │
│  👥 1 member (you)   │
│  [PRIVATE]           │
│                      │
│  [OPEN CHAT]         │
│  [EDIT GROUP]        │◄── Owner/Admin only
│  [INVITE MEMBERS]    │◄── If private
└────────┬─────────────┘
         │
         │ (As Owner/Admin)
         ▼
┌──────────────────────┐
│  Management Options  │
│                      │
│  1. Edit Details     │
│     - Name, desc     │
│     - Image          │
│     - Public/Private │
│                      │
│  2. Member Mgmt      │
│     For each member: │
│     - View profile   │
│     - Make admin     │◄── Owner only
│     - Remove member  │◄── Admin+
│                      │
│  3. Delete Group     │◄── Owner only
│     (Danger zone)    │
└──────────────────────┘
         │
         ▼
       END
```

---

## 🔄 STATE TRANSITIONS

### User Authentication State

```
┌──────────────┐
│ Not Logged In│
└──────┬───────┘
       │
       │ Login/Signup Success
       ▼
┌──────────────┐
│ Logged In    │
│ (Has Token)  │
└──────┬───────┘
       │
       ├─► Token Valid ──────► Continue session
       │
       ├─► Token Expired ────► Redirect to login
       │
       └─► Logout ───────────► Clear token, redirect
```

### Chat Request State

```
┌──────────────┐
│ No Request   │
└──────┬───────┘
       │
       │ Send Request
       ▼
┌──────────────┐
│ Pending      │───► Timeout (3 days) → Expired
└──────┬───────┘
       │
       ├─► Accept ────► Active Conversation
       │
       └─► Reject ────► Deleted
```

### Anonymous Identity State

```
┌──────────────┐
│ Created      │
│ (Active)     │
└──────┬───────┘
       │
       │ User decides to reveal
       ▼
┌──────────────┐
│ Confirm      │
│ (Pending)    │
└──────┬───────┘
       │
       ├─► Confirm ────► Revealed (permanent)
       │
       └─► Cancel ─────► Back to Active
```

---

## 📊 PAGE RELATIONSHIP DIAGRAM

### Core Page Connections

```
           Dashboard (Hub)
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
Chat List   My Groups   My Identities
    │            │            │
    ▼            ▼            │
1v1 Chat   Group Chat        │
    │            │            │
    └────────────┴────────────┘
                 │
                 ▼
         (All lead back to
          respective chats)
```

### Authentication Flow

```
Landing
   │
   ├─► Signup → OTP → Complete → Dashboard
   │
   └─► Login ──────────────────► Dashboard
```

---

## 🎯 CRITICAL USER PATHS

### Path 1: New User to First Message (Shortest)
```
Signup → OTP → Skip Complete Profile → Dashboard → 
Search User → Start Chat → (Wait for Accept) → 
Open Chat → Type Message → Send

Minimum Steps: 8 user actions
```

### Path 2: Anonymous Chat Creation
```
Login → Dashboard → Find User → Start Anon Chat → 
Chat Opens → Send Message

Minimum Steps: 5 user actions
```

### Path 3: Join and Post in Group
```
Login → Dashboard → Groups Tab → Find Group → 
Join → Open Chat → Send Message

Minimum Steps: 6 user actions
```

---

**Last Updated**: February 28, 2026 [3:30 PM]

