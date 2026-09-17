# Smriti (स्मृति) — Full Project Context & Conversation History Report

**Project Name:** Smriti / RecallOS  
**Core Essence:** Minimalist, active-recall knowledge system integrating Gemini AI synthesis and deterministic spaced repetition (SM-2).  
**Design Tokens & Aesthetic:** Warm ivory stone (`#FAF8F5`), obsidian slate typography, terracotta accents (`#C86438`), Sanskrit Devanagari touch (स्मृति). Zero dashboard clutter, zero gamification emojis.  
**Generated On:** August 18, 2026  
**Latest Git Commit:** `f48b8f8`  

---

## 1. Project Overview & Architectural Principles

Smriti is designed around three strict axioms:
1. **High Signal, Low Friction:** Knowledge capture must take seconds (via typing, speaking, or pasting text). AI distills input into concise, structured knowledge without filler words.
2. **Deterministic Active Recall:** Concepts are not merely archived; they enter a deterministic spaced repetition loop with explicit difficulty grading (Again, Hard, Good, Easy).
3. **Interconnected Memory:** Concepts form a semantic graph with bidirectional links and hybrid vector search (combining exact keyword matches and cosine similarity on `text-embedding-004`).

---

## 2. Chronological Summary of All Completed Phases

```
PHASE 1 (Core Foundations)
├── 1.1: Smriti UI Foundation & Design System (Warm ivory, obsidian, terracotta)
├── 1.2: App Navigation & Route Structure
├── 1.3: Data Model & TypeScript Schemas
├── 1.4: Gemini AI Foundation (Server-side Express proxy, structured JSON output)
├── 1.5: Supabase Persistence (PostgreSQL schema, RLS policies, Dual-store fallback)
├── 1.6: Spaced Repetition Engine (SM-2 scheduling, /review page, direct & MCQ questions)
├── 1.7: Semantic Search & Vector Embeddings (text-embedding-004, hybrid cosine ranking)
├── 1.8: Supabase Authentication & Multi-User Isolation (Signup, Login, RLS data protection)
└── 1.9: Voice Capture (Web Speech API integration, live transcription, auto-provenance)

PHASE 2 (Knowledge Graph & Exploration Polish)
├── 2.1: Knowledge Connection Management (Bidirectional link CRUD, anti-duplicate relations)
├── 2.2: Knowledge Page Revision Polish (Memory Hook, Explanation, Example blocks)
├── 2.3: Daily Recall Session & Spacing Polish (Prioritized weak concepts, graceful fallback)
├── 2.4: Capture Experience & Inline Duplicate Resolution (Pause on similarity > 0.82)
├── 2.5: Knowledge Quality & Organic AI Inline Linking (Context-aware linking)
├── 2.6: Search & Memory Retrieval Experience (Keyboard shortcuts /, Arrow keys, Enter)
├── 2.7: Home Screen Intelligence ("Needs Attention", "Recently Learned", "NEW" badges)
├── 2.8: Review Session Continuity (LocalStorage session preservation across tabs)
└── 2.9: "Look It Up Again" Revision Loop (In-review back navigation to knowledge detail)

PHASE 3 (Intelligence, Ingestion & Lifecycle)
├── 3.0: Daily Learning Ingestion & Queue Planner (Deterministic priority queue planner)
├── 3.1: Knowledge Editing & Correction Loop (In-place edit form, Gemini regeneration)
├── 3.2: Paste Notes Ingestion (15k character limit, multi-concept batch extraction)
├── 3.3: Knowledge Source & Context (Provenance tracking across Quick, Voice, and Notes)
├── 3.4: Knowledge Quality Check & Duplicate Safety (6-point validation, 1-retry fallback)
└── 3.5: Knowledge Lifecycle & Delete Safety (Atomic cascade delete, session clean-up)
```

---

## 3. Detailed Phase Breakdown

