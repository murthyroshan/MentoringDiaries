# MentoringDiaries — Bug Audit & Fix Plan

A full-stack "Online Mentoring Diaries" platform: React 19 + Vite client, Express +
better-sqlite3 server, JWT cookie auth, Socket.IO real-time, optional Groq/OpenAI AI
analysis of weekly diary entries.

This document captures the results of a full-codebase audit (server + client, ~30k LOC),
the concrete bugs found, and the fixes applied. Items are grouped by area and ordered by
severity. Status legend: ✅ fixed · 🔶 documented (deliberately not changed) · ⏭️ deferred.

---

## A. Server — startup, auth & middleware

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| A1 | 🔴 Critical | `database/seed.js` calls `process.exit(0)` at module top-level. `config/db.js` auto-`require`s it when the users table is empty, so on **any fresh DB the server process exits before `listen()`** — it never starts. | Guard the seed's side-effects/`process.exit` behind `require.main === module`; export a `seed()` function the auto-seeder can call safely. ✅ |
| A2 | 🟠 High | `middleware/errorHandler.js` only maps Mongo's `err.code === 11000`. better-sqlite3 unique-constraint violations fall through to a **500 that leaks the raw SQL** (`UNIQUE constraint failed: users.email`). Also enables a 500 on the register race after the `findUserByEmail` pre-check. | Map `err.code?.startsWith('SQLITE_CONSTRAINT')` → 409 with a generic message. ✅ |
| A3 | 🟠 High | `userController.updateUser` + `validate.js` let a **student rewrite their own `department`, `section`, `roll_number`, `batch`** — the very keys that drive attendance lookups and section reports. No enum/consistency validation. | Restrict non-admin self-edits to `name` only; keep full edit for admins. ✅ |
| A4 | 🟡 Med | Shared `authLimiter` (5/min/IP) is mounted on `/login`, `/register` **and** `/refresh`. Automatic silent-refresh traffic (multi-tab) can exhaust the budget and lock out real logins. | Give `/refresh` its own, more generous limiter. ✅ |
| A5 | 🟡 Med | `authController.refresh` selects `is_active` but **never checks it** — a deactivated account can still mint fresh access tokens. | Reject `!is_active` in refresh. ✅ |
| A6 | 🟡 Med | `logout` is guarded by `auth`, so an **expired access token makes logout unreachable** — the DB refresh token and cookies are never cleared. | Make logout tolerate a missing/expired access token; always clear cookies + stored refresh token. ✅ |
| A7 | 🟡 Med | `adminController.getSectionReport` selects `MAX(ai_risk_score)`/`MAX(mood)` and labels them `latest_*` → dashboard shows each student's **highest-ever** risk, not their most recent. | Select the values from the latest row (`ROW_NUMBER()`/correlated subquery). ✅ |
| A8 | 🟢 Low | `errorHandler.js` & `requestLogger.js` read `req.user?._id` (Mongo leftover) — SQLite rows use `id`, so **every log line records `userId: null`**. | Use `req.user?.id`. ✅ |
| A9 | 🔴 Critical | Four controllers (`academicController`, `skillController`, `eventController`, `studentController`) `require('../models/...')` — a **Mongoose models layer that no longer exists**. Their routes (`academic.js`, `skills.js`, `events.js`) are never mounted and the frontend never calls them: pure dead code that would crash if loaded. | Delete the orphaned controllers + routes. ✅ |
| A10 | ⏭️ | Single `refresh_token` column ⇒ only one active session per user (logging in on device B silently logs out device A). Socket auth is validated only at handshake, never re-checked. | Documented as a known limitation; proper fix needs a sessions table — deferred. 🔶 |

