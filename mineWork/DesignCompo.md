# BYTE-CHAT - UI Component Specifications

> **Component specs** for developers and designers. This document details the exact specifications for each UI component to ensure consistency between design and implementation.

---

## 📐 COMPONENT SPECIFICATIONS

### 1. BUTTONS

#### Primary Button
**Usage**: Main actions (Login, Send, Create, Save)

```css
Properties:
- Padding: 24px 40px (py-6 px-10)
- Font: Bold, Mono
- Font Size: 16px (text-base) to 18px (text-lg)
- Background: Black (dark: White)
- Text Color: White (dark: Black)
- Border: 4px solid Black (dark: White)
- Border Radius: 0px (sharp corners)
- Hover: shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
- Transition: all 200ms

States:
- Normal: As above
- Hover: Shadow appears, slight transform
- Active: Shadow reduces
- Disabled: Opacity 50%, cursor not-allowed
- Loading: Spinner replaces text
```

#### Secondary Button
**Usage**: Back, Cancel actions

```css
Properties:
- Padding: 16px 24px (py-4 px-6)
- Font: Bold, Mono
- Font Size: 14px (text-sm)
- Background: Transparent or Light Gray
- Text Color: Black (dark: White)
- Border: 2px solid Black (dark: White)
- Hover: Background lightens/darkens slightly
```

#### Danger Button
**Usage**: Delete, Block, Leave

```css
Properties:
- Same as Primary but:
- Background: Red-600 (dark: Red-800)
- Border: Red-600 (dark: Red-800)
- Text: White
- Hover: Background Red-700/Red-900
```

#### Icon Button
**Usage**: Emoji picker, Image upload, Theme toggle

```css
Properties:
- Size: 40px × 40px (w-10 h-10)
- Icon Size: 20px (w-5 h-5)
- Background: Transparent or Light Background
- Border: 2px solid (optional)
- Border Radius: 50% (rounded-full) or 4px
- Hover: Background opacity, scale 105%
```

---

### 2. INPUT FIELDS

#### Text Input
**Usage**: Name, Roll Number, etc.

```css
Properties:
- Width: 100% (w-full)
- Height: 48px (h-12)
- Padding: 12px 16px (py-3 px-4)
- Font: Mono, 16px
- Background: White/Gray-50 (dark: Gray-800)
- Border: 1px solid Gray-300 (dark: Gray-600)
- Border Radius: 12px (rounded-xl) OR 0px (sharp)
- Focus: Ring 2px Blue-500

States:
- Normal: Gray border
- Focus: Blue ring, no border color change
- Error: Red border, red ring
- Disabled: Gray background, opacity 50%
- Filled: No visual change (system handles)

Label:
- Font: Semi-bold, 14px (text-sm)
- Color: Gray-700 (dark: Gray-300)
- Margin Bottom: 8px (mb-2)

Helper Text:
- Font: 12px (text-xs)
- Color: Gray-500 (dark: Gray-400)
- Margin Top: 4px (mt-1)
```

#### Password Input
**Same as Text Input** + 

```css
Additional:
- Show/Hide Toggle Button:
  - Position: Absolute right, center vertically
  - Size: 20px icon
  - Color: Gray-500
  - Hover: Gray-700
  - Icons: Eye (show) / Eye-slash (hide)
```

#### Textarea
**Usage**: Bio, Message, Description

```css
Properties:
- Width: 100%
- Min Height: 96px (min-h-24)
- Padding: 12px 16px
- Font: Mono, 16px
- Resize: Vertical only (resize-y)
- Other: Same as Text Input

Character Counter (if max length):
- Position: Bottom right, inside padding
- Font: 12px
- Color: Gray-400
- Format: "45/200"
```

#### Dropdown/Select
**Usage**: Degree type, Branch, Gender

```css
Properties:
- Same as Text Input
- Icon: Chevron down (right side)
- Chevron: 16px, Gray-400

Dropdown Menu:
- Background: White (dark: Gray-800)
- Border: 1px Gray-300
- Shadow: lg
- Border Radius: 8px
- Max Height: 300px (overflow scroll)

Option Item:
- Padding: 12px 16px
- Hover: Background Gray-100 (dark: Gray-700)
- Selected: Background Blue-50, Blue text
```

---

### 3. CARDS

#### User Card (Dashboard)
**Dimensions**: Variable width, auto height

