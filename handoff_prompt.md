# Smriti (स्मृति) / RecallOS — Master Chat Handoff Prompt

---

```markdown
# SMRITI (स्मृति) — COMPREHENSIVE PROJECT HANDOFF & NEXT PHASE INSTRUCTION

## 1. PROJECT CORE & AESTHETIC PRINCIPLES
- **Name:** Smriti (स्मृति) / RecallOS
- **Core Mission:** A minimalist, distraction-free active recall and personal knowledge graph system. It automatically distills raw thoughts, speech, and pasted articles into structured atomic memories, connects them semantically, and schedules them via deterministic spaced repetition (SM-2 principles).
- **Design Philosophy:** Warm ivory stone (`#FAF8F5`), obsidian slate typography (`#1A1A1A`), terracotta accents (`#C86438`), and a subtle Sanskrit touch (स्मृति). Zero generic dashboards, zero emoji clutter, zero gamification popups.
- **Tech Stack:**
  - **Frontend:** React 19 + TypeScript + Vite + React Router 7 + Web Speech API
  - **Backend:** Express 5 + Node.js + TypeScript (`tsx`) proxy on port 3001
  - **AI Integration:** `@google/genai` (Gemini 3.6 Flash for structured JSON extraction/synthesis, `text-embedding-004` for 768-dim dense vectors)
  - **Persistence:** Dual-store architecture (instant offline-first `localStorage` + Supabase PostgreSQL with Row Level Security)
- **Current Git Commit:** `f48b8f8`
- **Build Status:** Clean compilation (`tsc -b && vite build` — 0 errors)

---

## 2. CHRONOLOGICAL SUMMARY OF WORK COMPLETED (PHASES 1.0 – 3.5)

### Phase 1: Foundations, AI Proxy, Spaced Repetition, Vectors & Auth
- **1.1 – 1.3 UI Foundation & Data Model:** Sanskrit design tokens, layout navigation, and TypeScript `KnowledgeItem` schema.
- **1.4 Gemini Integration:** Express proxy (`server/index.ts`) for secure server-side Gemini calls with structured JSON output.
- **1.5 Supabase Dual-Store:** Tables for `knowledge_items`, `related_concepts`, `review_states`, and `profiles` with RLS.
- **1.6 Spaced Repetition Engine:** Implemented deterministic SM-2 scheduling (Again, Hard, Good, Easy) at `/review` with dynamic question generation.
- **1.7 Semantic Vector Search:** Gemini `text-embedding-004` cosine similarity search combined with exact keyword boosts.
- **1.8 Supabase Auth & Multi-Tenant Isolation:** Real email/password signup, login, session persistence, and RLS user data isolation.
- **1.9 Voice Capture:** Integrated browser Web Speech API for hands-free memory capture with live transcription and auto-provenance.

### Phase 2: Knowledge Graph, Home Intelligence & Polish
- **2.1 – 2.5 Connections & Organic Links:** Bidirectional relationship manager, SVG Concept Map, inline Markdown links (`[Title](/knowledge/id)`), anti-hallucination link guardrails.
- **2.6 Keyboard-First Search:** Global `/` shortcut, arrow-key list navigation, and `Enter` quick open.
- **2.7 – 2.9 Home Polish & Review Continuity:** Deterministic priority queue planner (`memoryPlanner.ts`), "Needs Attention" queue, "NEW" badges, `localStorage` session preservation across tabs, and "Read Again" failure loop.

### Phase 3: Ingestion, Provenance, Quality & Deletion Lifecycle
- **3.1 Knowledge Editing & AI Regeneration:** In-place edit form, duplicate title pre-checks, "Regenerate with Gemini ✨", and automatic vector embedding re-synchronization.
- **3.2 Paste Notes Ingestion:** 15,000-character batch intake, distinct concept extractor, item preview & selection checkboxes, sequential deduplicated ingestion.
- **3.3 Knowledge Provenance (`sourceContext`):** Provenance tracking across Quick, Voice, and Notes with secondary weighting in vector search.
- **3.4 AI Quality Validation:** 6-point server validation rules (filler detection, length limits, title sanity), 1 automatic retry on failure, client-side amber warning card ("Save Anyway" or "Discard").
- **3.5 Knowledge Lifecycle & Delete Safety:** Unobtrusive hover-revealed delete action, confirmation prompt, atomic cascade deletion (concept + relationships + review state), active review session cleanup.

---

