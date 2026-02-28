# 🎨 BYTE-CHAT Design System v2.0
## Modern Romance Edition

**Design Direction**: Modern Romance with warm gradients, soft curves, playful animations  
**Primary Audience**: IIT Mandi students (18-38 years)  
**Use Cases**: Love chats (70%), Fun (20%), Academic/Casual (10%)  
**Created**: February 28, 2026

---

## 📐 DESIGN PRINCIPLES

1. **Warm & Inviting** - Create emotional connection through color and curves
2. **Playful Yet Professional** - Balance fun with functionality
3. **Trust & Privacy** - Visual cues for security (especially anonymous mode)
4. **Mobile-First Delight** - Optimized for touch, gestures, and small screens
5. **Accessible Romance** - Beautiful AND usable for everyone

---

## 🎨 COLOR PALETTE

### Primary Colors - "Romance Gradient"

```
PRIMARY GRADIENT (Main Brand)
├─ Rose Pink:     #FF6B9D (rgb(255, 107, 157))
├─ Coral:         #FF8E72 (rgb(255, 142, 114))
└─ Sunset Orange: #FFA06B (rgb(255, 160, 107))

Usage: Primary CTAs, headers, brand elements, love-related features
Gradient CSS: linear-gradient(135deg, #FF6B9D 0%, #FF8E72 50%, #FFA06B 100%)
```

### Secondary Colors - "Trust Gradient"

```
SECONDARY GRADIENT (Trust & Calm)
├─ Lavender:      #C084FC (rgb(192, 132, 252))
├─ Purple:        #A855F7 (rgb(168, 85, 247))
└─ Deep Purple:   #9333EA (rgb(147, 51, 234))

Usage: Secondary actions, anonymous features, badges, highlights
Gradient CSS: linear-gradient(135deg, #C084FC 0%, #A855F7 50%, #9333EA 100%)
```

### Accent Colors - "Vibrant Highlights"

```
ACCENT PALETTE
├─ Vibrant Blue:  #3B82F6 (rgb(59, 130, 246))    - Links, info
├─ Electric Cyan: #06B6D4 (rgb(6, 182, 212))     - Online status, active
├─ Lime Green:    #84CC16 (rgb(132, 204, 22))    - Success, verified
├─ Sunny Yellow:  #FACC15 (rgb(250, 204, 21))    - Warnings, highlights
└─ Hot Pink:      #EC4899 (rgb(236, 72, 153))    - Special actions, hearts

Usage: Status indicators, notifications, micro-interactions
```

### Neutral Colors - "Soft Foundation"

```
LIGHT MODE (Default)
├─ Background:    #FDFCFB (rgb(253, 252, 251))   - Page background
├─ Surface:       #FFFFFF (rgb(255, 255, 255))   - Cards, modals
├─ Surface Soft:  #F9F7F6 (rgb(249, 247, 246))   - Alt backgrounds
├─ Border Light:  #F1EEEC (rgb(241, 238, 236))   - Subtle borders
├─ Border:        #E5E1DD (rgb(229, 225, 221))   - Standard borders
├─ Text Muted:    #A8A29E (rgb(168, 162, 158))   - Secondary text
├─ Text:          #57534E (rgb(87, 83, 78))      - Body text
└─ Text Strong:   #292524 (rgb(41, 37, 36))      - Headings

DARK MODE
├─ Background:    #1C1917 (rgb(28, 25, 23))      - Page background
├─ Surface:       #292524 (rgb(41, 37, 36))      - Cards, modals
├─ Surface Soft:  #3F3A37 (rgb(63, 58, 55))      - Alt backgrounds
├─ Border Dark:   #57534E (rgb(87, 83, 78))      - Borders
├─ Text Muted:    #A8A29E (rgb(168, 162, 158))   - Secondary text
├─ Text:          #E7E5E4 (rgb(231, 229, 228))   - Body text
└─ Text Strong:   #FAFAF9 (rgb(250, 250, 249))   - Headings
```

### Semantic Colors

```
SUCCESS (Green)
├─ Light:  #DCFCE7 (bg)  │  Dark:  #166534 (bg)
├─ Text:   #166534       │  Text:  #BBF7D0
└─ Border: #86EFAC       │  Border: #22C55E

ERROR (Red)
├─ Light:  #FEE2E2 (bg)  │  Dark:  #7F1D1D (bg)
├─ Text:   #991B1B       │  Text:  #FCA5A5
└─ Border: #FCA5A5       │  Border: #EF4444

WARNING (Amber)
├─ Light:  #FEF3C7 (bg)  │  Dark:  #78350F (bg)
├─ Text:   #92400E       │  Text:  #FCD34D
└─ Border: #FCD34D       │  Border: #F59E0B

INFO (Sky Blue)
├─ Light:  #E0F2FE (bg)  │  Dark:  #0C4A6E (bg)
├─ Text:   #075985       │  Text:  #BAE6FD
└─ Border: #7DD3FC       │  Border: #0EA5E9
```