```css
Properties:
- Background: White (dark: Black)
- Border: 4px solid Black (dark: White)
- Padding: 24px (p-6)
- Hover: Shadow [8px_8px_0px_0px_rgba(0,0,0,1)]
- Transition: Shadow 200ms

Layout (Top to Bottom):
1. Avatar: 64px (w-16 h-16), centered
2. Name: text-xl, font-bold, text-center, mb-1
3. Roll Number: text-sm, gray, text-center, mb-2
4. Badges: Flex row, gap-2, justify-center, mb-3
   - Branch Badge: See Badge specs
   - Gender Badge: See Badge specs
5. Bio: text-sm, gray, 2 lines max, ellipsis, mb-4
6. Actions: Flex row, gap-2
   - START CHAT button (full spec above)
   - ANON CHAT button (icon + text)
```

#### Group Card (Dashboard)
**Similar to User Card**

```css
Layout Differences:
1. Group Image: 128px × 128px, full width, mb-4
2. Group Name + Badge: Flex row, justify-between
3. Description: 3 lines max
4. Member Count: Icon + "24 members"
5. Actions: JOIN, JOIN AS ANON
```

#### Chat Item (List)
**Full width, fixed height**

```css
Properties:
- Height: 72px
- Padding: 12px 16px
- Border Bottom: 1px Gray-200
- Hover: Background Gray-50 (dark: Gray-900)
- Active (selected): Background Blue-50, Blue border left 4px

Layout:
├─ Avatar (left): 48px
├─ Content (middle, flex-1):
│  ├─ Name + Time (flex row, justify-between)
│  │  ├─ Name: font-semibold
│  │  └─ Time: text-xs, gray
│  └─ Last Message: text-sm, gray, 1 line, ellipsis
└─ Meta (right):
   ├─ Unread Badge (if >0)
   └─ ANON Badge (if applicable)
```

---

### 4. AVATARS

#### Standard Avatar
**Usage**: User profiles

```css
Sizes:
- sm: 32px (w-8 h-8)
- md: 48px (w-12 h-12)
- lg: 64px (w-16 h-16)
- xl: 96px (w-24 h-24)

Properties:
- Border Radius: 50% (rounded-full)
- Border: 2px solid Gray-200
- Object Fit: Cover
- Background: Gray-200 (while loading)

Online Status Indicator:
- Size: 8px (sm), 12px (md), 16px (lg/xl)
- Position: Absolute, bottom-right
- Border: 2px White
- Border Radius: 50%
- Colors: Green-500 (online), Gray-400 (offline)
```

#### Group Avatar
**Same as standard** but:
- Fallback: UI-avatars.com with group name
- Background: Random color from group name hash

---

### 5. BADGES

#### Status Badge
**Usage**: Public, Private, Owner, Admin, Anon

```css
Properties:
- Padding: 4px 8px (py-1 px-2)
- Font: Bold, Mono, 12px (text-xs), Uppercase
- Border: 2px solid matching color
- Border Radius: 0px OR 4px

Color Variants:
- Public: bg-green-200, text-green-900, border-green-900
  (dark: bg-green-800, text-green-100, border-green-100)
- Private: Orange variants
- Owner: Purple variants
- Admin: Blue variants
- Anon: Gray variants
```

#### Count Badge
**Usage**: Unread messages, notifications

```css
Properties:
- Size: 20px × 20px (min, can expand)
- Padding: 2px 6px
- Background: Red-500
- Text: White, 12px, Bold
- Border Radius: 50% (or 10px for pill)
- Position: Absolute, top-right of parent
```

---

### 6. MESSAGE BUBBLES

#### Sent Message (Right)
**Usage**: User's own messages

```css
Container:
- Align: Right (ml-auto)
- Max Width: 75%
- Margin Bottom: 8px

Bubble:
- Background: Black (dark: White)
- Color: White (dark: Black)
- Padding: 12px 16px
- Border Radius: 16px 16px 4px 16px
  (rounded top-left, top-right, bottom-left, sharp bottom-right)
- Or: 0px (all sharp)

Metadata (below bubble):
- Text: 11px, Gray-500
- Format: "12:34 PM ✓✓"
- Align: Right
```

#### Received Message (Left)
**Usage**: Other user's messages

