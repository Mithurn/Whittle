<h1 align="center">
  <br>
  <img src="public/mascot.gif" width="180" alt="Whittle mascot, Ember, explaining a technique">
  <br>
  Whittle
  <br>
</h1>

<h4 align="center">Pick a single hobby. Get a personalized, 5-8 step learning roadmap focused on real-world practice, not another endless YouTube binge.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000.svg?style=flat-square&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?style=flat-square&logo=typescript" alt="TypeScript strict mode">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4.svg?style=flat-square&logo=tailwindcss" alt="Tailwind CSS v4">
  <img src="https://img.shields.io/badge/Zustand-State-443E38.svg?style=flat-square" alt="Zustand">
  <img src="https://img.shields.io/badge/AI--Powered-Groq_%2B_Serper-FF6B6B.svg?style=flat-square" alt="AI powered: Groq + Serper">
</p>

<p align="center">
  <a href="#live-demo--walkthrough">Live Demo</a> •
  <a href="#merylls-learning-philosophy">Meryll's Philosophy</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#recent-fixes--polish">Recent Fixes</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#running-locally">Running Locally</a>
</p>

---

## What Whittle Does (The Single-Hobby Stance)

Most hobby-learning content is a firehose — endless videos, no sense of what actually matters first. Whittle asks for **one hobby**, a skill level, a goal, and how much time you have, then generates a **5-8 technique roadmap**, sequenced foundational-to-advanced.

We took a strict **Single-Hobby Stance**. You won't find dashboards for managing 12 different plans. You pick one thing you want to get good at, and we guide you through a linear roadmap until you master it. If you want to switch to a new hobby, you start fresh.

There are no accounts and no backend database. A single-user, no-history hobby tracker doesn't need auth or a server to own state. Your progress is saved safely to `localStorage`.

## Meryll's Learning Philosophy

Whittle is heavily inspired by a pedagogy and design philosophy that values intrinsic motivation and actionable learning.

1. **The 5-Step Lesson Structure:** We don't just dump links on you. Every technique is broken down via Just-In-Time (JIT) AI generation into a strict, digestible slide deck:
   - **Introduction:** Why does this matter?
   - **Watch & Learn:** High-quality Video & Audio (Podcast) resources.
   - **How it Works:** Step-by-step breakdown.
   - **Watch Out For:** Common mistakes & pro tips.
   - **Master:** A final recap, key takeaways, and a place to jot down your notes.
2. **Anti-Dark Patterns:** We completely reject cheap gamification. You will not find streaks, leaderboards, or arbitrary points economies here. Instead, we rely on a **rich, native reward loop**: physics-based micro-animations, tactile button bounces, and a dynamic Mascot companion who genuinely acknowledges your progress ("You're 2 steps away from mastering Pickleball!").

## Live Demo & Walkthrough

- **Live demo:** [whittle-hobbies.vercel.app](https://whittle-hobbies.vercel.app/)
- **Loom walkthrough:** _coming soon_

## Key Features

- **AI-generated, personalized roadmap** — exactly 3 resources per technique (video, reading, and audio).
- **Real web-search resource discovery** — every resource link comes from an actual Serper.dev (Google Search/Video API) search.
- **Dynamic Mascot Companion** — a character reacting to your specific progress, giving you personalized encouragement rather than generic praise.
- **Mark Mastered / Skip** — skip is fully reversible via a dedicated "bring back" action.
- **Responsive technique detail** — desktop modal / mobile bottom sheet UI patterns that feel native.
- **249 automated tests**, TypeScript strict mode, zero live API calls in the test suite (every provider call is mocked).

## Recent Fixes & Polish (Post-Feedback)

We recently underwent a massive polish pass to ensure the app hits a 10/10 standard:
- **Persistent Slide Indexing:** The exact slide you are on inside a lesson is now cached in `sessionStorage`. If you accidentally refresh or close your phone, you resume exactly where you were.
- **JIT Fetching Pipeline:** Lessons (Key Takeaways, Mistakes, Steps) are generated Just-In-Time as soon as you open a technique, creating a seamless UX without blocking the initial plan generation.
- **Improved Podcast Matching:** Added explicit "episode" constraints to our audio Serper queries, ensuring you get actual playable podcasts instead of generic search pages.
- **Rich Reward Loop:** Final slides now pop with spring animations, and the "Complete Lesson" button provides tactile bounce feedback.
- **Layout & Mobile UI:** Completely eliminated layout shifts during JIT loading, centered footer navigations perfectly across all breakpoints, and stripped excess padding from podcast embeds for a cleaner UI.
- **Integrated Lesson Notes:** Easily add any Key Takeaway directly to your personal notes with a single click.

## Architecture

A decoupled two-pass pipeline: one pass invents the *plan* (Groq, from its own reasoning), a second pass finds *real, currently-live links* for it (Serper.dev) — deliberately separating "what should this plan contain" from "what real page backs each resource."

```mermaid
graph TB
    subgraph Browser["Browser — Next.js Client"]
        A[Onboarding Flow] -->|POST| B["/api/generate-plan"]
        C[Roadmap / Technique UI] <--> D[(Zustand Store)]
        D <--> E[(localStorage)]
        B -.plan JSON.-> D
    end

    subgraph API["Route Handler — /api/generate-plan"]
        B --> F["Pass 1 — Groq gpt-oss-120b<br/>JSON skeleton: techniques, resource titles,<br/>every url = placeholder"]
        F --> G{Zod validation}
        G -->|fails once| F
        G -->|fails twice| H["502 structured error<br/>(real retry UI, never blank)"]
        G -->|valid| I["Pass 2 — Serper.dev<br/>parallel per-resource search"]
        I --> J["Real result found?<br/>trust it, keep its title too"]
        I --> K["No result / timeout (5s)?<br/>constructSearchUrl fallback"]
        J --> L["Post-pass dedup:<br/>2nd occurrence of any URL →<br/>constructSearchUrl instead"]
        K --> L
        L --> B
    end

    style F fill:#EB8928,color:#111318
    style I fill:#FABA0E,color:#111318
    style H fill:#ffb4ab,color:#111318
```

## Running Locally

```bash
git clone <repo-url>
cd whittle
npm install
```

Create `.env.local` in the project root (see `.env.example`):

```
GROQ_API_KEY=your_key_here
SERPER_API_KEY=your_key_here
```

```bash
npm run dev      # start the dev server at localhost:3000
npm test         # run the test suite (249 tests, fully mocked)
npm run build    # production build
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
