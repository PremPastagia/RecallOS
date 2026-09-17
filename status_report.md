# Smriti (स्मृति) — Project Status & Roadmap Report

**Document Date:** August 18, 2026  
**Latest Git Commit:** `f48b8f8` (*feat: Knowledge lifecycle + delete safety - Phase 3.5*)  
**Build Status:** Passing (`tsc -b && vite build` — 0 errors)

---

## 1. Executive Summary

**Smriti (स्मृति)** is a minimalist, active-recall knowledge system that transforms raw thoughts, voice inputs, and long-form notes into structured, interconnected memory units. It combines deterministic spaced repetition (SM-2 principles) with Gemini AI distillation and vector embeddings for semantic discovery.

The project has completed **17 development milestones across 3 major phases**, advancing from initial UI foundation to full ingestion, AI validation, semantic search, bidirectional linking, and deletion lifecycle management.

---

## 2. Current Status & Delivered Capabilities

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             SMRITI WORKFLOW                                │
│                                                                            │
│   INPUT MODES           AI SYNTHESIS & EMBEDDING          CORE SYSTEM       │
│  ┌──────────────┐      ┌─────────────────────────┐      ┌────────────────┐ │
│  │ Quick Text   │──┐   │ Gemini 3.6 Flash        │──┐   │ Spaced         │ │
│  ├──────────────┤  ├──►│ - Quality Validation    │  ├──►│ Repetition     │ │
│  │ Voice Capture│──┤   │ - Markdown Formatting   │  │   │ (Deterministic)│ │
│  ├──────────────┤  │   │ - Text Embedding 004    │  │   └───────┬────────┘ │
│  │ Paste Notes  │──┘   └─────────────────────────┘  │           │          │
│  │ (Up to 15k)  │                                   │           ▼          │
│  └──────────────┘                                   │   ┌────────────────┐ │
│                                                     └──►│ Knowledge Vault│ │
│                                                         │ & Concept Map  │ │
│                                                         └────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Delivered Features Breakdown

| Phase | Milestone | Features & Capabilities |
| :--- | :--- | :--- |
| **1.0 – 1.3** | **Foundation & Model** | Design tokens (warm ivory `#FAF8F5`, obsidian text, terracotta `#C86438`), router architecture, TypeScript schema, local fallback data. |
| **1.4** | **Gemini AI Foundation** | Server-side Express backend proxy, Gemini structured JSON extraction, initial duplicate pre-checks. |
| **1.5** | **Supabase Persistence** | Dual-persistence engine: LocalStorage for zero-latency local state + Supabase PostgreSQL with Row Level Security (RLS). |
| **1.6** | **Active Recall Engine** | Daily recall session (`/review`), deterministic SM-2 scheduling (Again, Hard, Good, Easy), strength tracking, dynamic question generation. |
| **1.7** | **Semantic Search & Vectors** | Provider-agnostic embeddings via `text-embedding-004`, hybrid search (cosine similarity + exact keyword boosts), inline concept linking. |
| **1.8** | **Auth & User Isolation** | Supabase Auth (Signup/Login/Session), authenticated state listener, multi-user isolation on all DB queries and mutations. |
| **1.9** | **Voice Capture** | Browser Web Speech API integration, live transcription state, auto-provenance tagging ("Captured via voice"). |
| **2.1 – 2.5** | **Connections & Quality** | Bidirectional concept relationship manager, visual SVG Concept Map, inline Markdown backlinks (`[Title](/knowledge/id)`), anti-hallucination link guardrails. |
| **2.6 – 3.0** | **Home & Retrieval Polish** | Keyboard-first search (`/` focus, arrow navigation), "Needs Attention" queue, "NEW" badges, deterministic queue planner (`memoryPlanner.ts`), review continuity across tabs. |
| **3.1** | **Editing & Regeneration** | In-place concept editing (Title, Summary, Explanation, Example, Memory Hook), duplicate title warning, "Regenerate with Gemini ✨", embedding sync. |
| **3.2** | **Paste Notes Ingestion** | 15,000-character batch intake, distinct concept extractor, item preview & selection checkboxes, sequential deduplicated ingestion. |
| **3.3** | **Knowledge Provenance** | `sourceContext` field across all modes (Quick, Voice, Paste), secondary weighting in vector search, display in knowledge detail. |
| **3.4** | **AI Quality Validation** | 6-point server-side validation rules (filler detection, length limits, title sanity), 1 automatic retry on failure, client-side amber warning card ("Save Anyway" or "Discard"). |
| **3.5** | **Lifecycle & Delete Safety** | Unobtrusive hover-revealed delete action, confirmation prompt, atomic cascade deletion (concept + relationships + review state), active review session cleanup. |

---

## 3. Technology Stack & Architecture

```
[ Frontend: React 18 + Vite + TypeScript + React Router 6 ]
                           │
             (Vite Proxy: /api/* -> 3001)
                           │
                           ▼
[ Backend: Node.js + Express + TypeScript (tsx) ]
       │                                     │
       ▼                                     ▼
[ Google Gemini SDK ]               [ Supabase PostgreSQL + RLS ]
 - gemini-3.6-flash (Extraction)     - knowledge_items
 - text-embedding-004 (Vectors)      - related_concepts
                                     - review_states
                                     - profiles
```

- **Frontend:** React 18, Vite, TypeScript, React Router 6, Web Speech API.
- **Backend:** Express, TypeScript, `@google/genai` SDK.
- **Database:** Supabase PostgreSQL + LocalStorage Dual-Store fallback.
- **Styling:** Custom CSS variables adhering to Sanskrit aesthetic (warm ivory, obsidian typography, terracotta accent).

---

## 4. What Needs to Be Done Further (Roadmap)

### Next Immediate Phases

#### Phase 3.6 — Export, Backup & Vault Portability
- **JSON / Markdown Export:** Allow users to export their entire knowledge vault as structured Markdown files (with YAML frontmatter) or JSON.
- **Vault Import:** Re-import exported vaults without breaking review schedules or duplicate detection.
- **Offline Data Sync:** Seamless sync indicator between offline LocalStorage and Supabase cloud.

#### Phase 3.7 — Enhanced Recall Formats & Review Analytics
- **Reverse Recall (Cloze / Fill-in-the-blank):** Expand beyond Multiple Choice & Direct Definition to sentence-level cloze deletion tests.
- **Fading Memory Heatmap:** Minimalist retention curve / calendar matrix showing recall consistency over time without generic gamification clutter.
- **Concept Decay Alerts:** Visual indicators for concepts nearing critical forgetting thresholds.

#### Phase 4.0 — Production Deployment & Hardening
- **Production Containerization / Vercel + Render Deployment:** Configured production build with environment variable validation.
- **Rate-Limiting & Token Budgeting:** Add Express rate-limiting middleware (`express-rate-limit`) on AI endpoints to prevent quota exhaustion.
- **PWA Support:** Service Worker setup for offline access to existing knowledge notes on mobile browsers.

---

## 5. Verification & Health Summary

- **TypeScript Compilation:** `0 errors`
- **Vite Production Build:** `533.55 kB` minified bundle (`146.74 kB` gzip)
- **Active Background Processes:** 0 lingering tasks (clean workspace state)
- **Git State:** Clean working tree at `f48b8f8`