### Phase 1.1 – 1.5: Core Setup & Persistence Layer
- **Design Tokens:** Setup CSS theme variables (`--color-bg-ivory`, `--color-text-obsidian`, `--color-accent-terracotta`).
- **AI Integration:** Implemented server-side Express backend (`server/index.ts`) using `@google/genai` to keep API keys secure and enforce structured JSON schemas.
- **Dual Persistence Architecture:** LocalStorage provides instant offline reads/writes while Supabase PostgreSQL securely stores persistent data behind user-isolated Row Level Security (RLS).

### Phase 1.6 – 1.9: Active Recall, Vectors & Voice
- **Deterministic Spaced Repetition:** Built lightweight algorithm computing `nextReviewDate`, `strength` (0–4), `interval`, and `easeFactor` based on user feedback.
- **Semantic Vector Storage:** Used Gemini `text-embedding-004` to create dense 768-dimensional embeddings for concepts, enabling natural-language retrieval.
- **Voice Ingestion:** Built browser speech recognition hook (`useSpeechRecognition`) for hands-free memory capture with auto-tagging.

### Phase 2.1 – 2.9: Connections, Search & Polish
- **Interactive Concept Map:** Developed an SVG visual graph renderer (`ConceptMap.tsx`) showing immediate 1st-degree conceptual neighbors.
- **Organic In-text Linking:** Gemini was instructed to naturally weave Markdown links `[Title](/knowledge/id)` into explanations when referencing existing vault concepts.
- **Keyboard-First Retrieval:** Implemented global `/` focus, `ArrowUp`/`ArrowDown` item selection, and `Enter` direct navigation.
- **Review Continuity:** `ReviewSessionManager` ensures an active session is never lost on refresh, with seamless "Read Again" capability on incorrect answers.

### Phase 3.1 – 3.5: Ingestion, Quality & Deletion
- **Knowledge Editing & AI Regeneration:** Users can edit any concept or trigger `POST /api/regenerate-concept`. Vector embeddings automatically synchronize upon saving.
- **Paste Notes Extraction:** Built `POST /api/extract-concepts` accepting raw notes (up to 15,000 chars), previewing distinct extracted concepts, and batch-saving them with vault deduplication.
- **Provenance & Source Context:** Added `sourceContext` across all capture avenues (e.g., "From today's supply chain lecture", "Captured via voice").
- **Server Quality Validation:** Added 6-point server validation (filler detection, length sanity, title checks) with 1 automatic retry and amber client-side warning cards.
- **Delete Safety:** Added atomic cascade deletion for concepts, relationships, review records, and active session queues with confirmation modals.

---

## 4. Current Repository State & Key Files

| File | Purpose |
| :--- | :--- |
| `server/index.ts` | Express backend: Gemini generation, regeneration, embeddings, search, extraction, and quality validation. |
| `src/lib/dataService.ts` | Unified persistence bridge: LocalStorage + Supabase data operations, relationships, and deletions. |
| `src/lib/memoryPlanner.ts` | Deterministic daily review queue prioritization and scoring algorithm. |
| `src/lib/spacedRepetition.ts` | Core SM-2 review calculation logic and grade interval updates. |
| `src/lib/reviewSession.ts` | Isolated user review session state management in LocalStorage. |
| `src/pages/Home.tsx` | Dashboard featuring Daily Review CTA, "Needs Attention", and "Recently Learned". |
| `src/pages/AddConcept.tsx` | Dual-mode capture: "Quick Concept" (with Voice) and "Paste Notes" (batch ingestion). |
| `src/pages/KnowledgeDetail.tsx` | Concept reading view, Concept Map, Connection Manager, in-place Edit form, and Delete action. |
| `src/pages/Review.tsx` | Active recall session runner with MCQ/Direct-recall questions and "Read Again" failure loop. |
| `src/pages/Search.tsx` | Keyboard-navigable hybrid search interface. |

---

## 5. Next Steps for Upcoming Sessions

1. **Phase 3.6 — Vault Export & Portability:** Implement Markdown/JSON export & import workflows.
2. **Phase 3.7 — Advanced Recall Formats:** Sentence cloze deletion and minimalist retention decay visualizers.
3. **Phase 4.0 — Production Hardening:** Rate limiting middleware, error boundary polish, and deployment configs.