### Feature-Specific Colors

```
ANONYMOUS MODE (Mystery)
├─ Gradient: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)
├─ Icon Color: #8B5CF6
└─ Badge: Purple-500 background

GROUP CHAT (Community)
├─ Gradient: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)
├─ Icon Color: #3B82F6
└─ Badge: Blue-500 background

REGULAR CHAT (Personal)
├─ Gradient: Uses Primary Romance Gradient
├─ Icon Color: #FF6B9D
└─ Badge: Pink-500 background
```

---

## 📝 TYPOGRAPHY SYSTEM

### Font Families

```css
/* PRIMARY FONT - Friendly & Approachable */
--font-primary: 'Inter', 'SF Pro Rounded', -apple-system, system-ui, sans-serif;
/* Use for: Body text, buttons, most UI elements */
/* Weight range: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold) */

/* SECONDARY FONT - Serious & Functional */
--font-secondary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
/* Use for: Data displays, technical info, settings, forms */
/* Weight range: 400, 500, 600 */

/* ACCENT FONT - Display & Headers (Optional) */
--font-accent: 'Quicksand', 'Inter', sans-serif;
/* Use for: Large headings, landing page, special callouts */
/* Weight range: 600 (Semibold), 700 (Bold) */

/* MONO FONT - Code & Technical (Limited Use) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
/* Use ONLY for: Roll numbers, timestamps, code snippets */
/* Weight: 400, 500 */
```

### Font Scale (Fluid Typography)

```css
/* MOBILE FIRST (base 16px) */
--text-xs:    0.75rem;   /* 12px - Timestamps, captions */
--text-sm:    0.875rem;  /* 14px - Secondary text, labels */
--text-base:  1rem;      /* 16px - Body text, messages */
--text-lg:    1.125rem;  /* 18px - Emphasized text */
--text-xl:    1.25rem;   /* 20px - Card titles */
--text-2xl:   1.5rem;    /* 24px - Section headings */
--text-3xl:   1.875rem;  /* 30px - Page titles */
--text-4xl:   2.25rem;   /* 36px - Hero headings */
--text-5xl:   3rem;      /* 48px - Landing page hero */

/* DESKTOP SCALE (slightly larger) */
--text-lg-desktop:   1.25rem;   /* 20px */
--text-xl-desktop:   1.5rem;    /* 24px */
--text-2xl-desktop:  1.875rem;  /* 30px */
--text-3xl-desktop:  2.25rem;   /* 36px */
--text-4xl-desktop:  3rem;      /* 48px */
--text-5xl-desktop:  4rem;      /* 64px */
```

### Font Weights & Use Cases

```
REGULAR (400)
- Body text in paragraphs
- Long-form content
- Bio descriptions

MEDIUM (500)
- Labels and input fields
- Navigation items
- Secondary buttons

SEMIBOLD (600)
- Card titles
- Chat names
- Important UI text
- Primary buttons

BOLD (700)
- Page headings
- Section titles
- Emphasis in content
- Call-to-action text
```

### Line Heights

```css
--leading-tight:    1.25;   /* For headings */
--leading-snug:     1.375;  /* For subheadings */
--leading-normal:   1.5;    /* For body text */
--leading-relaxed:  1.625;  /* For long-form content */
--leading-loose:    2;      /* For special spacing */
```

---

## 📏 SPACING SYSTEM

### Base Spacing Scale (in pixels)

```
--space-0:    0px
--space-1:    4px     /* Micro spacing */
--space-2:    8px     /* Small gaps */
--space-3:    12px    /* Medium gaps */
--space-4:    16px    /* Standard spacing */
--space-5:    20px    /* Comfortable spacing */
--space-6:    24px    /* Generous spacing */
--space-8:    32px    /* Large spacing */
--space-10:   40px    /* XL spacing */
--space-12:   48px    /* Section spacing */
--space-16:   64px    /* Major sections */
--space-20:   80px    /* Hero sections */
--space-24:   96px    /* Page sections */
```

### Component-Specific Spacing

```
BUTTON PADDING
- Small:     8px 16px   (py-2 px-4)
- Medium:    12px 24px  (py-3 px-6)
- Large:     16px 32px  (py-4 px-8)

INPUT PADDING
- Vertical:  12px       (py-3)
- Horizontal: 16px      (px-4)

CARD PADDING
- Compact:   16px       (p-4)
- Standard:  24px       (p-6)
- Spacious:  32px       (p-8)

SECTION MARGINS
- Mobile:    24px       (my-6)
- Desktop:   48px       (my-12)
```

---

## 🎭 BORDERS & SHADOWS

### Border Radius (Soft Curves)

```css
--radius-sm:     6px;     /* Small elements, badges */
--radius-md:     8px;     /* Buttons, inputs */
--radius-lg:     12px;    /* Cards, images */
--radius-xl:     16px;    /* Large cards, modals */
--radius-2xl:    24px;    /* Special containers */
--radius-3xl:    32px;    /* Hero sections */
--radius-full:   9999px;  /* Pills, avatars */
```

