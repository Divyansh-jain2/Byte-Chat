# BYTE-CHAT - Quick Design Reference


## 📄 ALL PAGES AT A GLANCE

| # | Page | Route | Main UI Elements | Key Actions |
|---|------|-------|------------------|-------------|
| 1 | **Landing** | `/` | Nav bar, Hero, Feature cards, Footer | LOGIN, SIGN UP |
| 2 | **Login** | `/login` | Roll number input, Password input, Theme toggle | LOGIN, Forgot password |
| 3 | **Signup** | `/signup` | Multi-step form, Degree dropdown, OTP verification | SIGN UP, VERIFY OTP |
| 4 | **Dashboard** | `/dashboard` | Users/Groups tabs, Search, Filters, User cards, Group cards | START CHAT, JOIN GROUP, CREATE GROUP |
| 5 | **Chat List** | `/chat` | Conversations/Requests tabs, Chat items | ACCEPT/REJECT requests, Open chats |
| 6 | **1v1 Chat** | `/chat/[id]` | Messages, Input field, Emoji picker, Image upload | SEND message, REVEAL IDENTITY, BLOCK |
| 7 | **New Chat Handler** | `/chat/new` | Loading spinner, Status messages | Auto-redirect |
| 8 | **Group Details** | `/groups/[id]` | Group info, Members list, Admin controls | OPEN CHAT, LEAVE GROUP |
| 9 | **Group Chat** | `/groups/[id]/chat` | Messages, Input, Polls section | SEND message, CREATE POLL, VOTE |
| 10 | **My Groups** | `/my-groups` | Group cards with badges | OPEN CHAT, LEAVE |
| 11 | **My Identities** | `/my-identities` | Identity cards, Filter tabs | GO TO CHAT, REVEAL IDENTITY |
| 12 | **Complete Profile** | `/profile/complete` | Image upload, DOB, Bio | COMPLETE PROFILE, SKIP |
| 13 | **Edit Profile** | `/profile/edit` | Form fields, Avatar selector | SAVE CHANGES |
| 14 | **View Profile** | `/profile/[rollNo]` | User info display | START CHAT, BLOCK, REPORT |
| 15 | **Forgot Password** | `/forgot-password` | Roll no, OTP, New password | RESET PASSWORD |
| 16 | **Contact** | `/contact` | Developer cards, Feedback form | SEND MESSAGE |
| 17 | **Terms** | `/terms` | Legal text | Read-only |
| 18 | **Privacy** | `/privacy` | Policy text | Read-only |
| 19 | **Impress Us** | `/impress-us` | TBD | TBD |
| 20 | **Test Supabase** | `/test-supabase` | Dev testing | Dev only |

---

## 🎨 BUTTON INVENTORY

### Primary Buttons
- **SIGN UP** - Landing, Login pages
- **LOGIN** - Landing, Login pages
- **SEND** - Chat interfaces
- **JOIN** - Group cards
- **CREATE** - Create group/poll modals
- **SAVE** - Profile edit forms
- **VERIFY** - OTP verification

### Secondary Buttons
- **BACK** - Navigation
- **CANCEL** - Modals
- **SKIP** - Optional steps

### Action Buttons
- **START CHAT** - User cards
- **START ANON CHAT** - User cards (ghost icon)
- **JOIN AS ANON** - Group cards
- **ACCEPT** / **REJECT** - Chat requests (green/red)
- **OPEN CHAT** - Group cards
- **GO TO CHAT** - Identity cards

### Danger Buttons
- **BLOCK USER** - Profile, chat
- **REPORT USER** - Profile
- **LEAVE GROUP** - Group pages
- **DELETE ACCOUNT** - Settings
- **UNBLOCK** - Moderation

### Icon Buttons
- 🎭 Theme toggle (sun/moon)
- 😀 Emoji picker
- 📷 Image upload
- ⋮ Options menu (three dots)
- ← Back arrow
- ✕ Close/Remove

### Badge Buttons (Status Indicators)
- **PUBLIC** / **PRIVATE** - Green/Orange
- **OWNER** - Purple
- **ADMIN** - Blue
- **ANON** - Gray
- **REVEALED** / **ACTIVE** - Status badges

---

## 📝 FORM ELEMENTS CHECKLIST

### Input Fields
- ✅ Text input (standard)
- ✅ Password input (with show/hide toggle)
- ✅ Textarea (bio, messages, descriptions)
- ✅ Number input (roll number)
- ✅ Date picker (DOB)
- ✅ Search input (with magnifying glass)
- ✅ OTP input (6 digits)

### Dropdowns/Selects
- ✅ Degree type (B.Tech, M.Tech, PhD, etc.)
- ✅ Branch filter
- ✅ Gender filter
- ✅ Report reason dropdown

### Radio/Checkbox
- ✅ Gender selection (Male, Female, Other)
- ✅ Public/Private toggle (groups)

### Upload Components
- ✅ Profile picture upload
- ✅ Group image upload
- ✅ Message image attachment
- ✅ Drag-and-drop areas

---

## 🗂️ CARD COMPONENTS

### User Card (Dashboard)
```
┌─────────────────────────────┐
│  [Avatar]                   │
│                             │
│  Name                       │
│  Roll Number                │
│  [Branch Badge][Gender]     │
│  Bio text...                │
│                             │
│  [START CHAT] [ANON CHAT]   │
└─────────────────────────────┘
```

