# Seekora Frontend Architecture Documentation
**Version:** 1.0.0  
**Status:** Approved  
**Author:** Principal Frontend Architect  
**Date:** 2026-02-14  

---

## 1. Executive Summary & Philosophy

Seekora is not a clone; it is an evolution of the search experience. Our frontend architecture is built on the premise that **speed is a feature** and **intelligence is the interface**.

We are building a **High-Performance Computational Interface** (HPCI). Every interaction must resolve in <16ms (60fps). Network waterfalls are forbidden. We assume the user is busy, impatient, and demanding.

### CORE TENETS
1.  **Zero-Latency Perception:** Use optimistic UI, aggressive prefetching, and skeleton states to mask network latency. The user should never stare at a white screen.
2.  **Input-First Design:** The search bar is not just an input; it is a command center. It must handle complex intents (calculations, navigation, conversions) locally before reaching the server.
3.  **Adaptive Interface:** The UI morphs based on query intent (e.g., "weather in Tokyo" renders a weather card, not a list of links).
4.  **Accessibility as a Baseline:** WCAG 2.1 AA compliance is mandatory. Screen readers, keyboard navigation, and motion reduction are first-class citizens.

---

## 2. Technology Stack & Constraints

We utilize a modern, type-safe, and performance-oriented stack.

| Category | Technology | Rationale |
| :--- | :--- | :--- |
| **Core Framework** | **React 19 (RC/Latest)** | Leveraging modern concurrency features (Transitions, Suspense) for fluid UI updates without blocking the main thread. |
| **Language** | **TypeScript 5.x** | Non-negotiable for enterprise scale. Strict null checks and extensive interface definitions for API responses. |
| **Build System** | **Vite** | Instant dev server start, ESBuild-based bundling. Replaces Webpack for speed. |
| **Styling** | **Tailwind CSS 4.0** | Utility-first for low bundle size. Configured with a distinct "Seekora Design System" theme. |
| **State Management** | **Zustand + React Query** | `Zustand` for client UI state (sidebar, theme). `TanStack Query` for server state (caching, deduping, background refetch). |
| **Routing** | **React Router 6.x** | Data routers for parallel data fetching (render-as-you-fetch pattern). |
| **Icons** | **Lucide React** | Consistent, tree-shakeable SVG icons. |
| **Performance** | **Million.js / React Compiler** | Optimized virtual DOM for massive result lists. |

---

## 3. Directory Structure (Domain-Driven Design)

We avoid the "group by file type" (components/hooks/utils) trap. Instead, we group by **Domain Features** to ensure maintainability at scale.

```text
/src
├── /app                    # Application Entry & Layouts
│   ├── /providers          # Global Context Providers (Theme, Auth, QueryClient)
│   ├── /routes             # Route definitions & Lazy Load barriers
│   └── App.tsx             # Root Component
│
├── /core                   # Core "Seekora" Design System (The "Lego Blocks")
│   ├── /primitives         # Low-level accessible UI (Button, Input, Card)
│   ├── /typography         # Text styles (Heading, Paragraph, Code)
│   └── /animations         # Shared Framer Motion variants
│
├── /features               # Feature Domains (The "Brain")
│   ├── /search             # Core Search Logic
│   │   ├── /components     # SearchBar, ResultList, Filters
│   │   ├── /hooks          # useSearch, useAutocomplete, useFilters
│   │   ├── /stores         # searchStore.ts (Filters, Query state)
│   │   ├── /types          # Domain interfaces (SearchResult, Aggregation)
│   │   └── /utils          # Query parsers, highlighting logic
│   │
│   ├── /intelligence       # AI & Enhancements
│   │   ├── /components     # KnowledgeGraph, QuickAnswer, Calculator
│   │   └── /services       # Intent detection logic
│   │
│   ├── /user               # User features
│   │   ├── /history        # Recent searches, collections
│   │   └── /preferences    # Dark mode, region, safe search
│
├── /services               # API & External Communication
│   ├── /api                # Axios/Fetch instances with interceptors
│   ├── /analytics          # User behavior tracking (Privacy-focused)
│   └── /realtime           # WebSocket connections (Trending, Notifications)
│
├── /lib                    # Shared Utilities
│   ├── /constants          # Config flags, magic numbers
│   ├── /helpers            # Date formatting, String manipulation
│   └── /hooks              # Generic hooks (useDebounce, useIntersectionObserver)
│
└── /assets                 # Static assets (Optimized)
```