### Border Widths

```css
--border-thin:   1px;     /* Subtle dividers */
--border-base:   2px;     /* Standard borders */
--border-thick:  3px;     /* Emphasis borders */
```

### Shadow System (Soft & Elevated)

```css
/* LIGHT MODE SHADOWS */
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm:  0 2px 4px rgba(0, 0, 0, 0.06), 
              0 1px 2px rgba(0, 0, 0, 0.03);
--shadow-md:  0 4px 8px rgba(0, 0, 0, 0.08), 
              0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg:  0 8px 16px rgba(0, 0, 0, 0.1), 
              0 4px 8px rgba(0, 0, 0, 0.06);
--shadow-xl:  0 16px 32px rgba(0, 0, 0, 0.12), 
              0 8px 16px rgba(0, 0, 0, 0.08);
--shadow-2xl: 0 24px 48px rgba(0, 0, 0, 0.15), 
              0 12px 24px rgba(0, 0, 0, 0.1);

/* COLORED SHADOWS (For emphasis) */
--shadow-pink:    0 8px 16px rgba(255, 107, 157, 0.25);
--shadow-purple:  0 8px 16px rgba(168, 85, 247, 0.25);
--shadow-blue:    0 8px 16px rgba(59, 130, 246, 0.25);

/* DARK MODE SHADOWS (lighter for contrast) */
--shadow-dark-sm:  0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-dark-md:  0 4px 8px rgba(0, 0, 0, 0.4);
--shadow-dark-lg:  0 8px 16px rgba(0, 0, 0, 0.5);
```

### Glow Effects (For Interactive Elements)

```css
/* HOVER GLOWS */
--glow-pink:   0 0 20px rgba(255, 107, 157, 0.4);
--glow-purple: 0 0 20px rgba(168, 85, 247, 0.4);
--glow-blue:   0 0 20px rgba(59, 130, 246, 0.4);
```

---

## 🎨 GRADIENT LIBRARY

### Background Gradients

```css
/* PRIMARY GRADIENTS */
.gradient-romance {
  background: linear-gradient(135deg, #FF6B9D 0%, #FF8E72 50%, #FFA06B 100%);
}

.gradient-romance-radial {
  background: radial-gradient(circle at top right, #FF6B9D, #FFA06B);
}

.gradient-trust {
  background: linear-gradient(135deg, #C084FC 0%, #A855F7 50%, #9333EA 100%);
}

.gradient-mystery {
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%);
}

.gradient-ocean {
  background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
}

/* SUBTLE BACKGROUND GRADIENTS (For surfaces) */
.gradient-soft-pink {
  background: linear-gradient(180deg, rgba(255,107,157,0.05) 0%, transparent 100%);
}

.gradient-soft-purple {
  background: linear-gradient(180deg, rgba(168,85,247,0.05) 0%, transparent 100%);
}

/* MESH GRADIENTS (For hero sections) */
.gradient-mesh-warm {
  background: 
    radial-gradient(at 27% 37%, rgba(255,107,157,0.3) 0px, transparent 50%),
    radial-gradient(at 97% 21%, rgba(255,160,107,0.3) 0px, transparent 50%),
    radial-gradient(at 52% 99%, rgba(255,142,114,0.3) 0px, transparent 50%),
    radial-gradient(at 10% 29%, rgba(192,132,252,0.2) 0px, transparent 50%);
}
```

### Text Gradients

```css
.text-gradient-romance {
  background: linear-gradient(135deg, #FF6B9D, #FFA06B);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.text-gradient-purple {
  background: linear-gradient(135deg, #A855F7, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 🎬 ANIMATION & TRANSITIONS

### Timing Functions

```css
--ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);
--ease-out:        cubic-bezier(0, 0, 0.2, 1);
--ease-in:         cubic-bezier(0.4, 0, 1, 1);
--ease-bounce:     cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-smooth:     cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### Transition Durations

```css
--duration-fast:    150ms;   /* Quick hover states */
--duration-normal:  250ms;   /* Standard transitions */
--duration-slow:    350ms;   /* Page transitions */
--duration-slower:  500ms;   /* Modal appearances */
```

### Common Animations

```css
/* FADE IN */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* SLIDE UP */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* SCALE IN */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* PULSE (For notifications) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* HEARTBEAT (For love features) */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.1); }
  50% { transform: scale(1); }
}

/* SHIMMER (For loading states) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* FLOAT (For subtle movement) */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

### Hover Effects

```css
/* Button Hover */
.btn-hover {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.btn-hover:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* Card Hover */
.card-hover {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.card-hover:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-xl);
}

