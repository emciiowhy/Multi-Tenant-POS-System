# Dedicated Express API server, Next.js is a pure frontend

Business logic, REST, and WebSocket all live in a standalone Express.js + TypeScript service (`apps/api`). Next.js 16 (`apps/web`) is a pure UI client that calls the API over HTTPS. The `withCompany`/RLS repository layer (ADR-0002) lives in the API. A shared `packages/contracts` package holds the Zod schemas and inferred types used on both sides of the wire so request/response shapes can't drift.

## Considered Options

- **Next-native HTTP + thin realtime service:** rejected despite less wire boilerplate, because the team wants one unambiguous backend that is portable off Vercel and owns realtime + jobs in the same runtime as the logic.
- **Full Next monolith with managed realtime:** rejected — fastest to ship but weakest story for true server-side offline-first POS sync, which is a core requirement.

## Consequences

- **Auth must bridge two trust domains:** NextAuth v5 owns the browser session; the Express API authenticates requests independently. This bridge is the subject of a follow-up ADR.
- Two deploy targets (Vercel + Railway/Fly), CORS configuration, and the discipline that `packages/contracts` is the *only* place wire shapes are defined.
- The long-lived Express process is also where the WebSocket gateway and background workers live, so it must be deployed on a platform that supports persistent connections (not Vercel functions).
