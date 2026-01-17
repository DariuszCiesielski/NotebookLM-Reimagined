# NotebookLM Reimagined - Complete UI Overhaul Specification

> A comprehensive guide to transforming NotebookLM Reimagined into a polished, production-ready research intelligence platform inspired by Google's NotebookLM.

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Dashboard Experience](#2-dashboard-experience)
3. [Create Notebook Journey](#3-create-notebook-journey) *(NEW)*
4. [Notebook Three-Panel Layout](#4-notebook-three-panel-layout)
5. [Sources Panel Deep Dive](#5-sources-panel-deep-dive)
6. [Chat Panel Deep Dive](#6-chat-panel-deep-dive)
7. [Studio Panel Deep Dive](#7-studio-panel-deep-dive)
8. [Audio Overview Experience](#8-audio-overview-experience)
9. [Interactions & Micro-animations](#9-interactions--micro-animations)
10. [Screen Transitions](#10-screen-transitions)
11. [Responsive Behavior](#11-responsive-behavior)
12. [Accessibility Requirements](#12-accessibility-requirements)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Design System Foundation

### 1.1 Color Palette

```css
/* Primary Background */
--bg-primary: #0f0f23;        /* Deep navy - main background */
--bg-secondary: #1a1a2e;      /* Slightly lighter - cards, panels */
--bg-tertiary: #252542;       /* Hover states, elevated surfaces */
--bg-surface: #2d2d4a;        /* Input fields, interactive areas */

/* Accent Colors */
--accent-primary: #7c8aff;    /* Primary actions, links */
--accent-secondary: #4ecdc4;  /* Citations, success states */
--accent-tertiary: #ff6b9d;   /* Warnings, important highlights */
--accent-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Text Colors */
--text-primary: #ffffff;      /* Headings, important text */
--text-secondary: #b4b4c7;    /* Body text, descriptions */
--text-tertiary: #6b6b80;     /* Muted text, timestamps */
--text-link: #7c8aff;         /* Links, interactive text */

/* Semantic Colors */
--success: #4ecdc4;           /* Success states, checkmarks */
--warning: #ffd93d;           /* Warnings, info banners */
--error: #ff6b6b;             /* Errors, destructive actions */
--info: #74b9ff;              /* Information, tips */

/* Source Type Colors */
--source-pdf: #ff6b6b;        /* PDF documents */
--source-doc: #4ecdc4;        /* Text/Doc files */
--source-web: #74b9ff;        /* Web links */
--source-video: #ffd93d;      /* Video content */
--source-audio: #a29bfe;      /* Audio content */
```

### 1.2 Typography Scale

```css
/* Font Family */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px - Timestamps, badges */
--text-sm: 0.875rem;    /* 14px - Secondary text, captions */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Emphasized body */
--text-xl: 1.25rem;     /* 20px - Section headers */
--text-2xl: 1.5rem;     /* 24px - Panel headers */
--text-3xl: 1.875rem;   /* 30px - Page titles */
--text-4xl: 2.25rem;    /* 36px - Hero text */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 1.3 Spacing System

```css
/* Base unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 1.4 Border Radius

```css
--radius-sm: 4px;     /* Small elements, badges */
--radius-md: 8px;     /* Buttons, inputs */
--radius-lg: 12px;    /* Cards, panels */
--radius-xl: 16px;    /* Large cards, modals */
--radius-2xl: 24px;   /* Pills, special elements */
--radius-full: 9999px; /* Circles, avatars */
```

### 1.5 Shadows & Elevation

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);
--shadow-glow: 0 0 20px rgba(124, 138, 255, 0.3);
```

### 1.6 Icon System

Use **Lucide React** icons consistently:
- **Size small**: 16px (inline with text)
- **Size medium**: 20px (buttons, list items)
- **Size large**: 24px (panel headers)
- **Stroke width**: 1.5px (default), 2px (emphasized)

---

## 2. Dashboard Experience

### 2.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                               │
│ [Logo] NotebookLM                    [Settings] [PRO] [Apps] [Avatar]│
├─────────────────────────────────────────────────────────────────────┤
│ NAVIGATION TABS                                                      │
│ [All] [My notebooks] [Featured] [Shared]    [Grid][List] [Sort ▼] [+]│
├─────────────────────────────────────────────────────────────────────┤
│ FEATURED NOTEBOOKS (Horizontal Carousel)                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│ │ Card 1  │ │ Card 2  │ │ Card 3  │ │ Card 4  │        [See all >]  │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                     │
├─────────────────────────────────────────────────────────────────────┤
│ RECENT NOTEBOOKS (Grid)                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│ │  + New  │ │Notebook1│ │Notebook2│ │Notebook3│                     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│ │Notebook4│ │Notebook5│ │Notebook6│ │Notebook7│                     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Header Component

**Structure:**
```tsx
<header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-50">
  {/* Left: Logo */}
  <Link href="/" className="flex items-center gap-2">
    <HomeIcon className="w-6 h-6 text-accent-primary" />
    <span className="text-xl font-semibold">NotebookLM</span>
  </Link>

  {/* Right: Actions */}
  <div className="flex items-center gap-4">
    <Button variant="ghost" size="icon"><Settings /></Button>
    <Badge variant="outline">PRO</Badge>
    <Button variant="ghost" size="icon"><Grid3x3 /></Button>
    <Avatar />
  </div>
</header>
```

**Interactions:**
- Logo click → Navigate to dashboard with fade transition
- Settings → Opens settings modal (slide up)
- PRO badge → Tooltip showing "Upgrade to Pro for more features"
- Avatar → Dropdown menu with account options

### 2.3 Navigation Tabs

**Visual Design:**
- Tabs displayed horizontally with subtle hover states
- Active tab has gradient underline indicator (2px height, accent gradient)
- Tabs: "All", "My notebooks", "Featured notebooks", "Shared with me"

**Tab Indicator Animation:**
```css
.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background: var(--accent-gradient);
  transition: left 0.3s ease, width 0.3s ease;
}
```

**Right Side Controls:**
- Grid/List view toggle (icon buttons with active state)
- Sort dropdown: "Most recent", "Alphabetical", "Last modified"
- "+ Create new" button: Gradient background, pill shape, hover lift effect

### 2.4 Featured Notebooks Carousel

**Card Design:**
```
┌────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Background image (full bleed)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ┌──────┐                          │
│ │ Icon │ Publisher Name           │ ← Publisher badge (top-left)
│ └──────┘                          │
│                                    │
│ Card Title That Can               │ ← Title (bold, white, max 2 lines)
│ Span Multiple Lines               │
│                                    │
│ May 12, 2025 · 17 sources    🌐   │ ← Date, source count, public icon
└────────────────────────────────────┘
```

**Interactions:**
- Hover: Slight scale up (1.02), shadow increase
- Click: Navigate to notebook with page transition
- Swipe (touch): Carousel navigation
- Arrow buttons appear on hover (desktop)

**Carousel Behavior:**
- 4 cards visible on desktop, 2 on tablet, 1 on mobile
- Smooth scroll snap
- "See all >" link navigates to full featured grid

### 2.5 Recent Notebooks Grid

**Create New Card:**
```
┌────────────────────────────────────┐
│            ╭─────────╮             │
│            │    +    │             │ ← Dashed circle with plus icon
│            ╰─────────╯             │
│                                    │
│       Create new notebook          │ ← Text label
└────────────────────────────────────┘
```
- Dashed border (2px, spaced)
- Hover: Border becomes solid, background tint

**Notebook Card:**
```
┌────────────────────────────────────┐
│ 📁                            ⋮   │ ← Emoji/icon + 3-dot menu
│                                    │
│                                    │
│ Notebook Title                     │ ← Title (truncate with ellipsis)
│ Dec 27, 2025 · 5 sources          │ ← Date + source count
└────────────────────────────────────┘
```

**Card Interactions:**
- Hover: Background lightens, shadow appears
- Click (body): Navigate to notebook
- Click (3-dot menu): Opens context menu
  - Rename
  - Duplicate
  - Change icon
  - Share
  - Delete (with confirmation)

**Context Menu Animation:**
- Fade in + scale from 0.95 to 1
- Duration: 150ms
- Origin: Top-right of button

---

## 3. Create Notebook Journey

This section documents the complete user flow from clicking "Create new notebook" to having a populated notebook ready for use.

### 3.1 Entry Points

Users can create a new notebook from two locations:
1. **Header button**: "+ Create new" in the top navigation (gradient pill button)
2. **Dashboard card**: "Create new notebook" card with dashed border and plus icon

### 3.2 New Notebook Empty State

When a notebook is first created, it shows a specialized empty state optimized for onboarding:

**Header Changes:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [←] [🏠] Untitled notebook              [+ Create] [Analytics] [Share] [⚙]│
└──────────────────────────────────────────────────────────────────────────┘
```
- Title is "Untitled notebook" (editable inline)
- New buttons appear: "Analytics", "Share"

**Three-Panel Layout (Empty State):**
```
┌──────────────────┬─────────────────────────────────┬─────────────────────┐
│ SOURCES          │           CHAT                  │       STUDIO        │
│                  │                                 │                     │
│ [+ Add sources]  │  ┌─────────────────────────┐   │ Audio Overview  📻  │
│                  │  │ Create Audio and Video  │   │ Video Overview  🎬  │
│ 💡 Try Deep      │  │ Overviews from          │   │ Mind Map        🗺  │
│    Research...   │  │ **your documents**      │   │ Reports         📄  │
│                  │  │            [X]          │   │ Flashcards      📇  │
│ ┌──────────────┐ │  └─────────────────────────┘   │ Quiz            ❓  │
│ │🔍 Search web │ │                                │ Infographic     📊  │
│ │for sources   │ │      ⬆️ Upload icon            │ Slide Deck      🎭  │
│ └──────────────┘ │                                │ Data Table      📋  │
│ [Web▼][Research▼]│  "Add a source to get started" │                     │
│                  │                                │ ─────────────────── │
│ 📄 Saved sources │  [Upload a source]             │                     │
│    will appear   │                                │ ✨ Studio output    │
│    here          │  ┌────┐┌────┐┌────┐┌────┐     │    will be saved    │
│                  │  │File││Web ││Drive││Text│     │    here...          │
│                  │  └────┘└────┘└────┘└────┘     │                     │
│                  │                                │ [+ Add note]        │
└──────────────────┴─────────────────────────────────┴─────────────────────┘
```

### 3.3 Hero Banner (Dismissible)

The center panel shows a promotional banner that cycles through different messages:
- "Create Audio and Video Overviews from **your documents**"
- "Create Audio and Video Overviews from **YouTube videos**"
- "Create Audio and Video Overviews from **your notes**"

**Implementation:**
```tsx
const HeroBanner = ({ onDismiss }) => {
  const highlights = ['your documents', 'YouTube videos', 'your notes'];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % highlights.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative p-6 rounded-2xl bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border border-white/10">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>

      <h2 className="text-xl text-center">
        Create Audio and Video Overviews from{' '}
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-accent-primary font-semibold"
        >
          {highlights[currentIndex]}
        </motion.span>
      </h2>
    </div>
  );
};
```

### 3.4 Source Upload Modal

Clicking "Upload a source" or "+ Add sources" opens a modal with 4 source type tabs:

**Modal Structure:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Create Audio and Video Overviews from **your notes**              [X]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search the web for new sources                                  │ │
│  │ [🌐 Web ▼] [✨ Fast Research ▼]                              [→]   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │                   or drop your files here                         │ │
│  │                                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │📤 Upload │  │🔗 Web    │  │📁 Drive  │  │📋 Copied │          │ │
│  │  │  files   │  │  sites   │  │          │  │   text   │          │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Upload Files Tab

Default tab - supports drag-and-drop or click to browse:

**Supported formats:**
- PDF documents
- Text files (.txt)
- Word documents (.docx)
- Markdown (.md)
- Audio files (.mp3, .wav)
- Video files (.mp4)

**Implementation:**
```tsx
const UploadFilesTab = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center transition-all",
        isDragging
          ? "border-accent-primary bg-accent-primary/10 scale-[1.02]"
          : "border-white/20 hover:border-white/40"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        onUpload(Array.from(e.dataTransfer.files));
      }}
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
      <p className="text-lg mb-2">Drop files here or click to browse</p>
      <p className="text-sm text-text-tertiary">
        PDF, TXT, DOCX, MD, MP3, MP4 (max 50MB)
      </p>
    </div>
  );
};
```

### 3.6 Websites Tab

Allows pasting URLs for web pages and YouTube videos:

**View Structure:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [←] Website and YouTube URLs                                       [X]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Paste in Website and YouTube URLs below to upload as a source in        │
│ NotebookLM.                                                              │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Paste any links                                                    │  │
│ │                                                                    │  │
│ │                                                                    │  │
│ │                                                                    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ • To add multiple URLs, separate with a space or new line               │
│ • Only the visible text on the website will be imported                 │
│ • Paid articles are not supported                                       │
│ • Only the text transcript in YouTube will be imported                  │
│ • Only public YouTube videos are supported                              │
│ • Recently uploaded videos may not be available                         │
│ • If upload fails, learn more for common reasons                        │
│                                                                          │
│                                                        [Insert]          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Google Drive Tab

Opens native Google Drive file picker:

**Picker Structure:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📁 Select items                  [🔍 Search in Drive or paste URL] [X]  │
├──────────────────────────────────────────────────────────────────────────┤
│ [Recent] [My Drive] [Shared with me] [Starred] [Computers]    [≡] [⊞]  │
├──────────────────────────────────────────────────────────────────────────┤
│ Recent                                                                   │
│ ─────────────────────────────────────────────────────────────────────── │
│ Last week                                                                │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│ │   📄         │  │   📊         │  │   📝         │                    │
│ │  [thumb]     │  │  [thumb]     │  │  [thumb]     │                    │
│ │              │  │              │  │              │                    │
│ │ 📕 Doc Name  │  │ 📗 Sheet     │  │ 📘 Doc       │                    │
│ └──────────────┘  └──────────────┘  └──────────────┘                    │
│                                                                          │
│ Earlier this month                                                       │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│ │   📄         │  │   📄         │  │   📄         │  │   📄         │ │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Search bar with filter options
- Tab navigation: Recent, My Drive, Shared with me, Starred, Computers
- Grid/List view toggle
- Grouped by time period (Last week, Earlier this month)
- File cards with:
  - Thumbnail preview
  - File type icon (color-coded: red=PDF, green=Sheets, blue=Docs)
  - Filename (truncated)

### 3.8 Copied Text Tab

Simple text paste interface:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [←] Paste copied text                                              [X]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Paste your copied text below to upload as a source in NotebookLM.       │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Paste text here                                                    │  │
│ │                                                                    │  │
│ │                                                                    │  │
│ │                                                                    │  │
│ │                                                                    │  │
│ │                                                                ⌟  │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                                                        [Insert]          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Resizable textarea (handle in bottom-right)
- Simple "Paste text here" placeholder
- "Insert" button to confirm

### 3.9 Fast Research Feature (AI-Powered Web Search)

The left panel includes an AI-powered web search that automatically finds relevant sources:

**Search Input:**
```tsx
const FastResearchSearch = ({ onResults }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web for new sources"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-surface border border-white/10 focus:border-accent-primary/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownSelect
          icon={<Globe className="w-4 h-4" />}
          label="Web"
          options={['Web', 'News', 'Academic']}
        />
        <DropdownSelect
          icon={<Sparkles className="w-4 h-4" />}
          label="Fast Research"
          options={['Fast Research', 'Deep Research']}
        />
        <Button
          size="icon"
          className="ml-auto rounded-xl bg-accent-primary"
          onClick={() => performSearch(query)}
          disabled={!query || isSearching}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
```

**Search Results:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✨ Fast Research completed!                                    [View]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 🌐 Ethics of artificial intelligence - Wiki...                     │  │
│ │    You get a high-level map of ethical s...                        │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 📕 On the troubled relation between A...                           │  │
│ │    You can examine the ideological rift...                         │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 📄 The Alignment Problem in Context...                             │  │
│ │    A technical look at why aligning curr...                        │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ 📚 7 more sources                                                       │
│                                                                          │
│ [👍] [👎]                                    [Delete]  [+ Import]        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Result Item Component:**
```tsx
const SearchResultItem = ({ result, isSelected, onToggle }) => (
  <div
    className={cn(
      "p-3 rounded-xl border transition-all cursor-pointer",
      isSelected
        ? "border-accent-primary bg-accent-primary/10"
        : "border-white/10 hover:border-white/20"
    )}
    onClick={onToggle}
  >
    <div className="flex items-start gap-3">
      <SourceIcon type={result.type} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{result.title}</p>
        <p className="text-sm text-text-tertiary truncate mt-1">
          {result.description}
        </p>
      </div>
      {isSelected && <Check className="w-5 h-5 text-accent-primary shrink-0" />}
    </div>
  </div>
);
```

### 3.10 Deep Research Feature

The "Try Deep Research" banner promotes an advanced research mode:

**Banner:**
```tsx
const DeepResearchBanner = () => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20">
    <div className="w-2 h-2 rounded-full bg-accent-secondary mt-2" />
    <div>
      <p className="text-sm">
        <span className="text-accent-secondary font-medium">Try Deep Research</span>
        {' '}for an in-depth report and new sources!
      </p>
    </div>
  </div>
);
```

**Deep Research generates:**
- Comprehensive research report
- Curated source list
- Key findings summary
- Takes longer but more thorough

### 3.11 Studio Panel (Full Feature Grid)

The Studio panel in a new notebook shows ALL available output types:

**Output Types Grid:**
```tsx
const studioOutputs = [
  { id: 'audio', icon: Radio, label: 'Audio Overview', color: 'text-purple-400' },
  { id: 'video', icon: Video, label: 'Video Overview', color: 'text-pink-400' },
  { id: 'mindmap', icon: GitBranch, label: 'Mind Map', color: 'text-blue-400' },
  { id: 'reports', icon: FileText, label: 'Reports', color: 'text-green-400' },
  { id: 'flashcards', icon: Layers, label: 'Flashcards', color: 'text-yellow-400' },
  { id: 'quiz', icon: HelpCircle, label: 'Quiz', color: 'text-orange-400' },
  { id: 'infographic', icon: BarChart3, label: 'Infographic', color: 'text-cyan-400' },
  { id: 'slides', icon: Presentation, label: 'Slide Deck', color: 'text-red-400' },
  { id: 'table', icon: Table, label: 'Data Table', color: 'text-emerald-400' },
];

const StudioOutputGrid = ({ onSelect, disabled }) => (
  <div className="grid grid-cols-2 gap-2">
    {studioOutputs.map(output => (
      <button
        key={output.id}
        onClick={() => onSelect(output.id)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 p-3 rounded-xl text-left transition-all",
          disabled
            ? "opacity-50 cursor-not-allowed bg-white/5"
            : "bg-white/5 hover:bg-white/10"
        )}
      >
        <output.icon className={cn("w-5 h-5", output.color)} />
        <span className="text-sm">{output.label}</span>
      </button>
    ))}
  </div>
);
```

**Disabled State Message:**
```tsx
const StudioEmptyState = () => (
  <div className="text-center p-6">
    <Wand2 className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
    <p className="text-sm text-text-secondary">
      Studio output will be saved here.
    </p>
    <p className="text-xs text-text-tertiary mt-2">
      After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
    </p>
  </div>
);
```

### 3.12 Add Note Button

At the bottom of Studio panel:
```tsx
const AddNoteButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-accent-primary/50 hover:bg-white/5 transition-all"
  >
    <MessageSquarePlus className="w-4 h-4" />
    <span className="text-sm">Add note</span>
  </button>
);
```

---

## 4. Notebook Three-Panel Layout

### 4.1 Overall Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                │
│ [←] [Logo] Notebook Title [Public ▼]              [+ Create] [⚙] [👤]   │
├────────────────┬─────────────────────────────┬───────────────────────────┤
│ SOURCES PANEL  │      CHAT PANEL             │     STUDIO PANEL          │
│ (280px)        │      (flexible)             │     (320px)               │
│                │                             │                           │
│ [Sources  ][⊞] │ [Chat                 ][⋮] │ [Studio              ][⊞] │
│                │                             │                           │
│ ☑ Select all   │  ┌─────────────────────┐   │ ┌─────────────────────┐   │
│                │  │  🎭                  │   │ │ 💡 These studio...  │   │
│ 📄 Source 1  ✓ │  │  Notebook Title     │   │ └─────────────────────┘   │
│ 📄 Source 2  ✓ │  │  9 sources          │   │                           │
│ 📄 Source 3  ✓ │  │                     │   │ ┌─────────────────────┐   │
│ 📄 Source 4  ✓ │  │  Summary text with  │   │ │ 🎧 Audio Overview   │   │
│ 📕 Source 5  ✓ │  │  **bold keywords**  │   │ │ 10 sources · 5d ago │   │
│ 📄 Source 6  ✓ │  │  inline...          │   │ └─────────────────────┘   │
│                │  │                     │   │                           │
│                │  │  [📋] [👍] [👎]     │   │ + Generate new            │
│                │  └─────────────────────┘   │                           │
│                │                             │ ━━━━━━━━━━━━━━━━━━━━━━━  │
│                │                             │                           │
│                │                             │ STUDY TOOLS               │
│                │                             │ ┌────────┐ ┌────────┐    │
│                │                             │ │Flashcrd│ │ Quiz   │    │
│                │                             │ └────────┘ └────────┘    │
│                │                             │ ┌────────┐ ┌────────┐    │
│                │                             │ │ Guide  │ │  FAQ   │    │
│                │                             │ └────────┘ └────────┘    │
│                │  ┌─────────────────────┐   │                           │
│                │  │ Start typing...  9  →│   │                           │
│                │  └─────────────────────┘   │                           │
│                │  NotebookLM can be...      │                           │
├────────────────┴─────────────────────────────┴───────────────────────────┤
```

### 3.2 Panel Sizing & Behavior

**Default Widths:**
- Sources Panel: 280px (collapsible to 0)
- Chat Panel: Flexible (min 400px)
- Studio Panel: 320px (collapsible to 0)

**Collapse Behavior:**
- Toggle icon in panel header
- Smooth width transition (300ms ease-out)
- Collapsed state shows thin bar (40px) with expand icon
- Panel content fades out before collapse

**Resize Behavior:**
- Draggable dividers between panels
- Min widths enforced
- Cursor changes to col-resize on hover
- Visual indicator line appears while dragging

### 3.3 Header Bar

**Structure:**
```tsx
<header className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-bg-primary/90 backdrop-blur-xl">
  {/* Left */}
  <div className="flex items-center gap-3">
    <Button variant="ghost" size="icon" onClick={goBack}>
      <ArrowLeft />
    </Button>
    <Link href="/">
      <HomeIcon className="w-5 h-5" />
    </Link>
    <EditableTitle value={title} onChange={setTitle} />
    <Badge variant="outline" className="cursor-pointer">
      Public <ChevronDown className="w-3 h-3 ml-1" />
    </Badge>
  </div>

  {/* Right */}
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      <Plus className="w-4 h-4 mr-1" /> Create notebook
    </Button>
    <Button variant="ghost" size="icon"><Settings /></Button>
    <Avatar />
  </div>
</header>
```

**Editable Title:**
- Click to edit (inline input appears)
- Enter or blur to save
- Escape to cancel
- Auto-save with debounce (500ms)

**Visibility Badge Dropdown:**
- Options: Public, Private, Shared (specific people)
- Click opens dropdown with radio options
- Change triggers confirmation toast

---

## 4. Sources Panel Deep Dive

### 4.1 Panel Header

```tsx
<div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
  <h2 className="text-sm font-semibold text-text-secondary">Sources</h2>
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon-sm" title="Add source">
      <Plus className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon-sm" title="Collapse panel">
      <PanelLeftClose className="w-4 h-4" />
    </Button>
  </div>
</div>
```

### 4.2 Source List States

**Empty State:**
```
┌────────────────────────────────────┐
│                                    │
│         📄                         │
│    No sources yet                  │
│                                    │
│    Add documents, websites,        │
│    or paste text to get started    │
│                                    │
│    [+ Add source]                  │
│                                    │
└────────────────────────────────────┘
```

**With Sources:**
```tsx
<div className="p-3">
  {/* Select All Row */}
  <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
    <span className="text-sm text-text-secondary">Select all sources</span>
  </div>

  {/* Source List */}
  <div className="mt-2 space-y-1">
    {sources.map(source => (
      <SourceItem key={source.id} source={source} />
    ))}
  </div>
</div>
```

### 4.3 Source Item Component

**Default State:**
```
┌────────────────────────────────────────────────┐
│ 📄  Source Title That Might Be Lo...    ☑     │
└────────────────────────────────────────────────┘
```

**Hover State:**
```
┌────────────────────────────────────────────────┐
│ ⋮  📄  Source Title That Might Be Lo...  ☑   │ ← 3-dot menu appears on hover
└────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
const SourceItem = ({ source, isSelected, onToggle, onView }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Drag Handle / Menu (appears on hover) */}
      <div className={cn("w-5 transition-opacity", showMenu ? "opacity-100" : "opacity-0")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>View source</DropdownMenuItem>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem>Download</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Source Icon */}
      <SourceIcon type={source.type} className="w-5 h-5 shrink-0" />

      {/* Title (clickable to view) */}
      <span
        className="flex-1 text-sm truncate hover:text-accent-primary"
        onClick={() => onView(source)}
      >
        {source.name}
      </span>

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(source.id)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
```

### 4.4 Source Icon System

```tsx
const SourceIcon = ({ type, className }) => {
  const config = {
    pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-400/10' },
    doc: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    text: { icon: FileText, color: 'text-teal-400', bg: 'bg-teal-400/10' },
    url: { icon: Globe, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    video: { icon: Video, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    audio: { icon: Mic, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  };

  const { icon: Icon, color, bg } = config[type] || config.doc;

  return (
    <div className={cn("p-1 rounded", bg, className)}>
      <Icon className={cn("w-4 h-4", color)} />
    </div>
  );
};
```

### 4.5 Source Detail View (Expanded)

When a source is clicked, the panel expands to show details:

**Transition:**
1. Panel width animates from 280px to 400px
2. Source list fades out (opacity 0, 150ms)
3. Detail view fades in (opacity 1, 150ms, delay 100ms)

**Detail View Structure:**
```
┌────────────────────────────────────────────────────────┐
│ [← Back]                                    [↗ Open]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Source Title That Can Be Much Longer Now              │
│ Added Dec 27, 2025                                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐│
│ │ ✨ Source guide                              [▼]   ││
│ │                                                    ││
│ │ This source examines the **rapid growth** of      ││
│ │ digital afterlife technology, focusing on         ││
│ │ **ethical concerns** and **regulatory needs**.    ││
│ │ The text highlights how **AI avatars** are        ││
│ │ being commercialized...                           ││
│ │                                                    ││
│ │ ┌──────────────┐ ┌──────────────┐                 ││
│ │ │ AI Avatars   │ │ Market Growth│                 ││
│ │ └──────────────┘ └──────────────┘                 ││
│ │ ┌──────────────┐ ┌──────────────┐                 ││
│ │ │ Ethical Conc │ │ Regulation   │                 ││
│ │ └──────────────┘ └──────────────┘                 ││
│ └────────────────────────────────────────────────────┘│
│                                                        │
│ CITATIONS                                              │
│ ┌─────────────────────────────────────────────┐       │
│ │ 1  WebProNews Article About Digital...      │       │
│ └─────────────────────────────────────────────┘       │
│ ┌─────────────────────────────────────────────┐       │
│ │ 2  TechCrunch Analysis of AI Market         │       │
│ └─────────────────────────────────────────────┘       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Source Guide Component:**
```tsx
const SourceGuide = ({ source }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-secondary" />
          <span className="font-medium">Source guide</span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            {/* Summary with bold keywords */}
            <p className="text-sm text-text-secondary leading-relaxed">
              <HighlightedText text={source.source_guide?.summary} />
            </p>

            {/* Key Topics */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {source.source_guide?.topics?.map((topic, i) => (
                <button
                  key={i}
                  className="px-3 py-2 text-xs text-left rounded-lg bg-white/5 hover:bg-white/10 truncate"
                >
                  {topic}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

**Highlighted Text (Bold Keywords):**
```tsx
const HighlightedText = ({ text }) => {
  // Parse text for **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-text-primary font-medium">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};
```

### 4.6 Add Source Modal

**Trigger:** Click "+" button in panel header or empty state button

**Modal Structure:**
```
┌──────────────────────────────────────────────────────────────┐
│ Add sources                                            [X]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │      📁 Drag and drop files here                    │   │
│  │         or click to browse                          │   │
│  │                                                      │   │
│  │      Supports: PDF, TXT, DOCX, MD (max 50MB)       │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ─────────────────── OR ───────────────────                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔗 Paste a URL                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📝 Paste text directly                              │   │
│  │                                                      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                                           [Cancel] [Add]    │
└──────────────────────────────────────────────────────────────┘
```

**Drag & Drop States:**
- Default: Dashed border
- Drag over: Solid border, background tint, scale up slightly
- Uploading: Progress bar overlay

---

## 5. Chat Panel Deep Dive

### 5.1 Panel Header

```tsx
<div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
  <h2 className="text-sm font-semibold text-text-secondary">Chat</h2>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon-sm">
        <MoreVertical className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>New chat</DropdownMenuItem>
      <DropdownMenuItem>View chat history</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Export chat</DropdownMenuItem>
      <DropdownMenuItem>Clear chat</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### 5.2 Initial State (Notebook Summary)

When no chat messages exist, show the AI-generated notebook summary:

```tsx
const NotebookSummary = ({ notebook, sources }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8">
    <div className="max-w-2xl w-full">
      {/* Icon/Emoji */}
      <div className="text-6xl mb-4">{notebook.icon || '📓'}</div>

      {/* Title */}
      <h1 className="text-3xl font-bold mb-2">{notebook.title}</h1>

      {/* Source Count */}
      <Badge variant="secondary" className="mb-6">
        {sources.length} sources
      </Badge>

      {/* Summary */}
      <div className="text-text-secondary leading-relaxed">
        <HighlightedText text={notebook.summary} />
      </div>

      {/* Feedback */}
      <div className="flex items-center gap-2 mt-6">
        <Button variant="ghost" size="sm">
          <Copy className="w-4 h-4 mr-1" /> Copy
        </Button>
        <Button variant="ghost" size="sm">
          <ThumbsUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ThumbsDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);
```

### 5.3 Chat Messages

**User Message:**
```tsx
const UserMessage = ({ message }) => (
  <div className="flex justify-end mb-4">
    <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-md bg-accent-primary/20 text-text-primary">
      {message.content}
    </div>
  </div>
);
```

**AI Message:**
```tsx
const AIMessage = ({ message }) => (
  <div className="mb-6">
    {/* Content */}
    <div className="prose prose-invert prose-sm max-w-none">
      <ParsedContent content={message.content} citations={message.citations} />
    </div>

    {/* Suggested Next Step (if present) */}
    {message.suggested_next_step && (
      <div className="mt-4 pt-4 border-t border-dashed border-white/20">
        <p className="text-sm">
          <strong className="text-accent-secondary">Suggested Next Step:</strong>{' '}
          {message.suggested_next_step}
        </p>
      </div>
    )}

    {/* Feedback */}
    <div className="flex items-center gap-2 mt-4">
      <Button variant="ghost" size="sm">
        <Copy className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <ThumbsUp className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <ThumbsDown className="w-4 h-4" />
      </Button>
    </div>

    {/* Follow-up Questions */}
    {message.suggested_questions?.length > 0 && (
      <div className="mt-4 space-y-2">
        {message.suggested_questions.map((q, i) => (
          <button
            key={i}
            className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-colors"
            onClick={() => submitQuestion(q)}
          >
            {q}
          </button>
        ))}
      </div>
    )}
  </div>
);
```

### 5.4 Citation System

**Inline Citation:**
```tsx
const Citation = ({ number, sourceId, onHover, onClick }) => (
  <button
    className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 transition-colors mx-0.5"
    onMouseEnter={() => onHover(sourceId)}
    onMouseLeave={() => onHover(null)}
    onClick={() => onClick(sourceId)}
  >
    {number}
  </button>
);
```

**Citation Hover Preview:**
```tsx
const CitationPreview = ({ source, position }) => (
  <div
    className="absolute z-50 w-80 p-4 rounded-xl bg-bg-tertiary border border-white/10 shadow-xl"
    style={{ top: position.y + 10, left: position.x }}
  >
    <div className="flex items-start gap-3">
      <SourceIcon type={source.type} className="mt-1" />
      <div>
        <p className="font-medium text-sm">{source.name}</p>
        <p className="text-xs text-text-tertiary mt-1">
          {source.excerpt?.slice(0, 150)}...
        </p>
      </div>
    </div>
  </div>
);
```

**Parsed Content with Citations:**
```tsx
const ParsedContent = ({ content, citations }) => {
  // Parse markdown-style content and replace [1], [2] etc with Citation components
  const parseContent = (text) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const num = parseInt(match[1]);
        const citation = citations.find(c => c.number === num);
        return <Citation key={i} number={num} sourceId={citation?.source_id} />;
      }

      // Handle **bold** text
      if (part.includes('**')) {
        return <HighlightedText key={i} text={part} />;
      }

      return <span key={i}>{part}</span>;
    });
  };

  // Split into sections (### headers) and bullet points
  const sections = content.split(/(?=###\s)/);

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        if (section.startsWith('### ')) {
          const [header, ...rest] = section.split('\n');
          return (
            <div key={i}>
              <h3 className="text-base font-semibold mt-4 mb-2">
                {header.replace('### ', '')}
              </h3>
              <div>{parseContent(rest.join('\n'))}</div>
            </div>
          );
        }
        return <p key={i}>{parseContent(section)}</p>;
      })}
    </div>
  );
};
```

### 5.5 Chat Input

```tsx
const ChatInput = ({ onSubmit, selectedSourceCount }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit(message);
    setMessage('');
  };

  return (
    <div className="p-4 border-t border-white/10">
      <div className="flex items-end gap-2 p-2 rounded-2xl bg-bg-surface border border-white/10 focus-within:border-accent-primary/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Start typing..."
          className="flex-1 bg-transparent resize-none outline-none text-sm min-h-[24px] max-h-[150px] py-1 px-2"
          rows={1}
        />

        {/* Source Count Badge */}
        <Badge variant="secondary" className="shrink-0 mb-1">
          {selectedSourceCount} sources
        </Badge>

        {/* Submit Button */}
        <Button
          size="icon"
          className="shrink-0 rounded-xl bg-accent-primary hover:bg-accent-primary/80"
          onClick={handleSubmit}
          disabled={!message.trim()}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-text-tertiary text-center mt-2">
        NotebookLM can be inaccurate; please double check its responses.
      </p>
    </div>
  );
};
```

### 5.6 Loading State

**Typing Indicator:**
```tsx
const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-4">
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-accent-primary animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
    <span className="text-sm text-text-tertiary ml-2">Thinking...</span>
  </div>
);
```

**Streaming Response:**
- Text appears word-by-word with cursor
- Citations appear inline as they're generated
- Smooth scroll to keep latest content visible

---

## 6. Studio Panel Deep Dive

### 6.1 Panel Header

```tsx
<div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
  <h2 className="text-sm font-semibold text-text-secondary">Studio</h2>
  <Button variant="ghost" size="icon-sm" title="Collapse panel">
    <PanelRightClose className="w-4 h-4" />
  </Button>
</div>
```

### 6.2 Info Banner

```tsx
const InfoBanner = ({ message, onDismiss }) => (
  <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
    <div className="flex items-start gap-3">
      <Lightbulb className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      <p className="text-sm text-text-secondary flex-1">{message}</p>
      {onDismiss && (
        <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  </div>
);
```

### 6.3 Audio Overview Section

**Generated Audio Card:**
```tsx
const AudioOverviewCard = ({ audio, onClick }) => (
  <button
    className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors group"
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      {/* Host Avatars */}
      <div className="flex -space-x-2">
        <Avatar className="w-8 h-8 border-2 border-bg-secondary">
          <AvatarImage src="/host-1.png" />
          <AvatarFallback>H1</AvatarFallback>
        </Avatar>
        <Avatar className="w-8 h-8 border-2 border-bg-secondary">
          <AvatarImage src="/host-2.png" />
          <AvatarFallback>H2</AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate group-hover:text-accent-primary transition-colors">
          {audio.title}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          {audio.source_count} sources · {formatRelativeTime(audio.created_at)}
        </p>
      </div>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Play</DropdownMenuItem>
          <DropdownMenuItem>View mind map</DropdownMenuItem>
          <DropdownMenuItem>Download</DropdownMenuItem>
          <DropdownMenuItem>Share</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </button>
);
```

**Generate New Button:**
```tsx
const GenerateAudioButton = ({ onClick, isGenerating }) => (
  <button
    className="w-full mt-3 px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-accent-primary/50 hover:bg-white/5 text-sm text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-2"
    onClick={onClick}
    disabled={isGenerating}
  >
    {isGenerating ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating...
      </>
    ) : (
      <>
        <Plus className="w-4 h-4" />
        Generate new audio overview
      </>
    )}
  </button>
);
```

### 6.4 Study Tools Section

```tsx
const StudyToolsSection = () => {
  const [generating, setGenerating] = useState(null);

  const tools = [
    { id: 'flashcards', icon: Layers, label: 'Flashcards', color: 'text-blue-400' },
    { id: 'quiz', icon: HelpCircle, label: 'Quiz', color: 'text-purple-400' },
    { id: 'guide', icon: BookOpen, label: 'Study guide', color: 'text-green-400' },
    { id: 'faq', icon: MessageSquare, label: 'FAQ', color: 'text-orange-400' },
  ];

  return (
    <div className="px-4 py-4">
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
        Study Tools
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {tools.map(tool => (
          <button
            key={tool.id}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors group"
            onClick={() => handleGenerate(tool.id)}
            disabled={generating === tool.id}
          >
            <tool.icon className={cn("w-6 h-6 mb-2", tool.color)} />
            <p className="text-sm font-medium">{tool.label}</p>
            {generating === tool.id && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-accent-primary animate-progress" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 6.5 Study Materials Display (Sheet/Slide-Over)

When study materials are generated, they open in a sheet from the right:

```tsx
const StudyMaterialsSheet = ({ type, data, open, onClose }) => (
  <Sheet open={open} onOpenChange={onClose}>
    <SheetContent side="right" className="w-full max-w-lg">
      <SheetHeader>
        <SheetTitle>{getTitle(type)}</SheetTitle>
      </SheetHeader>

      <div className="mt-6 overflow-y-auto h-[calc(100vh-120px)]">
        {type === 'flashcards' && <FlashcardsView cards={data} />}
        {type === 'quiz' && <QuizView questions={data} />}
        {type === 'guide' && <StudyGuideView guide={data} />}
        {type === 'faq' && <FAQView items={data} />}
      </div>
    </SheetContent>
  </Sheet>
);
```

**Flashcards View:**
```tsx
const FlashcardsView = ({ cards }) => {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center">
      {/* Progress */}
      <div className="w-full flex items-center justify-between mb-4 text-sm text-text-tertiary">
        <span>Card {current + 1} of {cards.length}</span>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i === current ? "bg-accent-primary" : "bg-white/20"
              )}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full aspect-[3/2] perspective-1000 cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <div className={cn(
          "relative w-full h-full transition-transform duration-500 transform-style-3d",
          flipped && "rotate-y-180"
        )}>
          {/* Front */}
          <div className="absolute inset-0 p-6 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 backface-hidden flex items-center justify-center text-center">
            <p className="text-lg font-medium">{cards[current].front}</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 p-6 rounded-2xl bg-gradient-to-br from-accent-secondary/20 to-accent-primary/20 backface-hidden rotate-y-180 flex items-center justify-center text-center">
            <p className="text-base text-text-secondary">{cards[current].back}</p>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-text-tertiary mt-4">Click card to flip</p>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrent(Math.min(cards.length - 1, current + 1))}
          disabled={current === cards.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
```

**Quiz View:**
```tsx
const QuizView = ({ questions }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const question = questions[currentQ];

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === question.correct_index) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentQ(currentQ + 1);
  };

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-text-tertiary mb-2">
          <span>Question {currentQ + 1} of {questions.length}</span>
          <span>Score: {score}/{currentQ + (showResult ? 1 : 0)}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent-primary transition-all"
            style={{ width: `${((currentQ + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h3 className="text-lg font-medium mb-6">{question.question}</h3>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, i) => (
          <button
            key={i}
            className={cn(
              "w-full p-4 rounded-xl text-left transition-all",
              !showResult && "bg-white/5 hover:bg-white/10",
              showResult && i === question.correct_index && "bg-green-500/20 border border-green-500",
              showResult && selectedAnswer === i && i !== question.correct_index && "bg-red-500/20 border border-red-500"
            )}
            onClick={() => !showResult && handleAnswer(i)}
            disabled={showResult}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                !showResult && "border-white/30",
                showResult && i === question.correct_index && "border-green-500 bg-green-500 text-white",
                showResult && selectedAnswer === i && i !== question.correct_index && "border-red-500 bg-red-500 text-white"
              )}>
                {String.fromCharCode(65 + i)}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Explanation (shown after answering) */}
      {showResult && question.explanation && (
        <div className="mt-4 p-4 rounded-xl bg-white/5">
          <p className="text-sm text-text-secondary">{question.explanation}</p>
        </div>
      )}

      {/* Next Button */}
      {showResult && currentQ < questions.length - 1 && (
        <Button className="w-full mt-6" onClick={nextQuestion}>
          Next Question
        </Button>
      )}

      {/* Final Score */}
      {showResult && currentQ === questions.length - 1 && (
        <div className="mt-6 text-center p-6 rounded-xl bg-accent-primary/10">
          <p className="text-2xl font-bold">{Math.round((score / questions.length) * 100)}%</p>
          <p className="text-text-secondary">You got {score} out of {questions.length} correct!</p>
        </div>
      )}
    </div>
  );
};
```

---

## 7. Audio Overview Experience

### 7.1 Navigation Flow

```
Notebook Page → Click Audio Card → Audio Overview Page (full screen)
                                         ↓
                                    Mind Map View
                                         ↓
                              Click Topic → Expand subtopics
                                         ↓
                              Click ">" → Drill into details
```

### 7.2 Audio Overview Page Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [← Back]  Audio Title                              [Share] [Download]    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                     ┌─────────────────────────────────┐                  │
│                     │   🎧 Audio Player               │                  │
│                     │   ▶ 00:00 ────────○──── 12:34   │                  │
│                     │   [1x] [<<] [▶] [>>] [🔊]       │                  │
│                     └─────────────────────────────────┘                  │
│                                                                          │
│  Subtitle: AI Personas: Grief, Commerce, and Ethical Crossroads          │
│  Based on 10 sources                                                     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        INTERACTIVE MIND MAP                              │
│                                                                          │
│           ┌──────────────┐                                              │
│           │ Root Topic   │──────┐                                       │
│           └──────────────┘      │                                       │
│                                 ├──→ ┌────────────────┐                 │
│                                 │    │ Topic 1     >  │                 │
│                                 │    └────────────────┘                 │
│                                 │                                       │
│                                 ├──→ ┌────────────────┐                 │
│                                 │    │ Topic 2     >  │                 │
│                                 │    └────────────────┘                 │
│                                 │                                       │
│                                 └──→ ┌────────────────┐                 │
│                                      │ Topic 3     >  │                 │
│                                      └────────────────┘                 │
│                                                                          │
│  [👍 Good content]  [👎 Bad content]            [◇] [+] [-]             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Mind Map Implementation

**Data Structure:**
```typescript
interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  timestamp?: number;  // Position in audio
  expanded?: boolean;
}
```

**Mind Map Component:**
```tsx
const MindMap = ({ data, onNodeClick }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Zoomable/Pannable Container */}
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
        }}
      >
        <svg className="w-full h-full">
          {/* Render connections (bezier curves) */}
          {renderConnections(data, expandedNodes)}
        </svg>

        {/* Render nodes */}
        {renderNodes(data, expandedNodes, toggleNode, onNodeClick)}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button variant="outline" size="icon" onClick={() => setExpandedNodes(new Set())}>
          <Minimize2 className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(z + 0.2, 2))}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}>
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      {/* Feedback */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button variant="outline" size="sm">
          <ThumbsUp className="w-4 h-4 mr-1" /> Good content
        </Button>
        <Button variant="outline" size="sm">
          <ThumbsDown className="w-4 h-4 mr-1" /> Bad content
        </Button>
      </div>
    </div>
  );
};
```

**Mind Map Node:**
```tsx
const MindMapNode = ({ node, isExpanded, onToggle, onClick, depth }) => {
  const hasChildren = node.children && node.children.length > 0;

  // Different styles based on depth
  const styles = {
    0: "bg-accent-primary/30 px-6 py-4 text-lg font-semibold", // Root
    1: "bg-bg-tertiary px-4 py-3 text-base font-medium",        // Main topics
    2: "bg-accent-secondary/20 px-3 py-2 text-sm",              // Subtopics
    3: "bg-accent-secondary/10 px-3 py-2 text-xs",              // Details
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Collapse Arrow (left) */}
      {hasChildren && depth > 0 && (
        <button
          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          onClick={() => onToggle(node.id)}
        >
          <ChevronLeft className={cn("w-4 h-4", isExpanded && "rotate-180")} />
        </button>
      )}

      {/* Node Content */}
      <div
        className={cn(
          "rounded-xl cursor-pointer transition-all hover:scale-105",
          styles[Math.min(depth, 3)]
        )}
        onClick={() => onClick(node)}
      >
        {node.label}
      </div>

      {/* Expand Arrow (right) */}
      {hasChildren && (
        <button
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          onClick={() => onToggle(node.id)}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
```

**Bezier Connections:**
```tsx
const BezierConnection = ({ from, to }) => {
  const midX = (from.x + to.x) / 2;

  return (
    <path
      d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="2"
      fill="none"
    />
  );
};
```

### 7.4 Audio Player

```tsx
const AudioPlayer = ({ src, title, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  return (
    <div className="bg-bg-tertiary rounded-2xl p-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-accent-primary" />
        </div>
        <span className="font-medium">{title}</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Slider
          value={[currentTime]}
          max={duration}
          step={1}
          onValueChange={([v]) => {
            audioRef.current.currentTime = v;
            setCurrentTime(v);
          }}
        />
        <div className="flex justify-between text-xs text-text-tertiary mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setPlaybackRate(r => r === 2 ? 0.5 : r + 0.25)}>
          {playbackRate}x
        </Button>

        <Button variant="ghost" size="icon" onClick={() => audioRef.current.currentTime -= 10}>
          <SkipBack className="w-5 h-5" />
        </Button>

        <Button
          size="icon"
          className="w-12 h-12 rounded-full bg-accent-primary"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={() => audioRef.current.currentTime += 10}>
          <SkipForward className="w-5 h-5" />
        </Button>

        <VolumeControl audioRef={audioRef} />
      </div>

      <audio ref={audioRef} src={src} />
    </div>
  );
};
```

---

## 8. Interactions & Micro-animations

### 8.1 Button States

```css
/* Default Button */
.btn {
  transition: all 0.15s ease;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn:active {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

### 8.2 Card Hover Effects

```css
.card {
  transition: all 0.2s ease;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.15);
}
```

### 8.3 Loading Animations

**Skeleton Pulse:**
```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-surface) 50%, var(--bg-tertiary) 100%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}
```

**Progress Bar:**
```css
@keyframes progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-progress {
  animation: progress 1.5s ease-in-out infinite;
}
```

**Typing Dots:**
```css
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.typing-dot {
  animation: bounce 1.4s ease-in-out infinite;
}
```

### 8.4 Panel Transitions

**Collapse/Expand:**
```tsx
const Panel = ({ collapsed, children }) => (
  <motion.div
    initial={false}
    animate={{
      width: collapsed ? 40 : 280,
      opacity: collapsed ? 0.5 : 1
    }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="relative"
  >
    <motion.div
      animate={{ opacity: collapsed ? 0 : 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>

    {collapsed && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Button variant="ghost" size="icon">
          <PanelLeftOpen />
        </Button>
      </motion.div>
    )}
  </motion.div>
);
```

### 8.5 Toast Notifications

```tsx
const Toast = ({ type, message, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl",
      type === 'success' && "bg-green-500/20 border border-green-500/30",
      type === 'error' && "bg-red-500/20 border border-red-500/30",
      type === 'info' && "bg-blue-500/20 border border-blue-500/30"
    )}
  >
    <StatusIcon type={type} />
    <span className="flex-1">{message}</span>
    {action && (
      <Button variant="ghost" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </motion.div>
);
```

### 8.6 Flashcard Flip Animation

```css
.perspective-1000 {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}
```

---

## 9. Screen Transitions

### 9.1 Page Navigation

**Dashboard → Notebook:**
```tsx
// In app/layout.tsx
<motion.main
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  {children}
</motion.main>
```

### 9.2 Modal Animations

**Standard Modal:**
```tsx
const Modal = ({ open, children }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-bg-secondary rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```

**Sheet (Slide-Over):**
```tsx
const Sheet = ({ open, side = 'right', children }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-40"
        />

        <motion.div
          initial={{ x: side === 'right' ? '100%' : '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: side === 'right' ? '100%' : '-100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "fixed top-0 bottom-0 w-full max-w-md bg-bg-secondary z-50",
            side === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```

### 9.3 Content Transitions

**Chat Message Appearance:**
```tsx
const ChatMessage = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {/* message content */}
  </motion.div>
);
```

**Source List Stagger:**
```tsx
const SourceList = ({ sources }) => (
  <motion.div>
    {sources.map((source, i) => (
      <motion.div
        key={source.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <SourceItem source={source} />
      </motion.div>
    ))}
  </motion.div>
);
```

---

## 10. Responsive Behavior

### 10.1 Breakpoints

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 640px) {
  /* Stack panels vertically */
  /* Bottom sheet for Studio */
  /* Full-screen source detail */
}

@media (min-width: 640px) and (max-width: 1024px) {
  /* Two panels: Sources + Chat OR Chat + Studio */
  /* Toggle between panels */
}

@media (min-width: 1024px) {
  /* Full three-panel layout */
}
```

### 10.2 Mobile Layout

```
┌─────────────────────────┐
│ HEADER                  │
├─────────────────────────┤
│                         │
│      CHAT PANEL         │
│      (full width)       │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ [📁] [💬] [🎨]          │  ← Bottom tabs: Sources, Chat, Studio
└─────────────────────────┘
```

**Mobile Navigation:**
- Bottom tab bar for panel switching
- Sources opens as bottom sheet (70% height)
- Studio opens as bottom sheet (70% height)
- Full-screen modals for detail views

### 10.3 Tablet Layout

```
┌───────────────────┬─────────────────────────┐
│ SOURCES           │      CHAT               │
│ (sidebar)         │      (main)             │
│                   │                         │
│ [toggle]          │                         │
└───────────────────┴─────────────────────────┘

OR

┌─────────────────────────┬───────────────────┐
│      CHAT               │     STUDIO        │
│      (main)             │     (sidebar)     │
│                         │                   │
│                         │     [toggle]      │
└─────────────────────────┴───────────────────┘
```

---

## 11. Accessibility Requirements

### 11.1 Keyboard Navigation

- **Tab**: Move between interactive elements
- **Enter/Space**: Activate buttons, toggle checkboxes
- **Arrow keys**: Navigate lists, carousel items
- **Escape**: Close modals, cancel actions
- **Ctrl/Cmd + Enter**: Submit forms

### 11.2 Screen Reader Support

```tsx
// Announce dynamic content
<div role="status" aria-live="polite">
  {isLoading ? 'Loading...' : 'Content loaded'}
</div>

// Label icons
<Button aria-label="Close modal">
  <X aria-hidden="true" />
</Button>

// Describe complex components
<div role="region" aria-label="Chat messages">
  {messages.map(msg => (
    <article
      key={msg.id}
      aria-label={`${msg.role} message: ${msg.content.slice(0, 50)}...`}
    >
      {/* content */}
    </article>
  ))}
</div>
```

### 11.3 Focus Management

```tsx
// Focus trap in modals
const Modal = ({ open }) => {
  const firstFocusRef = useRef();

  useEffect(() => {
    if (open) {
      firstFocusRef.current?.focus();
    }
  }, [open]);

  return (
    <FocusTrap active={open}>
      <div>
        <button ref={firstFocusRef}>First focusable</button>
        {/* modal content */}
      </div>
    </FocusTrap>
  );
};
```

### 11.4 Color Contrast

- Text on backgrounds: minimum 4.5:1 contrast ratio
- Large text (18px+): minimum 3:1 contrast ratio
- Interactive elements: visible focus rings
- Don't rely solely on color to convey information

---

## 12. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:**
- [ ] Set up design system (colors, typography, spacing)
- [ ] Create base component library (Button, Input, Card, Badge, Avatar)
- [ ] Implement responsive layout structure
- [ ] Set up Framer Motion for animations

**Files to create/modify:**
- `tailwind.config.ts` - Theme configuration
- `components/ui/*` - Base UI components
- `app/layout.tsx` - Root layout with transitions
- `lib/utils.ts` - Utility functions

### Phase 2: Dashboard (Week 2-3)

**Goals:**
- [ ] Header with navigation
- [ ] Tab navigation with indicator
- [ ] Featured notebooks carousel
- [ ] Recent notebooks grid
- [ ] Create notebook modal
- [ ] Notebook context menu

**Files:**
- `app/page.tsx` - Dashboard page
- `components/dashboard/*` - Dashboard components
- `components/notebook-card.tsx`

### Phase 3: Three-Panel Layout (Week 3-4)

**Goals:**
- [ ] Responsive three-panel container
- [ ] Panel collapse/expand functionality
- [ ] Resizable dividers
- [ ] Mobile panel navigation

**Files:**
- `app/notebooks/[id]/page.tsx` - Notebook page
- `components/panels/*` - Panel components
- `hooks/usePanelResize.ts`

### Phase 4: Sources Panel (Week 4-5)

**Goals:**
- [ ] Source list with checkboxes
- [ ] Source detail view with guide
- [ ] Add source modal
- [ ] File upload with drag-and-drop
- [ ] URL/text paste functionality

**Files:**
- `components/sources/*`
- `hooks/useSourceUpload.ts`

### Phase 5: Chat Panel (Week 5-6)

**Goals:**
- [ ] Notebook summary display
- [ ] Chat message components
- [ ] Citation system (inline + hover)
- [ ] Chat input with auto-resize
- [ ] Suggested questions
- [ ] Streaming responses

**Files:**
- `components/chat/*`
- `hooks/useChat.ts`
- `lib/parse-citations.ts`

### Phase 6: Studio Panel (Week 6-7)

**Goals:**
- [ ] Audio overview card
- [ ] Study tools grid
- [ ] Flashcards view
- [ ] Quiz view
- [ ] Study guide view
- [ ] FAQ view
- [ ] Study materials sheet

**Files:**
- `components/studio/*`
- `components/study/*`

### Phase 7: Audio Overview (Week 7-8)

**Goals:**
- [ ] Audio player component
- [ ] Interactive mind map
- [ ] Zoom/pan controls
- [ ] Node expand/collapse
- [ ] Bezier connections
- [ ] Topic-timestamp sync

**Files:**
- `app/notebooks/[id]/audio/[audioId]/page.tsx`
- `components/audio/*`
- `components/mind-map/*`

### Phase 8: Polish & Testing (Week 8-9)

**Goals:**
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Error states and boundaries
- [ ] Loading skeletons
- [ ] Toast notifications
- [ ] Keyboard shortcuts
- [ ] Cross-browser testing

---

## Appendix: Component Checklist

### Core UI Components
- [ ] Button (variants: primary, secondary, ghost, outline)
- [ ] Input (text, textarea, search)
- [ ] Checkbox
- [ ] Badge
- [ ] Avatar
- [ ] Card
- [ ] Dropdown Menu
- [ ] Dialog/Modal
- [ ] Sheet
- [ ] Tabs
- [ ] Slider
- [ ] Progress
- [ ] Skeleton
- [ ] Toast

### Layout Components
- [ ] Header
- [ ] PanelContainer
- [ ] Panel (collapsible)
- [ ] ResizeHandle

### Feature Components
- [ ] NotebookCard
- [ ] SourceItem
- [ ] SourceDetail
- [ ] SourceGuide
- [ ] ChatMessage
- [ ] Citation
- [ ] CitationPreview
- [ ] ChatInput
- [ ] AudioOverviewCard
- [ ] StudyToolCard
- [ ] FlashcardsView
- [ ] QuizView
- [ ] StudyGuideView
- [ ] FAQView
- [ ] MindMap
- [ ] MindMapNode
- [ ] AudioPlayer

---

*This specification document should be treated as a living document and updated as implementation progresses and new requirements emerge.*