## 3. KEY FILE ARCHITECTURE & STATE

### `src/lib/types.ts`
```typescript
export type ReviewGrade = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface RelatedConcept {
  id: string;
  title: string;
  summary?: string;
}

export interface ReviewState {
  lastReviewDate?: string;
  nextReviewDate: string;
  strength: number;       // 0 to 4
  interval: number;       // Days between reviews
  easeFactor: number;     // SM-2 algorithm multiplier
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  createdAt: string;
  reviewState: ReviewState;
  relatedConcepts: RelatedConcept[];
  embedding?: number[];
  sourceContext?: string;
}
```

### `server/index.ts` (Core Endpoints)
- `POST /api/generate-concept`: Takes `{ rawInput, topRelevantConcepts, sourceContext }`, extracts structured `{ title, summary, fullContent, relatedConceptIds }`, validates quality with 1-retry fallback, and generates `text-embedding-004` vector.
- `POST /api/search`: Takes `{ query, concepts }`, embeds query, computes cosine similarity, applies exact/keyword boosts, filters `< 0.65`, and ranks results.
- `POST /api/generate-questions`: Generates application-focused MCQ and direct-recall test questions for review.
- `POST /api/embed`: Generates 768-dim embeddings for updated concept text.
- `POST /api/regenerate-concept`: Rewrites concept content while strictly preserving quality and structure.
- `POST /api/extract-concepts`: Analyzes pasted text (up to 15,000 chars) and extracts distinct `{ title, summary }` items.

### `src/lib/dataService.ts`
- Unified persistence engine managing dual reads/writes across `localStorage` and Supabase PostgreSQL.
- Methods: `getAll()`, `getById()`, `addConcept()`, `updateConcept()`, `deleteConcept()`, `checkDuplicateTitle()`, `updateReviewState()`, `addConnection()`, `removeConnection()`, `getDueForReview()`, `getWeakConcepts()`, `getRecentlyLearned()`.

### `src/lib/memoryPlanner.ts`
- Deterministic priority queue ranking:
  1. `OVERDUE_WEAK` (overdue + strength <= 1)
  2. `OVERDUE` (overdue)
  3. `WEAK` (strength <= 1)
  4. `NEWLY_LEARNED` (created within last 72h)
  5. `REMAINING_DUE`
  - Deterministic tie-breakers by `nextReviewDate`, `createdAt`, and `id`.

---

## 4. CURRENT WORKSPACE STATUS & EXECUTION RULES

1. **Working Tree:** Clean at commit `f48b8f8`.
2. **Build Check:** Passing (`tsc -b && vite build`).
3. **Running Tasks:** 0 active background processes.
4. **Execution Protocol for Next Steps:**
   - Follow the established loop: **IMPLEMENT → TEST → FIX REAL FAILURES → COMMIT → STOP ALL PROCESSES → REPORT**.
   - Do NOT repeat completed phases or add unnecessary database tables/dependencies.
   - Maintain the minimalist Sanskrit aesthetic (warm ivory, obsidian, terracotta).

---

## 5. ROADMAP & NEXT PHASES TO BUILD

### **Phase 3.6 — Vault Portability & Data Export/Import (Next Immediate Task)**
- **Markdown & JSON Export:** Export the entire vault as a `.zip` of Markdown files (with YAML frontmatter containing `title`, `summary`, `created_at`, `source_context`, and `review_state`) or a single `smriti_vault_backup.json`.
- **Vault Import:** Re-import exported Markdown/JSON files with automated deduplication checks, relationship re-wiring, and review schedule preservation.
- **Data Portability UI:** Minimalist export/import actions in a clean settings/vault view.

### **Phase 3.7 — Advanced Active Recall Formats**
- **Sentence Cloze Deletion:** Add fill-in-the-blank / cloze recall questions alongside MCQ and Direct Recall.
- **Fading Memory Heatmap:** Minimalist retention curve / calendar visualizer (calm ivory/terracotta palette) showing recall consistency without gamification clutter.

### **Phase 4.0 — Production Hardening & Deployment**
- **AI Rate Limiting:** Add `express-rate-limit` middleware on `/api/*` endpoints.
- **Deployment Pipeline:** Vercel frontend + Render backend configs with environment variable checks.
- **PWA Service Worker:** Offline cache for existing vault reading and review.

---

Please proceed with **Phase 3.6 — Vault Portability & Data Export/Import** (or provide your specific instructions for the next phase).
```