/* Icon Hover */
.icon-hover {
  transition: all 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
.icon-hover:hover {
  transform: scale(1.15) rotate(5deg);
}
```

---

## 🎯 COMPONENT REDESIGNS

### 1. BUTTONS

#### Primary Button (Main CTAs)

```css
/* Base Styles */
.btn-primary {
  /* Layout */
  padding: 12px 24px;           /* py-3 px-6 */
  border-radius: 12px;          /* rounded-xl */
  
  /* Typography */
  font-family: var(--font-primary);
  font-size: 1rem;              /* 16px */
  font-weight: 600;             /* Semibold */
  letter-spacing: 0.01em;
  
  /* Colors */
  background: linear-gradient(135deg, #FF6B9D 0%, #FFA06B 100%);
  color: #FFFFFF;
  border: none;
  
  /* Effects */
  box-shadow: 0 4px 8px rgba(255, 107, 157, 0.25);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Hover State */
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(255, 107, 157, 0.35);
    background: linear-gradient(135deg, #FF6B9D 0%, #FF8E72 100%);
  }
  
  /* Active State */
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(255, 107, 157, 0.3);
  }
  
  /* Disabled State */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  /* Loading State */
  &.loading {
    position: relative;
    color: transparent;
    pointer-events: none;
  }
  &.loading::after {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    top: 50%;
    left: 50%;
    margin-left: -8px;
    margin-top: -8px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### Secondary Button

```css
.btn-secondary {
  padding: 12px 24px;
  border-radius: 12px;
  
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  
  /* Light Mode */
  background: rgba(255, 107, 157, 0.1);
  color: #FF6B9D;
  border: 2px solid #FF6B9D;
  
  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    background: rgba(255, 107, 157, 0.15);
    color: #FFA06B;
    border-color: #FFA06B;
  }
  
  box-shadow: none;
  transition: all 250ms ease;
  
  &:hover {
    background: rgba(255, 107, 157, 0.2);
    transform: translateY(-1px);
  }
}
```

#### Icon Button

```css
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: rgba(87, 83, 78, 0.05);
  border: none;
  
  transition: all 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  &:hover {
    background: rgba(255, 107, 157, 0.1);
    transform: scale(1.1) rotate(5deg);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: #57534E;
  }
}
```

#### Danger Button

```css
.btn-danger {
  padding: 12px 24px;
  border-radius: 12px;
  
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  color: white;
  border: none;
  
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.25);
  transition: all 250ms ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.35);
  }
}
```

### Button Sizes

```css
/* Small */
.btn-sm {
  padding: 8px 16px;    /* py-2 px-4 */
  font-size: 0.875rem;  /* 14px */
  border-radius: 8px;
}

/* Medium (Default) */
.btn-md {
  padding: 12px 24px;   /* py-3 px-6 */
  font-size: 1rem;      /* 16px */
  border-radius: 12px;
}

/* Large */
.btn-lg {
  padding: 16px 32px;   /* py-4 px-8 */
  font-size: 1.125rem;  /* 18px */
  border-radius: 14px;
}
```

---

### 2. INPUT FIELDS

#### Text Input

```css
.input-text {
  width: 100%;
  height: 48px;
  padding: 12px 16px;
  
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 400;
  
  /* Light Mode */
  background: #FFFFFF;
  color: #292524;
  border: 2px solid #E5E1DD;
  border-radius: 12px;
  
  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    background: #292524;
    color: #E7E5E4;
    border-color: #57534E;
  }
  
  transition: all 200ms ease;
  
  /* Focus State */
  &:focus {
    outline: none;
    border-color: #FF6B9D;
    box-shadow: 0 0 0 4px rgba(255, 107, 157, 0.1);
  }
  
  /* Error State */
  &.error {
    border-color: #EF4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
  }
  
  /* Disabled State */
  &:disabled {
    opacity: 0.5;
    background: #F9F7F6;
    cursor: not-allowed;
  }
  
  /* Placeholder */
  &::placeholder {
    color: #A8A29E;
  }
}

/* Label Styling */
.input-label {
  display: block;
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 600;
  color: #57534E;
  margin-bottom: 8px;
}

/* Helper Text */
.input-helper {
  font-size: 0.75rem;
  color: #A8A29E;
  margin-top: 4px;
}

/* Error Text */
.input-error-text {
  font-size: 0.75rem;
  color: #EF4444;
  margin-top: 4px;
}
```

#### Textarea

```css
.textarea {
  width: 100%;
  min-height: 96px;
  padding: 12px 16px;
  
  font-family: var(--font-primary);
  font-size: 1rem;
  line-height: 1.5;
  
  background: #FFFFFF;
  color: #292524;
  border: 2px solid #E5E1DD;
  border-radius: 12px;
  
  resize: vertical;
  transition: all 200ms ease;
  
  &:focus {
    outline: none;
    border-color: #FF6B9D;
    box-shadow: 0 0 0 4px rgba(255, 107, 157, 0.1);
  }
}
```

#### Search Input (with icon)

```css
.input-search-wrapper {
  position: relative;
  width: 100%;
}

.input-search {
  width: 100%;
  height: 44px;
  padding: 10px 16px 10px 44px;  /* Extra left padding for icon */
  
  font-family: var(--font-primary);
  font-size: 0.875rem;
  
  background: rgba(87, 83, 78, 0.05);
  color: #292524;
  border: 2px solid transparent;
  border-radius: 12px;
  
  transition: all 200ms ease;
  
  &:focus {
    background: #FFFFFF;
    border-color: #FF6B9D;
    box-shadow: 0 0 0 4px rgba(255, 107, 157, 0.1);
  }
}

.input-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #A8A29E;
  pointer-events: none;
}
```

---

### 3. CARDS

#### User Card (Dashboard)

```css
.card-user {
  /* Layout */
  width: 100%;
  padding: 24px;
  border-radius: 16px;
  
  /* Colors */
  background: #FFFFFF;
  border: 2px solid #F1EEEC;
  
  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    background: #292524;
    border-color: #57534E;
  }
  
  /* Effects */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Hover State */
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    border-color: rgba(255, 107, 157, 0.3);
  }
}

/* Card Layout Structure */
.card-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.card-user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #FF6B9D, #FFA06B) border-box;
  object-fit: cover;
}

.card-user-name {
  font-family: var(--font-primary);
  font-size: 1.25rem;
  font-weight: 600;
  color: #292524;
  margin: 0;
}

.card-user-roll {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: #A8A29E;
}

.card-user-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.card-user-bio {
  font-size: 0.875rem;
  color: #57534E;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-user-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
}
```

#### Group Card

```css
.card-group {
  width: 100%;
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
  
  background: #FFFFFF;
  border: 2px solid #F1EEEC;
  
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    border-color: rgba(59, 130, 246, 0.3);
  }
}

.card-group-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  background: linear-gradient(135deg, #06B6D4, #3B82F6);
}

.card-group-content {
  padding: 20px;
}

.card-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-group-name {
  font-family: var(--font-primary);
  font-size: 1.125rem;
  font-weight: 600;
  color: #292524;
}

.card-group-description {
  font-size: 0.875rem;
  color: #57534E;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-group-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #A8A29E;
  margin-bottom: 16px;
}

.card-group-actions {
  display: flex;
  gap: 8px;
}
```

#### Chat Item (List)

```css
.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  
  background: transparent;
  border-bottom: 1px solid #F1EEEC;
  
  transition: all 200ms ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 107, 157, 0.05);
  }
  
  &.active {
    background: rgba(255, 107, 157, 0.1);
    border-left: 4px solid #FF6B9D;
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.chat-item-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}

.chat-item-content {
  flex: 1;
  min-width: 0;
}

.chat-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.chat-item-name {
  font-family: var(--font-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  color: #292524;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-item-time {
  font-size: 0.75rem;
  color: #A8A29E;
  flex-shrink: 0;
  margin-left: 8px;
}

.chat-item-message {
  font-size: 0.875rem;
  color: #A8A29E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.chat-item-unread {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: #FF6B9D;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
}
```

---

### 4. BADGES

#### Status Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  border-radius: 6px;
  border: 1.5px solid currentColor;
}

/* Variants */
.badge-public {
  background: rgba(132, 204, 22, 0.1);
  color: #65A30D;
  border-color: #84CC16;
}

.badge-private {
  background: rgba(249, 115, 22, 0.1);
  color: #C2410C;
  border-color: #F97316;
}

.badge-owner {
  background: rgba(168, 85, 247, 0.1);
  color: #7C3AED;
  border-color: #A855F7;
}

.badge-admin {
  background: rgba(59, 130, 246, 0.1);
  color: #2563EB;
  border-color: #3B82F6;
}

.badge-anon {
  background: rgba(100, 116, 139, 0.1);
  color: #475569;
  border-color: #64748B;
}

.badge-verified {
  background: rgba(132, 204, 22, 0.1);
  color: #65A30D;
  border-color: #84CC16;
}
```

#### Count Badge (Notifications)

```css
.badge-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  background: linear-gradient(135deg, #FF6B9D 0%, #EC4899 100%);
  color: white;
  
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 700;
  
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(255, 107, 157, 0.3);
  
  /* Position when overlaying */
  &.absolute {
    position: absolute;
    top: -4px;
    right: -4px;
  }
}
```

---

### 5. MESSAGE BUBBLES

#### Sent Message (Right)

```css
.message-sent {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.message-sent-bubble {
  max-width: 75%;
  padding: 12px 16px;
  
  background: linear-gradient(135deg, #FF6B9D 0%, #FFA06B 100%);
  color: white;
  
  font-family: var(--font-primary);
  font-size: 0.9375rem;
  line-height: 1.5;
  
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.2);
  
  word-wrap: break-word;
}

.message-sent-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
  padding-right: 4px;
}

.message-sent-time {
  font-size: 0.6875rem;
  color: #A8A29E;
}

.message-sent-status {
  display: flex;
  align-items: center;
  color: #84CC16;
}
```

#### Received Message (Left)

```css
.message-received {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.message-received-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.message-received-content {
  flex: 1;
  max-width: 75%;
}

.message-received-bubble {
  padding: 12px 16px;
  
  background: rgba(87, 83, 78, 0.08);
  color: #292524;
  
  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    background: rgba(231, 229, 228, 0.1);
    color: #E7E5E4;
  }
  
  font-family: var(--font-primary);
  font-size: 0.9375rem;
  line-height: 1.5;
  
  border-radius: 16px 16px 16px 4px;
  
  word-wrap: break-word;
}

.message-received-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding-left: 4px;
}

.message-received-time {
  font-size: 0.6875rem;
  color: #A8A29E;
}
```

#### System Message

```css
.message-system {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0;
}

.message-system-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #E5E1DD, transparent);
}