---

## 4. Key Architectural Patterns

### 4.1 The "Search Brain" (State Management)
Search is complex. We cannot rely on simple `useState`.
*   **URL as Source of Truth:** The URL parameters (`?q=tesla&t=news&sort=date`) are the *primary* state.
*   **Sync:** A custom hook `useUrlSync` continuously creates a bidirectional binding between the URL and the `SearchStore` (Zustand).
*   **Stale-While-Revalidate:** We use `TanStack Query` to cache results. If a user hits "Back", results render **instantly** from memory.

### 4.2 Component Composition Strategy
We use a **Slot-Based Architecture** for the Result Card to handle diverse content types without massive `if/else` chains.

```tsx
// Pattern: Composition over Inheritance
<ResultCard variant="standard">
  <ResultHeader icon={<Globe />} site="wikipedia.org" />
  <ResultTitle>Tesla, Inc. - Wikipedia</ResultTitle>
  <ResultSnippet terms={["Tesla", "EV"]}>
    Tesla is an American multinational automotive...
  </ResultSnippet>
  <ResultFooter>
    <Tag>Public Company</Tag> <Tag>Automotive</Tag>
  </ResultFooter>
</ResultCard>
```

### 4.3 Performance Strategy: The "60fps" Rule
1.  **Interaction to Paint (INP) Optimization:**
    *   Heavy computations (grouping results, highlighting terms) move to a **Web Worker**.
    *   `useTransition` wraps filter changes to keep the UI responsive while fetching.
2.  **Virtualization:**
    *   The result list is **virtualized** (windowed). We only render the ~10 items visible in the viewport. DOM nodes remain constant even with 10k results.
3.  **Image Optimization:**
    *   Images use a custom `BlurImage` component that shows a base64 encoded tiny placeholder before lazy-loading the full asset.
4.  **Code Splitting:**
    *   Secondary features (Advanced Settings, Knowledge Graph, Calculator) are lazy-loaded via `React.lazy`.

---

## 5. Feature Implementation: Deep Dive

### 5.1 The "Omnibox" (Search Bar)
This is the heart of Seekora.
*   **Debounce Strategy:** 150ms debounce for typing.
*   **Predictive Prefetching:** On `focus`, we open a WebSocket/Connection. On `hover` over a suggestion, we prefetch the SERP (Search Engine Results Page).
*   **Local Intent:**
    *   Regex patterns detect intents like "10 usd to eur" or "weather 10001".
    *   These execute **client-side** immediately without hitting the backend if possible.

### 5.2 The Unified Result Grid
We do not just show a list. We use a **Masonry-style Grid** for mixed media or a **Strict List** for text.
*   **Smart Layout:**
    *   **Commercial Intent:** List view with price comparison widgets.
    *   **Visual Intent (images):** Masonry grid.
    *   **Informational Intent:** Knowledge Panel on right, reliable sources on left.

### 5.3 Feedback Loops
*   **Implicit Signals:** We track "Time to Long Click" (if a user clicks and stays for >30s, the result was good).
*   **Explicit Signals:** "Was this helpful?" micro-interactions on knowledge panels.

---

## 6. UX & Micro-Interactions Standards

*   **Skeleton Loading:** NEVER show a spinner. Show a pulsing gray structure that matches the layout of the incoming results (List vs Card).
*   **Layout Stability:** Define strict `min-height` for result containers to prevent Cumulative Layout Shift (CLS) when images load.
*   **Focus Management:** When paginating or filtering, user focus must be managed intelligently (e.g., move focus to top of result list).

---

## 7. Scalability & Maintenance

*   **Feature Flags:** All new features (e.g., `ENABLE_AI_SUMMARY`) are wrapped in a `<FeatureFlag>` component. This allows A/B testing and instant rollbacks.
*   **Strict Typing:** `noImplicitAny` is ON. API contracts are generated from backend Swagger/OpenAPI specs automatically (`openapi-typescript-codegen`).

## 8. Development Roadmap (Phase 1)

1.  **Setup:** Initialize Vite + TS + Tailwind + Eslint (Airbnb config).
2.  **Core UI:** Build the "Atomic" design system (Typography, Spacing, Shadows).
3.  **State Layer:** Implement `SearchStore` and Query Client configuration.
4.  **Feature:** "Omnibox" with mock autocomplete.
5.  **Feature:** Result Page with skeleton states and dummy integration.

---

*Verified by Seekora Architecture Review Board*