## B. Server — domain controllers & queries

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| B1 | 🟠 High | `analyticsController.getStudentWeeklyInsight` is missing the **mentor-assignment check** its siblings have → any mentor can read/generate AI insights over another mentor's student (IDOR). | Add the same `req.user.role === 'mentor'` ownership guard. ✅ |
| B2 | 🟠 High | `exportService.escapeCSV` quotes commas/quotes but does **not neutralise formula-injection** (`=`,`+`,`-`,`@`). A student's name/reflection like `=HYPERLINK(...)` executes when an admin opens the CSV in Excel/Sheets. | Prefix values starting with a formula char with `'`. ✅ |
| B3 | 🟠 High | `mentorController.getDashboardSummary` "latest entry per student" uses `GROUP BY student_id HAVING MAX(created_at)` — the `HAVING` is a no-op and `ai_risk_level` comes from an **arbitrary row**, so critical/high risk counts are wrong. | Pick the true latest row per student via `ROW_NUMBER()`. ✅ |
| B4 | 🟡 Med | `getSubjectPerformance(studentId, null, year)` and `getRiskHistory(..., null, ...)` bind `semester = NULL`, which is never true in SQL → **portfolio subject performance & risk history are always empty** when semester is omitted. | Make the semester predicate conditional when null. ✅ |
| B5 | 🟡 Med | Diary submission rate limiter keys on `req.user?._id` (always `undefined`) → silently **degrades to per-IP**, so a whole campus/NAT shares one 10/hr quota. | Key on `req.user?.id`. ✅ |
| B6 | 🟡 Med | Pagination `total`/`pages` ignore `semester`/`academic_year` filters (`countEntries`) and sessions use `total = rows.length` (already `LIMIT`-ed) → **phantom pages**. | Apply the same filters to the count queries. ✅ |
| B7 | 🟡 Med | `getSubjectConcerns` counts individual low weekly ratings but divides by student count → **"% struggling" can exceed 100%**. | Count distinct students with a low rating. ✅ |
| B8 | 🟢 Low | `new Date(scheduled_at).toISOString()` throws `RangeError` (→ 500) on an unparseable date in session create/reschedule. | Validate the parsed date, return 400. ✅ |
| B9 | 🟢 Low | `marksController` uses its own `DEPT_SUBJECTS` map (AIML/CS/DS) inconsistent with `constants/subjects.js` (CSE/ECE/MECH). | Noted; low impact, left as-is. 🔶 |

## C. Client — core, routing & data layer

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| C1 | 🔴 Crash | `StudentTimeline.jsx` `MoodAttendanceChart` calls `useMemo` **after an early `return`** (conditional hooks) — violates the rules of hooks and crashes when the data-present branch flips. | Move the early return below all hook calls. ✅ |
| C2 | 🟠 High | Mentor & Admin layouts **never subscribe to the socket** — only the student layout does. Mentors/admins get no live notifications, toasts, or query invalidation until a full reload. | Wire the shared socket/notification effect into all three layouts. ✅ |
| C3 | 🟠 High | `services/socket.js` joins rooms via `s.once('connect', …)` with a guard that blocks re-emit → after any **reconnect the user is no longer in their room** and live events stop. | Use a persistent `connect` handler and reset the join guard on `disconnect`. ✅ |
| C4 | 🟡 Med | `notificationStore.initialized` isn't reset on logout → in one SPA session **user B sees user A's (empty/stale) notifications**. | Reset `initialized` in `clearNotifications`. ✅ |
| C5 | 🟡 Med | `formatDistanceToNow(new Date(n.at))` (and `toLocaleTimeString`) throw on a missing/invalid timestamp, taking down the whole notification dropdown. | Guard invalid dates with a safe fallback. ✅ |
| C6 | 🟡 Med | `services/api.js` error interceptor reads `originalRequest.url.includes(...)` **without optional chaining** — throws if a request has no `url`. | Use `?.` consistently. ✅ |
| C7 | 🟡 Med | `getCurrentISOWeek` anchors to the current **calendar** year → wrong/negative week numbers around the New-Year boundary. | Use the standard ISO-week (Thursday) algorithm. ✅ |
| C8 | 🟢 Low | Register form: `roll_number` input `max={10}` contradicts the 1–20 rule; `batch` hardcoded to `'2023-2027'` regardless of selected year. | `max={20}`; derive `batch` from the selected year. ✅ |
| C9 | 🧹 Cleanup | Dead/duplicate files: `pages/LoginPage.jsx`, `pages/RegisterPage.jsx`, `pages/LandingPage.jsx`, `components/layout/{DashboardLayout,Navbar,NotificationCenter}.jsx`, `lib/{axios,socket,queryClient}.js` — superseded, imported by nothing live. | Remove to end the two-parallel-implementations confusion. ✅ |

## D. Client — feature pages (admin / mentor / student)

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| D1 | 🔴 Critical | Admin "Add user" POSTs to `/auth/register`, which **unconditionally sets auth cookies** → the admin is silently logged in *as the new user* and loses admin access. | Add an admin-only `POST /api/admin/users` that creates the user **without** issuing cookies; point the UI at it. ✅ |
| D2 | 🟠 High | `EntryDetail.jsx` reads MongoDB-style fields (`entry.createdAt`, `entry.week`, `entry.aiAnalysis`, `entry.content`, `entry.mentorResponse`) but the API returns snake_case → `new Date(undefined)` → **every entry-detail page white-screens**. | Map to the real fields (`created_at`, `week_number`, `reflection`, `mentor_response`, flat `ai_*`) + guard the date. ✅ |
| D3 | 🟠 High | `MyStudents.jsx` search does `s.roll_number?.toLowerCase()` on an **integer** → `TypeError` crashes the page on any keystroke. | `String(s.roll_number ?? '').toLowerCase()`. ✅ |
| D4 | 🟠 High | `AdminDashboard` "Avg risk by department" chart renders `Math.random()` **fake data** that changes every re-render. | Derive from real section data (or remove). ✅ |
| D5 | 🟡 Med | `StudentSessions.jsx` calls `JSON.parse(session.action_items)` but the API **already returns a parsed array** → throws, caught → action items always empty. | Use `session.action_items` directly. ✅ |
| D6 | 🟡 Med | Admin "change semester" / user edit PATCH `/users/:id` with `current_semester`/`section`/`email`, but `updateUser` **whitelists neither** → silent no-op / 400. | Extend `updateUser`'s admin whitelist (`current_semester`, `section`, `email`). ✅ |
| D7 | 🟡 Med | `SectionReport` risk dots use `Math.max(1, …)` → sections with **zero** high/critical still show dots. | Only floor levels with count > 0. ✅ |
| D8 | 🟢 Low | `mentor/StudentsList.jsx` uses Mongo fields (`s._id`, `s.rollNumber`) → `undefined` keys/links. Imported but not routed (dead). | Remove (superseded by `MyStudents`). ✅ |
| D9 | 🟢 Low | `AllEntries.jsx`: `search`/`riskLevel` filters aren't backed by the API and mislabelled "Role" header; filter counts computed from a filtered page. | Client-side filter fallback + label fix. ✅ |
| D10 | 🟢 Low | `MentorDashboard` prints "Excellent" response time when there is no data (`null` treated as `0`). | Guard the no-data case. ✅ |

## E. Tooling / hygiene

- ESLint: 121 errors (mostly unused vars + a few empty blocks + one real conditional-hook =
  C1). Clean up the safe ones; keep the signal.
- `vite.config.js` uses `__dirname` in an ESM context (`no-undef`).
- Deprecated/irrelevant deps: `express-mongo-sanitize`, `xss-clean` (unmaintained) on a
  SQLite app. Noted, not removed (they still function under Express 4).

---

## Known limitations (intentional / out of scope)

- **Open admin self-registration** — the register UI deliberately offers an "Admin" role and
  the backend accepts it. This is convenient for a demo but is a privilege-escalation risk in
  production. Left as-is per the project's evident intent; documented in the README.
- Multi-session refresh tokens, socket token re-validation (A10) — need schema changes.

## Verification

- `cd server && npm test` — must stay green (31 tests).
- `cd client && npx vite build` — must build clean.
- Manual smoke: login as each role, submit an entry, mentor review, admin dashboards.