.message-system-text {
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 500;
  color: #A8A29E;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
```

---

### 6. AVATARS

```css
.avatar {
  position: relative;
  display: inline-block;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

/* Sizes */
.avatar-sm {
  width: 32px;
  height: 32px;
}

.avatar-md {
  width: 48px;
  height: 48px;
}

.avatar-lg {
  width: 64px;
  height: 64px;
}

.avatar-xl {
  width: 96px;
  height: 96px;
}

.avatar-2xl {
  width: 128px;
  height: 128px;
}

/* Image */
.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Gradient Border */
.avatar-gradient-border {
  border: 3px solid transparent;
  background: 
    linear-gradient(white, white) padding-box,
    linear-gradient(135deg, #FF6B9D, #FFA06B) border-box;
}

/* Online Status */
.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 25%;
  height: 25%;
  min-width: 10px;
  min-height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.avatar-status-online {
  background: #84CC16;
}

.avatar-status-offline {
  background: #A8A29E;
}

.avatar-status-away {
  background: #FACC15;
}

/* Anonymous Avatar Overlay */
.avatar-anonymous::after {
  content: "🎭";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 60%;
  background: rgba(168, 85, 247, 0.9);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
```

---

### 7. MODALS

```css
/* Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  
  animation: fadeIn 250ms ease;
}

/* Modal Container */
.modal {
  position: relative;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  
  animation: scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    background: #292524;
  }
}

/* Header */
.modal-header {
  position: relative;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #F1EEEC;
}

.modal-title {
  font-family: var(--font-primary);
  font-size: 1.5rem;
  font-weight: 700;
  color: #292524;
  margin: 0;
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: rgba(87, 83, 78, 0.1);
  border: none;
  border-radius: 8px;
  
  cursor: pointer;
  transition: all 200ms ease;
  
  &:hover {
    background: rgba(87, 83, 78, 0.2);
    transform: rotate(90deg);
  }
}

/* Body */
.modal-body {
  padding: 24px;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px 24px;
  border-top: 1px solid #F1EEEC;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

### 8. TOAST NOTIFICATIONS

```css
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 60;
  
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  max-width: 400px;
  width: calc(100% - 40px);
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  
  background: white;
  border-radius: 12px;
  border-left: 4px solid;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  
  animation: slideInRight 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    background: #292524;
  }
}

/* Variants */
.toast-success {
  border-left-color: #84CC16;
}

.toast-error {
  border-left-color: #EF4444;
}

.toast-warning {
  border-left-color: #FACC15;
}

.toast-info {
  border-left-color: #3B82F6;
}

.toast-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 600;
  color: #292524;
  margin-bottom: 2px;
}

.toast-message {
  font-size: 0.8125rem;
  color: #57534E;
  line-height: 1.4;
}

.toast-close {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #A8A29E;
  cursor: pointer;
  transition: all 150ms ease;
  
  &:hover {
    background: rgba(87, 83, 78, 0.1);
    color: #57534E;
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## 📱 RESPONSIVE SPECIFICATIONS

### Breakpoints

```css
/* Mobile First Approach */
--breakpoint-sm:  640px;   /* Small tablets, large phones */
--breakpoint-md:  768px;   /* Tablets */
--breakpoint-lg:  1024px;  /* Small laptops */
--breakpoint-xl:  1280px;  /* Desktops */
--breakpoint-2xl: 1536px;  /* Large screens */
```

### Component Behavior by Breakpoint

```
NAVIGATION BAR
├─ Mobile (<640px):   Hamburger menu, logo centered
├─ Tablet (640-1024): Logo left, buttons inline
└─ Desktop (>1024px): Full navigation with search

CARD GRID
├─ Mobile:   1 column
├─ Tablet:   2 columns
└─ Desktop:  3-4 columns

MODALS
├─ Mobile:   Full width (90%), max-height 90vh
├─ Tablet:   500px fixed width
└─ Desktop:  600px fixed width, centered

CHAT INTERFACE
├─ Mobile:   Full screen, header collapsed
├─ Tablet:   Split view possible
└─ Desktop:  Sidebar + chat view

INPUT FIELDS
├─ Mobile:   Full width, slightly smaller padding
├─ Tablet:   Standard sizing
└─ Desktop:  Standard sizing, may have max-width
```

### Touch Target Sizes

```
Minimum Touch Target: 44px × 44px

MOBILE CONSIDERATIONS:
- Buttons: Minimum 44px height
- Icons: Minimum 44px touch area
- List items: Minimum 56px height
- Input fields: Minimum 48px height
- Spacing between targets: Minimum 8px
```

---

## 🎯 PAGE-SPECIFIC RECOMMENDATIONS

### Landing Page

```css
/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  
  background: 
    radial-gradient(at 27% 37%, rgba(255,107,157,0.15) 0px, transparent 50%),
    radial-gradient(at 97% 21%, rgba(255,160,107,0.15) 0px, transparent 50%),
    radial-gradient(at 52% 99%, rgba(255,142,114,0.15) 0px, transparent 50%),
    #FDFCFB;
}

.hero-title {
  font-family: var(--font-accent);
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  
  background: linear-gradient(135deg, #FF6B9D, #FFA06B);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  margin-bottom: 24px;
}

.hero-subtitle {
  font-size: clamp(1rem, 3vw, 1.25rem);
  color: #57534E;
  max-width: 600px;
  margin-bottom: 32px;
}

.hero-cta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}
```

### Dashboard

```css
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.dashboard-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #F1EEEC;
}

.dashboard-tab {
  padding: 12px 24px;
  
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  color: #A8A29E;
  
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 200ms ease;
  
  &.active {
    color: #FF6B9D;
    border-bottom-color: #FF6B9D;
  }
  
  &:hover:not(.active) {
    color: #57534E;
  }
}

.dashboard-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.dashboard-grid {
  display: grid;
  gap: 20px;
  
  /* Mobile */
  grid-template-columns: 1fr;
  
  /* Tablet */
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Desktop */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  /* Large Desktop */
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Chat Interface

```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  background: #FDFCFB;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  
  background: white;
  border-bottom: 2px solid #F1EEEC;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(87, 83, 78, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(87, 83, 78, 0.5);
  }
}

.chat-input-container {
  padding: 16px 20px;
  background: white;
  border-top: 2px solid #F1EEEC;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.chat-input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  max-height: 120px;
  min-height: 44px;
  padding: 10px 16px;
  
  font-family: var(--font-primary);
  font-size: 0.9375rem;
  line-height: 1.5;
  
  background: rgba(87, 83, 78, 0.05);
  color: #292524;
  border: 2px solid transparent;
  border-radius: 12px;
  
  resize: none;
  overflow-y: auto;
  
  &:focus {
    background: white;
    border-color: #FF6B9D;
    box-shadow: 0 0 0 4px rgba(255, 107, 157, 0.1);
  }
}

.chat-input-actions {
  display: flex;
  gap: 8px;
}
```

---

## 🎨 SPECIAL FEATURES STYLING

### Anonymous Mode Indicator

```css
.anonymous-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  color: #8B5CF6;
  
  font-size: 0.8125rem;
  font-weight: 600;
  
  border: 1.5px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  
  animation: pulse 2s ease-in-out infinite;
}

.anonymous-mode-icon {
  font-size: 1rem;
  animation: float 3s ease-in-out infinite;
}
```

### Love Heart Animation (For reactions)

```css
.heart-animation {
  display: inline-block;
  color: #FF6B9D;
  animation: heartbeat 1s ease-in-out;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  10%, 30% {
    transform: scale(1.2);
  }
  20%, 40% {
    transform: scale(1.1);
  }
  50% {
    transform: scale(1.3) rotate(-5deg);
  }
  60% {
    transform: scale(1.3) rotate(5deg);
  }
  70% {
    transform: scale(1.2);
  }
}
```

### Typing Indicator

```css
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  
  background: rgba(87, 83, 78, 0.08);
  border-radius: 16px 16px 16px 4px;
  
  width: fit-content;
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: #A8A29E;
  border-radius: 50%;
  animation: typingBounce 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px);
  }
}
```

### Online Status Pulse

```css
.online-pulse {
  position: relative;
}

.online-pulse::before {
  content: "";
  position: absolute;
  inset: -4px;
  background: #84CC16;
  border-radius: 50%;
  opacity: 0;
  animation: pulsing 2s ease-out infinite;
}

@keyframes pulsing {
  0% {
    opacity: 0.6;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}
```

---

## 🔧 IMPLEMENTATION NOTES

### CSS Variables Setup

```css
:root {
  /* Colors - Light Mode */
  --color-primary: #FF6B9D;
  --color-primary-light: #FFA06B;
  --color-secondary: #A855F7;
  --color-accent: #3B82F6;
  
  --color-bg: #FDFCFB;
  --color-surface: #FFFFFF;
  --color-border: #E5E1DD;
  
  --color-text: #57534E;
  --color-text-muted: #A8A29E;
  --color-text-strong: #292524;
  
  /* Fonts */
  --font-primary: 'Inter', sans-serif;
  --font-secondary: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-unit: 4px;
  
  /* Borders */
  --radius-base: 12px;
  --border-width: 2px;
  
  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Dark Mode Overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1C1917;
    --color-surface: #292524;
    --color-border: #57534E;
    
    --color-text: #E7E5E4;
    --color-text-muted: #A8A29E;
    --color-text-strong: #FAFAF9;
  }
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          pink: '#FF6B9D',
          coral: '#FF8E72',
          orange: '#FFA06B',
        },
        secondary: {
          lavender: '#C084FC',
          purple: '#A855F7',
          deep: '#9333EA',
        },
        neutral: {
          50: '#FDFCFB',
          100: '#F9F7F6',
          200: '#F1EEEC',
          300: '#E5E1DD',
          400: '#A8A29E',
          500: '#57534E',
          600: '#292524',
          900: '#1C1917',
        },
      },
      fontFamily: {
        primary: ['Inter', 'sans-serif'],
        secondary: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'base': '12px',
        'card': '16px',
        'modal': '24px',
      },
      boxShadow: {
        'soft-sm': '0 2px 4px rgba(0, 0, 0, 0.06)',
        'soft-md': '0 4px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 8px 16px rgba(0, 0, 0, 0.1)',
        'pink': '0 8px 16px rgba(255, 107, 157, 0.25)',
        'purple': '0 8px 16px rgba(168, 85, 247, 0.25)',
      },
    },
  },
}
```

### Next.js Font Setup

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-primary">{children}</body>
    </html>
  );
}
```

---

## 📋 DESIGN CHECKLIST

### Phase 1: Design System Foundation
- [ ] Set up CSS variables
- [ ] Configure Tailwind with custom theme
- [ ] Install and configure fonts (Inter, JetBrains Mono)
- [ ] Create color palette file
- [ ] Build gradient utility classes
- [ ] Set up animation library

### Phase 2: Core Components
- [ ] Button variants (Primary, Secondary, Danger, Icon)
- [ ] Input fields (Text, Password, Textarea, Search)
- [ ] Cards (User, Group, Chat item)
- [ ] Badges (Status, Count)
- [ ] Avatars (with online status, gradient borders)
- [ ] Message bubbles (Sent, Received, System)
- [ ] Modals (Standard, Confirmation)
- [ ] Toast notifications

### Phase 3: Navigation & Layout
- [ ] Top navigation bar
- [ ] Tab navigation
- [ ] Sidebar (if needed)
- [ ] Footer
- [ ] Page containers
- [ ] Loading states
- [ ] Empty states

### Phase 4: Page Redesigns
- [ ] Landing page with hero section
- [ ] Login page
- [ ] Signup page (multi-step form)
- [ ] Dashboard (users and groups tabs)
- [ ] Chat list page
- [ ] 1v1 Chat interface
- [ ] Group chat interface
- [ ] Profile pages (view, edit, complete)
- [ ] My Groups page
- [ ] My Identities page

### Phase 5: Special Features
- [ ] Anonymous mode styling
- [ ] Love reaction animations
- [ ] Typing indicators
- [ ] Online status with pulse
- [ ] Message read receipts
- [ ] Poll interface (group chats)
- [ ] Block/Report modals
- [ ] Theme toggle animation

### Phase 6: Responsive & Polish
- [ ] Mobile layouts (all pages)
- [ ] Tablet layouts
- [ ] Desktop layouts
- [ ] Touch target optimization
- [ ] Accessibility audit (WCAG AA)
- [ ] Performance optimization
- [ ] Micro-interactions
- [ ] Dark mode refinement

---

## 🎓 DESIGN PHILOSOPHY

### Why These Choices?

1. **Warm Gradients**: Creates emotional connection, perfect for love chats
2. **Soft Curves**: Approachable and friendly, reduces harshness
3. **Purple + Pink**: Combines trust (purple) with romance (pink)
4. **Dual Typography**: Rounded for fun, traditional for serious content
5. **Subtle Animations**: Delightful without being distracting
6. **Mobile-First**: Students primarily use phones
7. **Dark Mode**: Essential for late-night chats
8. **Visual Hierarchy**: Clear distinction between features (anon, group, regular)

### Brand Personality

**BYTE-CHAT should feel:**
- Warm & inviting (not cold tech)
- Playful & fun (not boring corporate)
- Trustworthy & secure (not sketchy)
- Modern & fresh (not outdated)
- Student-friendly (not overly formal)

---

**Last Updated**: February 28, 2026  
**Version**: 2.0 - Modern Romance Edition  
**Status**: Ready for Implementation

---

## 📞 NEXT STEPS

1. Review this design system
2. Create a prototype in Figma (optional but recommended)
3. Start implementation with core components
4. Test on real devices (especially mobile)
5. Iterate based on user feedback
6. Launch gradually (A/B test if possible)

**Remember**: All measurements are in pixels unless specified. Use rem for typography and spacing for better scalability. Always test on multiple devices and browsers.