### Group Card (Dashboard)
```
┌─────────────────────────────┐
│  [Group Image]              │
│                             │
│  Group Name   [PUBLIC]      │
│  Description...             │
│  👥 24 members              │
│                             │
│  [JOIN] [JOIN AS ANON]      │
└─────────────────────────────┘
```

### Chat Item (Chat List)
```
┌─────────────────────────────┐
│ [Avatar] Name/Anonymous     │
│          Last message...  2h│
│          [ANON badge]     [2]│
└─────────────────────────────┘
```

### Identity Card (My Identities)
```
┌─────────────────────────────┐
│  🎭 Anonymous #1234         │
│  Chat with: John Doe        │
│  Created: 2 days ago        │
│  [ACTIVE]                   │
│                             │
│  [GO TO CHAT] [REVEAL]      │
└─────────────────────────────┘
```

---

## 💬 CHAT MESSAGE BUBBLES

### Sent Message (Right-aligned)
```
                    ┌─────────────────┐
                    │ Message text... │
                    │ 12:34 PM ✓✓     │
                    └─────────────────┘
```

### Received Message (Left-aligned)
```
[Avatar] ┌─────────────────┐
         │ Message text... │
         │ 12:34 PM        │
         └─────────────────┘
```

### System Message (Centered)
```
        ───── Anonymous revealed ─────
```

---

## 🎭 MODAL PATTERNS

### Create Group Modal
- Title: "Create New Group"
- Group name input
- Description textarea
- Image upload
- Public/Private toggle
- [CREATE] [CANCEL]

### Create Poll Modal
- Title: "Create Poll"
- Question input
- Option 1, 2, 3... inputs
- [+ Add Option]
- [CREATE POLL] [CANCEL]

### Block User Modal
- Title: "Block [UserName]"
- Reason textarea (optional)
- [CONFIRM] [CANCEL]

### Report User Modal
- Title: "Report [UserName]"
- Reason dropdown
- Details textarea
- [SUBMIT REPORT] [CANCEL]

---

## 📱 RESPONSIVE BREAKPOINTS
## 🔔 NOTIFICATION TYPES

### Toast Notifications
- **Success**: Green background, checkmark icon
- **Error**: Red background, X icon
- **Warning**: Orange background, ! icon
- **Info**: Blue background, i icon

### Badge Counters
- Red circle with white number
- Position: top-right of icon/button

### Status Indicators
- Online: Green dot
- Offline: Gray dot
- Typing: "... is typing" text

---

## 🎯 COMPONENT STATE VARIATIONS

### Button States
1. **Normal**: Default appearance
2. **Hover**: Scale-105, shadow, color change
3. **Active**: Pressed state
4. **Disabled**: Opacity-50, cursor-not-allowed
5. **Loading**: Spinner icon, disabled

### Input States
1. **Normal**: Border-gray
2. **Focus**: Ring-2, ring-blue-500
3. **Error**: Border-red, red text below
4. **Disabled**: Opacity-50, bg-gray
5. **Filled**: Has value (auto-state)

### Card States
1. **Normal**: Default
2. **Hover**: Shadow, scale
3. **Selected**: Blue ring/border
4. **Active/Clicked**: Navigation

---

## 🗺️ NAVIGATION MAP

```
Landing (/)
├─ Login (/login)
│  └─ Dashboard (/dashboard)
│     ├─ Chat List (/chat)
│     │  ├─ 1v1 Chat (/chat/[id])
│     │  └─ New Chat (/chat/new) → redirects
│     ├─ My Groups (/my-groups)
│     ├─ My Identities (/my-identities)
│     ├─ Group Details (/groups/[id])
│     │  └─ Group Chat (/groups/[id]/chat)
│     └─ Profile (/profile/edit)
│        └─ View Profile (/profile/[rollNo])
├─ Signup (/signup)
│  └─ Complete Profile (/profile/complete)
│     └─ Dashboard
├─ Forgot Password (/forgot-password)
├─ Contact (/contact)
├─ Terms (/terms)
└─ Privacy (/privacy)
```

---

## ⚡ KEY USER FLOWS

### 1. New User Journey
```
Landing → Signup → OTP → Complete Profile → Dashboard → Start Chat
```

### 2. Returning User
```
Landing → Login → Dashboard → Chat List → Open Chat
```

### 3. Anonymous Chat Creation
```
Dashboard → Find User → Start Anon Chat → Chat Interface
```

### 4. Group Creation
```
Dashboard → Create Group → Fill Form → Dashboard → My Groups → Open Chat
```

### 5. Identity Reveal
```
My Identities → Select Identity → Reveal (2 clicks) → Chat shows real profile
```

---

## 🎨 SUGGESTED DESIGN IMPROVEMENTS

### Visual Enhancements
1. **Softer design**: Round corners instead of sharp
2. **Better contrast**: Improve readability
3. **Illustrations**: Empty states, onboarding

### UX Improvements
1. **Progress indicators**: Multi-step forms
2. **Skeleton loaders**: Better loading states
3. **Micro-interactions**: Button clicks, transitions
4. **Contextual help**: Tooltips, info icons
5. **Quick actions**: Swipe gestures on mobile

### Accessibility
1. **Focus indicators**: Clear keyboard navigation
2. **Alt text**: All images
3. **ARIA labels**: All interactive elements
4. **Color contrast**: WCAG AA compliance
5. **Screen reader**: Proper semantic HTML


---

**Last Updated**: February 28, 2026 [3:30 PM]