```css
Container:
- Align: Left
- Max Width: 75%
- Margin Bottom: 8px

Avatar:
- Size: 32px
- Float: Left
- Margin Right: 8px
- (Only show for first message in sequence)

Bubble:
- Background: Gray-200 (dark: Gray-800)
- Color: Black (dark: White)
- Padding: 12px 16px
- Border Radius: 16px 16px 16px 4px
  (sharp bottom-left)

Metadata:
- Align: Left
- Format: "12:34 PM"
```

#### System Message
**Usage**: "Anonymous revealed", date separators

```css
Properties:
- Text: 12px, Gray-500, Centered
- Margin: 16px 0
- Before/After: Horizontal line (optional)
  - Border: 1px Gray-300
  - Width: 40px
  - Inline with text
```

---

### 7. MODALS

#### Standard Modal
**Usage**: Create group, Create poll, Confirmations

```css
Overlay:
- Position: Fixed, inset-0
- Background: rgba(0,0,0,0.5) (dark: rgba(0,0,0,0.7))
- Z-Index: 50
- Backdrop Blur: sm

Modal Container:
- Position: Fixed, centered (top-50%, left-50%, transform)
- Width: 90% (mobile), 500px (desktop)
- Max Width: 600px
- Max Height: 90vh
- Overflow: Auto
- Background: White (dark: Gray-900)
- Border: 4px solid Black (dark: White) OR rounded-3xl
- Padding: 32px (p-8)
- Shadow: 2xl

Header:
- Title: text-2xl, font-bold, mb-4
- Close Button: Absolute top-right, icon 24px

Body:
- Spacing: mb-6 between elements

Footer:
- Border Top: 1px Gray-200 (optional)
- Padding Top: 16px
- Buttons: Flex row, gap-2, justify-end
```

---

### 8. NAVIGATION

#### Top Navigation Bar
**Usage**: Landing page, logged-in header

```css
Properties:
- Position: Fixed top OR sticky
- Width: 100%
- Height: 64px (h-16)
- Background: White (dark: Black)
- Border Bottom: 4px solid Black (dark: White)
- Z-Index: 10

Container:
- Max Width: 1280px (max-w-7xl)
- Padding: 0 16px (px-4)
- Margin: 0 auto

Layout:
├─ Logo (left): Flex items-center
│  ├─ Icon: 40px square
│  └─ Text: text-2xl, font-bold
└─ Actions (right): Flex gap-2
   ├─ Button 1
   ├─ Button 2
   └─ Theme Toggle
```

#### Tabs
**Usage**: Users/Groups, Conversations/Requests

```css
Container:
- Background: White (dark: Gray-800)
- Border Bottom: 1px Gray-200

Tab Button:
- Padding: 16px 24px (py-4 px-6)
- Font: Medium, 16px
- Color: Gray-600 (inactive)
- Border Bottom: 2px solid transparent
- Transition: all 200ms

Active Tab:
- Color: Blue-600
- Border Bottom: 2px solid Blue-600

Tab Count Badge:
- Display: Inline
- Format: " (24)"
- Or: Badge component
```

---

### 9. TOAST NOTIFICATIONS

#### Toast Container
**Position**: Fixed, top-right OR bottom-right

```css
Properties:
- Min Width: 300px
- Max Width: 500px
- Padding: 16px
- Background: White (dark: Gray-900)
- Border: 2px solid (varies by type)
- Border Radius: 8px
- Shadow: lg
- Animation: Slide in from right + fade

Variants:
- Success: Border Green-500, Icon checkmark
- Error: Border Red-500, Icon X
- Warning: Border Orange-500, Icon exclamation
- Info: Border Blue-500, Icon info

Layout:
├─ Icon (left): 24px
├─ Message (middle): Flex-1, text-sm
└─ Close Button (right): 16px icon

Auto-dismiss: 3-5 seconds
```

---

### 10. IMAGE UPLOAD

#### Upload Area
**Usage**: Profile picture, Group image

```css
Properties:
- Width: 100% OR fixed (200px)
- Height: 150px OR square
- Border: 2px dashed Gray-400
- Border Radius: 8px
- Background: Gray-50 (dark: Gray-900)
- Hover: Background Gray-100, border solid

Content (Empty State):
- Icon: 48px, Gray-400, centered
- Text: "Click to upload" OR "Drag & drop"
- Subtext: "PNG, JPG up to 2MB"

Content (With Image):
- Image: Cover full area
- Overlay (on hover):
  - Background: rgba(0,0,0,0.5)
  - Icons: Change, Remove
```

#### Image Preview (Modal)
**Full-screen OR centered**

