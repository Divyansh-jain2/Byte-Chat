# BYTE-CHAT - Complete Design Documentation

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project File Structure](#project-file-structure)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Detailed Page Breakdown](#detailed-page-breakdown)
7. [Components Reference](#components-reference)
8. [Services Overview](#services-overview)
9. [Key Features & User Flows](#key-features--user-flows)
10. [Design Considerations](#design-considerations)

---

## 🎯 PROJECT OVERVIEW

**BYTE-CHAT** is a secure, anonymous messaging platform designed exclusively for IIT Mandi students. The application supports:
- One-on-one encrypted chat (regular & anonymous)
- Group messaging with custom avatars
- Anonymous identities management
- User blocking and reporting
- Profile management with customizable avatars
- Real-time messaging via WebSocket
- OTP-based authentication

**Target Audience**: IIT Mandi students (B.Tech, M.Tech, PhD, etc.)

---

## 💻 TECHNOLOGY STACK

### Frontend
- **Framework**: Next.js 14 (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Real-time**: Socket.IO Client
- **Image Handling**: Next/Image, Cloudinary
- **UI Components**: Custom components with emoji-picker-react

### Backend
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + OTP (via Gmail SMTP)
- **Real-time**: Socket.IO
- **File Upload**: Multer + Cloudinary
- **Alternative Auth**: Supabase Auth (optional)

---

## 📁 PROJECT FILE STRUCTURE

```
Byte-Chat/
│
├── README.md                          # Setup instructions
├── avatars/                           # Avatar assets directory
│
├── backend/                           # Backend application
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   # Entry point, Express server setup
│       ├── config/
│       │   └── index.ts               # Environment variables & configuration
│       ├── controllers/               # Request handlers
│       │   ├── auth.controller.ts              # Login, Signup, OTP verification
│       │   ├── auth.controller.supabase.ts     # Supabase authentication
│       │   ├── chat.controller.ts              # 1v1 chat operations
│       │   ├── anonymous-chat.controller.ts    # Anonymous chat logic
│       │   ├── anonymous.controller.ts         # Anonymous identity management
│       │   ├── group.controller.ts             # Group creation, join, leave
│       │   ├── profile.controller.ts           # User profile CRUD
│       │   ├── settings.controller.ts          # User settings
│       │   └── block-report.controller.ts      # Blocking & reporting users
│       ├── lib/
│       │   ├── db.ts                  # Database connection
│       │   ├── prisma.ts              # Prisma client initialization, ignore for now
│       │   └── supabase.ts            # Supabase client
│       ├── middleware/
│       │   ├── auth.middleware.ts              # JWT authentication
│       │   ├── upload.middleware.ts            # Multer file upload handler
│       │   └── verification.middleware.ts      # Profile completion check
│       ├── routes/                    # API route definitions
│       │   ├── auth.routes.ts
│       │   ├── chat.routes.ts
│       │   ├── anonymous-chat.routes.ts
│       │   ├── anonymous.routes.ts
│       │   ├── group.routes.ts
│       │   ├── profile.routes.ts
│       │   ├── settings.routes.ts
│       │   ├── block-report.routes.ts
│       │   └── test.routes.ts
│       ├── scripts/
│       │   ├── run-migration.ts       # Database migration script
│       │   └── seed.ts                # Database seeding
│       ├── socket/
│       │   └── index.ts               # Socket.IO event handlers
│       ├── types/
│       │   ├── auth.types.ts          # Authentication type definitions
│       │   └── chat.types.ts          # Chat type definitions
│       └── utils/
│           ├── avatar.util.ts         # Avatar helper functions
│           ├── cloudinary.util.ts     # Cloudinary upload utilities
│           ├── email.util.ts          # Email sending (OTP)
│           ├── error.util.ts          # Error handling
│           ├── jwt.util.ts            # JWT token generation/verification
│           ├── otp.util.ts            # OTP generation
│           ├── password.util.ts       # Password hashing
│           └── validation.util.ts     # Input validation
│
├── frontend/                          # Frontend application
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── .env                           # Environment variables
│   └── src/
│       ├── middleware.ts              # Next.js middleware for auth
│       ├── app/                       # Next.js App Router pages
│       │   ├── layout.tsx             # Root layout with providers
│       │   ├── page.tsx               # Landing/Home page
│       │   ├── globals.css            # Global styles
│       │   ├── login/
│       │   │   └── page.tsx           # Login page
│       │   ├── signup/
│       │   │   └── page.tsx           # Signup page
│       │   ├── forgot-password/
│       │   │   └── page.tsx           # Password recovery
│       │   ├── dashboard/
│       │   │   └── page.tsx           # Main dashboard (users & groups)
│       │   ├── chat/
│       │   │   ├── page.tsx           # Chat list page
│       │   │   ├── new/
│       │   │   │   └── page.tsx       # New chat request handler
│       │   │   └── [conversationId]/
│       │   │       └── page.tsx       # 1v1 chat interface
│       │   ├── groups/
│       │   │   └── [groupId]/
│       │   │       ├── page.tsx       # Group details
│       │   │       └── chat/
│       │   │           └── page.tsx   # Group chat interface
│       │   ├── my-groups/
│       │   │   └── page.tsx           # User's joined groups
│       │   ├── my-identities/
│       │   │   └── page.tsx           # Anonymous identities management
│       │   ├── profile/
│       │   │   ├── complete/
│       │   │   │   └── page.tsx       # Complete profile after signup
│       │   │   ├── edit/
│       │   │   │   └── page.tsx       # Edit user profile
│       │   │   └── [rollNo]/
│       │   │       └── page.tsx       # View other user's profile
│       │   ├── contact/
│       │   │   └── page.tsx           # Contact developers
│       │   ├── terms/
│       │   │   └── page.tsx           # Terms & Conditions
│       │   ├── privacy/
│       │   │   └── page.tsx           # Privacy Policy
│       │   ├── impress-us/
│       │   │   └── page.tsx           # Special page (likely feedback)
│       │   └── test-supabase/
│       │       └── page.tsx           # Supabase testing page
│       ├── components/
│       │   ├── Avatar.tsx             # User avatar display component
│       │   ├── AvatarSelector.tsx     # Avatar selection grid
│       │   ├── Footer.tsx             # Footer with links
│       │   ├── GroupImageManager.tsx  # Group image upload/management
│       │   ├── ImageUploader.tsx      # Generic image upload component
│       │   ├── ProfileImageManager.tsx # Profile picture manager
│       │   └── ModerationComponents.tsx # Block/report UI components
│       ├── contexts/
│       │   ├── SocketContext.tsx      # Socket.IO context provider
│       │   ├── ThemeContext.tsx       # Dark/Light theme toggle
│       │   └── ToastContext.tsx       # Toast notifications
│       ├── services/
│       │   ├── auth.service.ts        # Authentication API calls
│       │   ├── chat.service.ts        # Chat API calls
│       │   ├── anonymous-chat.service.ts # Anonymous chat API
│       │   ├── anonymous.service.ts   # Anonymous identity API
│       │   ├── group.service.ts       # Group operations API
│       │   ├── image.service.ts       # Image upload/fetch API
│       │   └── moderation.service.ts  # Block/report API
│       ├── types/
│       │   ├── auth.types.ts          # Auth-related TypeScript types
│       │   └── chat.types.ts          # Chat-related TypeScript types
│       └── utils/
│           ├── avatar.utils.ts        # Avatar utility functions
│           └── supabase/              # Supabase utilities
│
├── Ideas-Visuals/                     # Design ideas & mockups
│
└── mineWork/                          # Developer notes & documentation
    ├── -1-Debugs.txt                  # No need to worry about what these are
    ├── -1-Schema.txt
    ├── -2-CurrTables.sql
    ├── 0-1stTable.sql
    ├── 0-MyData.sql
    ├── 1-MyWork.txt
    ├── 2-MyAuths.txt
    ├── 3-MyProf.txt
    ├── 4-MyChat.txt
    ├── Did.md
    ├── Do.md
    ├── Features
    └── tables.txt
```

---

## 🔧 BACKEND ARCHITECTURE

### Controllers (Request Handlers)
Each controller handles specific business logic for different features:

1. **auth.controller.ts** (150-200 lines)
   - Handles user signup with OTP generation
   - User login with JWT token generation
   - OTP verification for new accounts
   - Password reset flow

2. **auth.controller.supabase.ts** (100-150 lines)
   - Alternative authentication using Supabase
   - Social login integration
   - Session management

3. **chat.controller.ts** (200-300 lines)
   - Send/receive messages in 1v1 conversations
   - Send chat requests to other users
   - Accept/reject incoming chat requests
   - Fetch conversation history & message list

4. **anonymous-chat.controller.ts** (200-250 lines)
   - Create anonymous conversations
   - Manage anonymous messaging
   - Reveal identity feature

5. **anonymous.controller.ts** (150-200 lines)
   - Create and manage anonymous identities
   - List user's anonymous personas
   - Identity reveal logic

6. **group.controller.ts** (300-400 lines)
   - Create new groups (public/private)
   - Join/leave groups
   - Manage group members and admins
   - Send/receive group messages
   - Group polls creation and voting

7. **profile.controller.ts** (200-250 lines)
   - Get user profile details
   - Update profile (name, bio, DOB, avatar)
   - Complete profile after signup
   - List all users with filters

8. **settings.controller.ts** (100-150 lines)
   - User preferences management
   - Privacy settings
   - Notification settings

9. **block-report.controller.ts** (150-200 lines)
   - Block/unblock users
   - Report users with reason
   - View blocked users list

### Middleware
1. **auth.middleware.ts**: Verify JWT tokens, attach user to request
2. **upload.middleware.ts**: Handle file uploads with Multer
3. **verification.middleware.ts**: Check if user profile is complete

### Socket Events (Real-time Communication)
Located in `socket/index.ts`:
- `join-conversation`: User joins a chat room
- `send-message`: Send real-time message
- `typing`: Typing indicator
- `new-message`: Receive message event
- `join-group`: Join group chat room
- `new-group-message`: Group message broadcast
- `new-poll`: Poll creation notification
- `poll-vote`: Poll voting update

---

## 🎨 FRONTEND ARCHITECTURE

### Pages (21 Total Routes)

#### **1. Landing Page** (`app/page.tsx`)
- **Purpose**: First page visitors see, marketing/introduction
- **UI Elements**:
  - Navigation bar with logo "[BYTE-CHAT]"
  - LOGIN button
  - SIGN UP button (primary CTA)
  - Hero section with large heading "BYTE-CHAT"
  - Tagline: "WHERE EVERY BYTE IS HASHED"
  - Description about secure messaging for IIT Mandi
  - "GET STARTED →" button
  - Three feature cards:
    1. END-TO-END ENCRYPTED (lock icon)
    2. LIGHTNING FAST (bolt icon)
    3. GROUP CHAT (users icon)
  - Footer component

#### **2. Login Page** (`app/login/page.tsx`)
- **Purpose**: User authentication
- **UI Elements**:
  - Theme toggle button (light/dark mode) - top right
  - Logo/title: "Welcome Back"
  - Subtitle: "BYTE-CHAT · IIT Mandi"
  - Roll Number input field (uppercase, e.g., B23397)
  - Password input field with show/hide toggle button
  - Error message display area (red background)
  - LOGIN button (primary)
  - "Forgot Password?" link
  - "Don't have an account? Sign up" link
  - Footer with terms/privacy links

#### **3. Signup Page** (`app/signup/page.tsx`)
- **Purpose**: New user registration
- **UI Elements**:
  - Theme toggle button
  - Two-step process:
    
    **Step 1 - Registration Form**:
    - Heading: "Create Account"
    - Degree type dropdown (B.Tech, M.Tech, PhD, etc.)
    - Roll number input (last 5 digits)
    - Full name input
    - Gender radio buttons (Male, Female, Other)
    - Branch input
    - Password input with show/hide toggle
    - Confirm password input with show/hide toggle
    - SIGN UP button
    - "Already have account? Login" link
    
    **Step 2 - OTP Verification**:
    - Heading: "Verify Your Email"
    - OTP sent message with email display
    - 6-digit OTP input field
    - VERIFY button
    - Resend OTP link
    - Error/success messages

#### **4. Dashboard Page** (`app/dashboard/page.tsx`)
- **Purpose**: Main hub after login - browse users & groups
- **UI Elements**:
  - Header bar:
    - Title: "[BYTE-CHAT]"
    - MY GROUPS button
    - MY IDENTITIES button
    - MY CHATS button
    - PROFILE button
    - LOGOUT button
    - Theme toggle
  
  - Tab switcher:
    - USERS tab
    - GROUPS tab
  
  - Search bar (magnifying glass icon)
  
  - Filters section:
    - Branch filter dropdown
    - Gender filter dropdown
    - CLEAR FILTERS button
  
  - CREATE GROUP button (+ icon)
  
  - **User Cards Grid** (when Users tab active):
    - Each card shows:
      - User avatar/profile picture
      - Name
      - Roll number
      - Branch badge
      - Gender badge
      - Bio snippet
      - START CHAT button
      - START ANON CHAT button (ghost icon)
  
  - **Group Cards Grid** (when Groups tab active):
    - Each card shows:
      - Group image
      - Group name
      - Description
      - Member count
      - PUBLIC/PRIVATE badge
      - JOIN button
      - JOIN AS ANON button
  
  - **Create Group Modal** (when CREATE GROUP clicked):
    - Group name input
    - Description textarea
    - Upload group image button
    - Public/Private toggle switch
    - CREATE button
    - CANCEL button

#### **5. Chat List Page** (`app/chat/page.tsx`)
- **Purpose**: Show all active conversations
- **UI Elements**:
  - Header:
    - Title: "Messages"
    - 🎭 IDENTITIES button
    - BACK TO HOME button
  
  - Tabs:
    - "Conversations" tab with count badge
    - "Requests" tab with count badge (red notification dot)
  
  - **Conversations List**:
    - Each conversation item shows:
      - Avatar (user or anonymous icon)
      - Name or "Anonymous User"
      - Last message preview
      - Timestamp
      - Unread badge (if applicable)
      - ANON label (if anonymous chat)
  
  - **Requests List**:
    - Each request shows:
      - Sender avatar
      - Sender name
      - Request timestamp
      - ACCEPT button (green)
      - REJECT button (red)
      - View as ANON option
  
  - Empty state message: "No conversations yet"

#### **6. 1v1 Chat Interface** (`app/chat/[conversationId]/page.tsx`)
- **Purpose**: One-on-one messaging
- **UI Elements**:
  - Header:
    - Back arrow button
    - Recipient avatar
    - Recipient name or "Anonymous User"
    - Online status indicator (green/gray dot)
    - Options menu (three dots):
      - 🎭 REVEAL IDENTITY (if anonymous)
      - VIEW PROFILE
      - BLOCK USER
      - REPORT USER
  
  - Messages area:
    - Message bubbles (left for received, right for sent)
    - Each message shows:
      - Avatar (if not own message)
      - Message text
      - Image (if sent)
      - Emoji reactions
      - Timestamp
      - Read status (double checkmark)
    - "Anonymous revealed" system message
    - Date separators
  
  - Input area:
    - Emoji picker button
    - Text input field
    - Image attachment button
    - SEND button (paper plane icon)
    - Typing indicator: "... is typing"
  
  - Image preview (when image selected):
    - Preview thumbnail
    - Remove image (X button)
  
  - Blocked state message (if user is blocked)

#### **7. New Chat Handler** (`app/chat/new/page.tsx`)
- **Purpose**: Process new chat requests (loading state)
- **UI Elements**:
  - Loading spinner
  - Status messages:
    - "Sending chat request..."
    - "Request sent! Redirecting..."
    - "Error: [message]"
  - RETRY button (on error)
  - BACK TO DASHBOARD button

#### **8. Group Details Page** (`app/groups/[groupId]/page.tsx`)
- **Purpose**: View group information
- **UI Elements**:
  - Group cover image
  - Group name
  - Group description
  - Member count
  - PUBLIC/PRIVATE badge
  - OWNER/ADMIN badges (if applicable)
  - CHAT button (go to group chat)
  - LEAVE GROUP button
  - Members list:
    - Each member shows:
      - Avatar
      - Name or "Anonymous Member"
      - OWNER/ADMIN/MEMBER badge
      - MAKE ADMIN button (if owner)
      - REMOVE button (if admin)
  - Invite link (if public)
  - EDIT GROUP button (if admin/owner)

#### **9. Group Chat Interface** (`app/groups/[groupId]/chat/page.tsx`)
- **Purpose**: Group messaging
- **UI Elements**:
  - Header:
    - Back button
    - Group avatar
    - Group name
    - Member count
    - Options menu:
      - GROUP INFO
      - CREATE POLL
      - VIEW POLLS
      - LEAVE GROUP
  
  - Messages area:
    - Each message shows:
      - Sender avatar
      - Sender name or "Anonymous"
      - Message text
      - Image (if any)
      - Emoji reactions
      - Timestamp
    - System messages (join/leave notifications)
  
  - Input area (same as 1v1):
    - Emoji button
    - Text input
    - Image button
    - SEND button
  
  - **Create Poll Modal**:
    - Poll question input
    - Option 1 input
    - Option 2 input
    - Add option button (+)
    - CREATE POLL button
    - CANCEL button
  
  - **Polls Section**:
    - Poll question
    - Vote options with vote counts
    - Vote buttons
    - Results bar chart
    - "You voted for [option]" indicator
    - Total votes count

#### **10. My Groups Page** (`app/my-groups/page.tsx`)
- **Purpose**: List groups user has joined
- **UI Elements**:
  - Header:
    - Title: "[MY GROUPS]"
    - 🎭 IDENTITIES button
    - ← BACK button
  
  - Group cards grid:
    - Each card shows:
      - Group image
      - Group name (uppercase)
      - PUBLIC/PRIVATE badge
      - OWNER badge (if owner)
      - ADMIN badge (if admin)
      - ANON badge (if joined anonymously)
      - Member count
      - Last activity timestamp
      - OPEN CHAT button
      - VIEW DETAILS button
      - LEAVE button (red)
  
  - Empty state: "NO GROUPS YET" + BROWSE GROUPS button

#### **11. My Identities Page** (`app/my-identities/page.tsx`)
- **Purpose**: Manage anonymous personas
- **UI Elements**:
  - Header:
    - Title: "My Anonymous Identities 🎭"
    - Description
    - Theme toggle
    - BACK button
  
  - Filter tabs:
    - ALL
    - CHAT (with count badge)
    - GROUP (with count badge)
  
  - Identity cards:
    - Each card shows:
      - Anonymous avatar/placeholder
      - Context: "Chat with [Name]" or "Group: [Name]"
      - Created timestamp
      - REVEALED/ACTIVE status badge
      - GO TO CHAT button
      - REVEAL IDENTITY button (if not revealed)
        - Click once: "Click again to confirm"
        - Click twice: Reveals identity permanently
  
  - Empty state: "No anonymous identities"

#### **12. Profile Complete Page** (`app/profile/complete/page.tsx`)
- **Purpose**: Fill additional details after signup
- **UI Elements**:
  - Theme toggle
  - Heading: "Complete Your Profile"
  - Profile picture upload area:
    - Upload button
    - Image preview
    - REMOVE IMAGE button
  - Date of birth picker
  - Bio textarea (max 200 characters)
  - COMPLETE PROFILE button
  - SKIP FOR NOW link
  - Error messages

#### **13. Edit Profile Page** (`app/profile/edit/page.tsx`)
- **Purpose**: Update user information
- **UI Elements**:
  - Current profile picture
  - CHANGE PICTURE button
  - Avatar selector grid (preset avatars)
  - Name input
  - Bio textarea
  - DOB input
  - Branch input
  - Gender display (read-only)
  - Roll number display (read-only)
  - SAVE CHANGES button
  - CANCEL button
  - DELETE ACCOUNT button (danger zone)
  - Success/error toast notifications

#### **14. View Profile Page** (`app/profile/[rollNo]/page.tsx`)
- **Purpose**: View other user's public profile
- **UI Elements**:
  - Back button
  - Profile picture
  - Name
  - Roll number
  - Branch badge
  - Gender badge
  - Bio
  - Member since date
  - START CHAT button
  - START ANON CHAT button
  - BLOCK USER button
  - REPORT USER button
  - "This user is blocked" message (if blocked)

#### **15. Forgot Password Page** (`app/forgot-password/page.tsx`)
- **Purpose**: Password reset request
- **UI Elements**:
  - Theme toggle
  - Heading: "Reset Password"
  - Roll number input
  - SEND OTP button
  - OTP input (after OTP sent)
  - New password input
  - Confirm password input
  - RESET PASSWORD button
  - Back to login link
  - Success/error messages

#### **16. Contact Page** (`app/contact/page.tsx`)
- **Purpose**: Developer contact information
- **UI Elements**:
  - Header
  - "Contact Developers" heading
  - Developer cards:
    - Photo
    - Name
    - Role
    - Email link
    - GitHub link
    - LinkedIn link
  - Feedback form:
    - Name input
    - Email input
    - Message textarea
    - SEND MESSAGE button
  - Footer

#### **17. Terms & Conditions Page** (`app/terms/page.tsx`)
- **Purpose**: Legal terms document
- **UI Elements**:
  - Header
  - Title: "Terms & Conditions"
  - Last updated date
  - Numbered sections with legal text
  - Footer

#### **18. Privacy Policy Page** (`app/privacy/page.tsx`)
- **Purpose**: Privacy policy document
- **UI Elements**:
  - Header
  - Title: "Privacy Policy"
  - Last updated date
  - Sections covering data collection, usage, etc.
  - Footer

#### **19. Impress Us Page** (`app/impress-us/page.tsx`)
- **Purpose**: Special feature (feedback/showcase?)
- **Note**: Requires inspection to document UI elements

#### **20. Test Supabase Page** (`app/test-supabase/page.tsx`)
- **Purpose**: Testing Supabase integration
- **Note**: Likely development/testing page

---

## 🧩 COMPONENTS REFERENCE

### **1. Avatar.tsx**
Displays user profile pictures with fallback to default gender-based avatars.

**Props**:
- `dpUrl`: User's profile picture URL
- `gender`: User's gender (for fallback avatar)
- `name`: User's name
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `showOnlineStatus`: Boolean
- `isOnline`: Boolean

**Variants**:
- `Avatar`: Regular user avatar
- `GroupAvatar`: Group avatar with name-based placeholder
- `AvatarWithName`: Avatar with name label

**UI Features**:
- Circular avatar image
- 2px border
- Online status indicator (green/gray dot)
- Fallback to default avatar on error

---

### **2. AvatarSelector.tsx**
Grid of preset avatars for user selection.

**Props**:
- `currentAvatarUrl`: Currently selected avatar
- `onSelect`: Callback function when avatar clicked
- `isLoading`: Loading state

**UI Features**:
- Heading: "Choose a Preset Avatar"
- Avatar count display
- Scrollable grid (max-height: 96)
- 5-8 avatars per row (responsive)
- Selected avatar: blue ring, scale-105, checkmark overlay
- Hover states: scale-105, ring color change
- Info text at bottom

---

### **3. Footer.tsx**
Common footer for pages.

**UI Elements**:
- Brand name: "BYTE-CHAT"
- Copyright: "© 2026 All rights reserved"
- Links:
  - Terms & Conditions
  - Privacy Policy
  - Contact Developers
- Additional text: "For students, by students"

---

### **4. GroupImageManager.tsx**
Upload and manage group images.

**UI Features**:
- Current group image display
- Upload new image button
- Image preview
- Cropping tool (optional)
- SAVE button
- REMOVE IMAGE button
- Loading spinner during upload
- Success/error messages

---

### **5. ImageUploader.tsx**
Generic image upload component.

**Props**:
- `onUpload`: Callback with uploaded URL
- `maxSize`: Max file size in MB
- `acceptedTypes`: Accepted file types

**UI Features**:
- Drag-and-drop area
- "Click to upload" text
- File type/size restrictions
- Upload progress bar
- Preview thumbnail
- Error messages

---

### **6. ProfileImageManager.tsx**
Profile picture upload and management.

**UI Features**:
- Current profile picture
- Upload button
- Preset avatar selector (opens AvatarSelector)
- Remove picture button
- Preview before save
- SAVE / CANCEL buttons

---

### **7. ModerationComponents.tsx**
Contains multiple moderation-related components.

**a. BlockUserButton**:
- Props: `userId`, `userName`, `isBlocked`, `onBlockStatusChange`
- UI:
  - BLOCK USER button (red)
  - UNBLOCK USER button (green, if blocked)
  - Block reason dialog modal:
    - Heading: "Block [userName]"
    - Reason textarea
    - CONFIRM button
    - CANCEL button

**b. ReportUserButton**:
- Props: `userId`, `userName`
- UI:
  - REPORT USER button
  - Report dialog modal:
    - Heading: "Report [userName]"
    - Reason dropdown (Spam, Harassment, Inappropriate, Other)
    - Additional details textarea
    - SUBMIT REPORT button
    - CANCEL button

**c. BlockedUsersList**:
- UI:
  - List of blocked users
  - Each item:
    - Avatar
    - Name
    - Blocked date
    - UNBLOCK button

---

## 🔌 SERVICES OVERVIEW

All services in `frontend/src/services/` handle API communication with the backend.

### **auth.service.ts**
- `signup(data)`: Register new user
- `verifyOTP(data)`: Verify OTP code
- `login(data)`: User login
- `logout()`: User logout
- `forgotPassword(rollNo)`: Request password reset
- `resetPassword(data)`: Reset with OTP

### **chat.service.ts**
- `getConversations()`: Fetch user's chats
- `sendChatRequest(userId)`: Request to chat
- `respondToChatRequest(requestId, response)`: Accept/reject
- `getChatRequests()`: Fetch pending requests
- `getMessages(conversationId)`: Get conversation messages
- `sendMessage(conversationId, message)`: Send message

### **anonymous-chat.service.ts**
- `createAnonymousConversation(userId)`: Start anon chat
- `getAnonymousConversations()`: Fetch anon chats
- `revealIdentity(conversationId)`: Reveal self

### **anonymous.service.ts**
- `getMyAnonymousIdentities()`: List user's anon personas
- `revealAnonymousIdentity(identityId)`: Reveal specific identity

### **group.service.ts**
- `createGroup(data)`: Create new group
- `getPublicGroups()`: Browse public groups
- `getMyGroups()`: User's joined groups
- `joinGroup(groupId, isAnonymous)`: Join group
- `leaveGroup(groupId)`: Leave group
- `getGroupDetails(groupId)`: Fetch group info
- `sendGroupMessage(groupId, message)`: Send message
- `createPoll(groupId, poll)`: Create poll
- `votePoll(pollId, optionId)`: Vote on poll

### **image.service.ts**
- `uploadImage(file)`: Upload to Cloudinary
- `getUserAvatar(dpUrl, gender)`: Get avatar URL
- `getGroupAvatar(groupDpUrl, groupName)`: Get group image

### **moderation.service.ts**
- `blockUser(userId, reason)`: Block user
- `unblockUser(userId)`: Unblock user
- `reportUser(userId, reason, details)`: Report user
- `getBlockedUsers()`: List blocked users

---

## 🎯 KEY FEATURES & USER FLOWS

### **1. User Registration & Login Flow**
1. User visits landing page
2. Clicks SIGN UP → Goes to signup page
3. Fills form (degree, roll no, name, gender, branch, password)
4. Submits → OTP sent to IIT Mandi email
5. Enters OTP → Account created
6. Redirected to Complete Profile page
7. Adds DOB, bio, profile picture
8. Redirected to Dashboard

### **2. Starting a Chat Flow**
**Regular Chat:**
1. User on Dashboard, Users tab
2. Searches/filters for user
3. Clicks START CHAT
4. Chat request sent
5. Recipient sees request in Chat → Requests tab
6. Recipient accepts
7. Chat opens, both can message

**Anonymous Chat:**
1. Same as above but clicks START ANON CHAT
2. User's identity hidden to recipient
3. Shows as "Anonymous User"
4. User can reveal identity later

### **3. Group Chat Flow**
1. User browses Groups tab on Dashboard
2. Clicks JOIN on a group (or JOIN AS ANON)
3. Group added to My Groups
4. User clicks OPEN CHAT
5. Group chat interface opens
6. Send messages, create polls, vote

### **4. Anonymous Identity Management**
1. User creates multiple anon chats/groups
2. Goes to My Identities page
3. Sees all anonymous personas
4. Can navigate to each chat
5. Can reveal identity (2-click confirmation)
6. Once revealed, cannot unrevealed

---

## 🎨 DESIGN CONSIDERATIONS
When redesigning, consider:
  1. **Color Palette**
  2. **Typography Scale**
  3. **Spacing System**
  4. **Component Library**
  5. **Iconography**
  6. **Animations/Transitions**
  7. **Responsive Breakpoints**
  8. **Accessibility**

---

## 📊 UI COMPONENTS INVENTORY

### **Buttons**
Used throughout the app with various styles:
- Primary CTA (SIGN UP, LOGIN, SEND, etc.)
- Secondary (BACK, CANCEL)
- Danger (BLOCK, DELETE, LEAVE GROUP)
- Icon buttons (emoji picker, image upload, theme toggle)
- Badge buttons (ADMIN, OWNER, ANON)

### **Form Elements**
- Text inputs (name, roll no, etc.)
- Password inputs with show/hide toggle
- Textareas (bio, message, report reason)
- Dropdowns (degree, branch, gender, filters)
- Radio buttons (gender selection)
- Checkboxes (terms acceptance, settings)
- Toggle switches (public/private, dark mode)
- Date pickers (DOB)

### **Cards**
- User cards (dashboard)
- Group cards (dashboard, my groups)
- Message cards (chat list)
- Identity cards (my identities)
- Feature cards (landing page)

### **Modals/Dialogs**
- Create group modal
- Create poll modal
- Block user dialog
- Report user dialog
- Confirm action dialogs
- Image preview modal

### **Navigation**
- Top navigation bar
- Tabs (Users/Groups, Conversations/Requests, etc.)
- Back buttons
- Breadcrumbs (potentially)

### **Notifications**
- Toast messages (success, error, warning, info)
- Badge counters (unread messages, pending requests)
- Online status indicators

### **Media**
- Avatars (circular, various sizes)
- Group images
- Message images
- Image upload areas

### **Lists**
- Conversation list
- Chat request list
- Group member list
- Blocked users list
- Messages in chat

---

## 📱 RESPONSIVE DESIGN NOTES

### Pages with Grid Layouts:
- Dashboard user/group cards: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
- Avatar selector: 5-8 cols depending on screen size
- My Groups: 1 col → 2 cols → 3 cols

### Mobile-Specific Considerations:
- Hamburger menu for navigation (not currently implemented)
- Bottom navigation bar (potential addition)
- Simplified header on mobile
- Stacked form fields
- Full-width modals on mobile

---

## 🔐 SECURITY & PRIVACY FEATURES

### User Controls:
- **Block users**: Prevent specific users from messaging
- **Report users**: Flag inappropriate behavior
- **Anonymous mode**: Hide identity in chats
- **Reveal identity**: Option to disclose identity in anon chats

### Data Protection:
- JWT authentication
- OTP verification
- End-to-end encryption messaging (claimed feature)
- Secure file uploads via Cloudinary

---

## 🚀 FUTURE DESIGN OPPORTUNITIES

Based on the current structure, consider designing for:

1. **Unimplemented Features**:
   - Voice messages
   - Video calls
   - Typing indicators (partially implemented)
   - Read receipts
   - Message reactions
   - Search within conversations
   - Pin important messages
   - Archive conversations

2. **Enhanced UX**:
   - Dark mode improvements
   - Custom themes
   - Notification preferences
   - Keyboard shortcuts
   - Quick actions menu
   - Swipe gestures (mobile)

3. **New Sections**:
   - User settings page (more comprehensive)
   - Help/FAQ page
   - Onboarding tutorial
   - User statistics/activity
   - Group analytics (for owners)

---

## 📝 FINAL NOTES FOR DESIGN TEAM

### What to Focus On:

1. **Visual Identity**:
   - Move away from brutalist/mono style to something more modern
   - Create a cohesive color scheme
   - Design custom icons/illustrations

2. **User Experience**:
   - Simplify complex flows (e.g., anonymous chat creation)
   - Improve visual hierarchy
   - Better empty states
   - Loading states for all async actions

3. **Consistency**:
   - Unified button styles
   - Consistent spacing
   - Same input field designs
   - Matching card layouts

4. **Mobile-First** (web based but touch sensitive):
   - Since target is students, optimize for mobile
   - Touch-friendly button sizes
   - Easy one-handed navigation

5. **Branding** (optional, if you idiots consider to change name or anything else):
   - Logo design for "[BYTE-CHAT]"
   - App icon
   - Splash screen
   - Email templates (for OTP)

---

**Last Updated**: February 28, 2026 [3:30 PM]