```css
Properties:
- Background: rgba(0,0,0,0.9)
- Position: Fixed, inset-0
- Z-Index: 60

Image:
- Max Width: 90vw
- Max Height: 90vh
- Object Fit: Contain
- Centered

Controls:
- Close Button: Top-right, White
- Navigation: Left/Right arrows (if gallery)
```

---

### 11. LOADING STATES

#### Spinner
**Usage**: Button loading, page loading

```css
Properties:
- Size: 16px (sm), 24px (md), 48px (lg)
- Border: 4px (for lg), 2px (for sm/md)
- Border Color: Gray-300
- Border Top Color: Primary (Black or Blue)
- Border Radius: 50%
- Animation: Spin 1s linear infinite

Variants:
- Inline (in button): Size sm, margin-right 8px
- Centered (page): Size lg, margin auto, with text below
```

#### Skeleton Loader
**Usage**: Card placeholders

```css
Properties:
- Background: Linear gradient
  from-gray-200 via-gray-300 to-gray-200
- Animation: Pulse OR shimmer (slide)
- Border Radius: Matches component
- Height: Matches content

Example (Card):
├─ Avatar Skeleton: Circle, 64px
├─ Text Line 1: Width 60%, height 20px
├─ Text Line 2: Width 80%, height 16px
└─ Button Skeleton: Width 100%, height 40px
```

---

### 12. EMPTY STATES

#### Standard Empty State
**Usage**: No conversations, No groups

```css
Container:
- Padding: 48px (py-12)
- Text-Align: Center
- Border: 4px solid Black (optional)

Content:
├─ Icon/Illustration: 96px-128px, Gray-400
├─ Heading: text-lg, font-bold, mb-2
├─ Description: text-sm, Gray-600, mb-4
└─ CTA Button: Primary button

Example:
"NO CONVERSATIONS YET"
"Start chatting with someone to see your messages here"
[START CHAT]
```

---

### 13. FILTERS & SEARCH

#### Search Bar
**Usage**: Dashboard, Chat list

```css
Properties:
- Width: 100% OR 300px
- Height: 40px
- Padding: 8px 12px, left 40px (for icon)
- Font: 14px
- Background: White (dark: Gray-800)
- Border: 1px Gray-300
- Border Radius: 8px OR 0px
- Focus: Ring 2px Blue-500

Icon:
- Position: Absolute left 12px
- Size: 20px
- Color: Gray-400
- Icon: Magnifying glass
```

#### Filter Dropdown
**Same as standard dropdown** but:

```css
Additional:
- Label: "Filter by:"
- Multiple allowed (checkboxes inside)
- Clear filter button (X icon)
- Applied filter chip:
  - Padding: 4px 8px
  - Background: Blue-100
  - Border-radius: 12px
  - Close icon: 12px
```

---

### 14. ONLINE STATUS

#### Indicator Dot
**Usage**: Avatar overlay, User list

```css
Properties:
- Size: 8px (w-2 h-2) to 16px (w-4 h-4)
- Border Radius: 50%
- Online: bg-green-500
- Offline: bg-gray-400
- Away: bg-yellow-500 (future)
- Border: 2px solid White (if on avatar)
- Position: Absolute bottom-0 right-0
```

#### Typing Indicator
**Usage**: Chat interface

```css
Properties:
- Text: "... is typing"
- Font: 12px, Italic, Gray-500
- Animation: Dots pulse

Alternative (3 dots):
- Container: Flex, gap 2px
- Dot: 6px circle, Gray-400
- Animation: Each dot bounces in sequence
```

---

## 📏 SPACING & SIZING REFERENCE

### Component Heights
- Button: 40px (sm), 48px (md), 56px (lg)
- Input: 40px (sm), 48px (md)
- Nav Bar: 64px
- Card: Auto (min-content)
- Chat Item: 72px
- Modal Header: 60px

### Component Widths
- Modal: 90% (mobile), 500px (desktop)
- Card: Responsive grid
- Input: 100% (in forms)
- Button: Auto (fit-content) OR full width

### Border Widths
- Subtle: 1px
- Standard: 2px
- Bold: 4px (current style)

### Border Radius
- Sharp: 0px (current)
- Slightly rounded: 4px
- Rounded: 8px
- Very rounded: 12px
- Pill: 9999px OR 50%

### Shadows
- None: none
- Small: 0 1px 2px rgba(0,0,0,0.05)
- Medium: 0 4px 6px rgba(0,0,0,0.1)
- Large: 0 10px 15px rgba(0,0,0,0.1)
- XL: 0 20px 25px rgba(0,0,0,0.1)
- 2XL: 0 25px 50px rgba(0,0,0,0.25)
- Brutalist (current): 8px 8px 0px 0px rgba(0,0,0,1)

---

## 🎨 COLOR VALUES (HEX)

### Neutrals (Light Mode)
- neutral-50: #FAFAFA
- neutral-100: #F5F5F5
- neutral-200: #E5E5E5
- neutral-300: #D4D4D4
- neutral-400: #A3A3A3
- neutral-500: #737373
- neutral-600: #525252
- neutral-700: #404040
- neutral-800: #262626
- neutral-900: #171717
- neutral-950: #0A0A0A

### Status Colors
- Green-500: #22C55E
- Green-800: #166534
- Red-500: #EF4444
- Red-900: #7F1D1D
- Orange-500: #F97316
- Orange-800: #9A3412
- Blue-500: #3B82F6
- Blue-800: #1E40AF
- Purple-500: #A855F7
- Purple-800: #6B21A8

---

## 🔤 FONT SPECIFICATIONS

### Font Family
```css
Primary: 'Geist Mono', monospace
Fallback: 'Courier New', monospace
```

### Font Weights
- Regular: 400
- Medium: 500
- Semi-bold: 600
- Bold: 700

### Font Sizes (px / rem)
- xs: 12px / 0.75rem
- sm: 14px / 0.875rem
- base: 16px / 1rem
- lg: 18px / 1.125rem
- xl: 20px / 1.25rem
- 2xl: 24px / 1.5rem
- 3xl: 30px / 1.875rem
- 4xl: 36px / 2.25rem
- 7xl: 72px / 4.5rem
- 9xl: 128px / 8rem

### Line Heights
- tight: 1.25
- normal: 1.5
- relaxed: 1.75

---

## 📱 RESPONSIVE SPECIFICATIONS

### Breakpoint Behavior

#### Mobile (< 640px)
- Nav: Stacked buttons
- Cards: 1 column
- Modals: Full width (90%)
- Font sizes: Slightly smaller (0.875x)

#### Tablet (640px - 1024px)
- Nav: Inline buttons
- Cards: 2 columns
- Modals: 500px width

#### Desktop (> 1024px)
- Cards: 3 columns
- Full navigation
- Larger font sizes in headings

---

## ⚡ ANIMATION SPECIFICATIONS

### Transitions
```css
Fast: 150ms ease
Normal: 200ms ease
Slow: 300ms ease
```

### Common Animations
```css
Fade In:
- From: opacity-0
- To: opacity-100
- Duration: 200ms

Slide In (Right):
- From: translateX(100%)
- To: translateX(0)
- Duration: 300ms

Scale Up:
- From: scale-95
- To: scale-100
- Duration: 150ms

Spin (Loader):
- From: rotate(0deg)
- To: rotate(360deg)
- Duration: 1000ms
- Timing: linear
- Iteration: infinite
```

---

## 🎯 ACCESSIBILITY REQUIREMENTS

### Color Contrast
- Text on Background: Minimum 4.5:1 (WCAG AA)
- Large Text (18px+): Minimum 3:1

### Touch Targets
- Minimum Size: 44px × 44px (mobile)
- Spacing: 8px between targets

### Focus States
- Ring: 2px solid Blue-500
- Offset: 2px
- Always visible for keyboard navigation

### Alt Text
- All images must have descriptive alt text
- Decorative images: alt=""

### ARIA Labels
- All icon buttons
- All interactive elements without text
- Dynamic content changes

---

## 📋 DEVELOPER HANDOFF NOTES

### CSS Framework
- Primary: Tailwind CSS
- Custom classes in globals.css

### Image Handling
- Component: Next/Image
- Formats: WebP preferred, fallback JPG/PNG
- Lazy loading: Enabled by default

### Icons
- Library: Heroicons OR custom SVG
- Size: 16px, 20px, 24px
- Stroke Width: 2px

### z-index Scale
- 0: Normal content
- 10: Nav bar, sticky headers
- 20: Dropdowns
- 30: Tooltips
- 40: Modals overlay
- 50: Modals content
- 60: Image preview/full screen

---

**Last Updated**: February 28, 2026 [3:30 PM]
