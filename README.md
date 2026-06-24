# GameForgeStudio

<p align="center">
  <img src="./attached_assets/image_1762389418995.png" alt="GameForgeStudio logo" width="120" />
</p>

GameForgeStudio is a full-stack game platform hub for developers and gamers. It combines project management, publishing-oriented workflows, gamer discovery, community features, and external app navigation into one central experience.

This project is built as a professional in-progress platform: it demonstrates the architecture, UX direction, authentication flow, data modeling, and ecosystem strategy for a larger GameForgeStudio product suite. Production hardening is planned, but the current focus is the core full-stack application and user experience.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query |
| UI | Tailwind CSS, Radix UI, shadcn/ui-style components, Lucide icons |
| Backend | Node.js, Express, TypeScript, session-based auth |
| Data | PostgreSQL, Neon serverless Postgres, Drizzle ORM, Drizzle Kit |
| Validation | Zod, drizzle-zod, shared TypeScript schemas |
| Build | Vite client build, esbuild server bundle |

## Features

### Developer Experience

- Developer dashboard with project summaries and platform metrics.
- Project management views for organizing game projects by status, engine, platform, and ownership.
- Game engine selection flow for starting projects with engines such as Unity, Unreal, Godot, and GameForge Rory.
- Asset store, cart, bundle, distribution, analytics, calendar, and community surfaces for a creator-focused workflow.

### Gamer Experience

- Gamer homepage focused on discovery, library activity, community updates, and Buttonz access.
- Store and game detail pages for browsing live games from GameForge creators.
- Game library with playtime, favorites, archived items, and owned-game state.
- Community and calendar areas that connect player activity back into the platform.

### Authentication And Roles

- Session-based authentication using Express sessions and HTTP-only cookies.
- Password hashing with bcrypt.
- Role-aware navigation for Developer and Gamer experiences.
- Shared user profile model used across platform features and external app integration.

### Buttonz Integration

Buttonz is maintained as a separate communication app in the GameForgeStudio ecosystem. GFS acts as the identity and navigation hub, launching Buttonz externally through `VITE_BUTTONZ_URL` instead of embedding it directly in the main platform.

This keeps the communication layer independent while still letting users move from GFS into Buttonz with ecosystem context.

## Architecture

GameForgeStudio uses a full-stack TypeScript architecture with shared data definitions between the client and server.

```text
client/          React application, pages, hooks, UI components
server/          Express API, session handling, route registration, storage layer
shared/          Drizzle schema definitions, Zod insert schemas, shared types
attached_assets/ Static product imagery, icons, and generated assets
```

### Frontend

- React components are organized around pages, reusable UI primitives, and domain-specific hooks.
- TanStack Query handles server state, request caching, and loading/error states.
- Wouter provides lightweight client-side routing.
- Tailwind and Radix-based components provide a consistent developer-tool style interface.

### Backend

- Express exposes REST-style API routes for authentication, users, projects, assets, carts, purchases, community posts, game libraries, and Buttonz-related chat data.
- Session middleware manages authenticated user state through cookies.
- Zod validates incoming data before it reaches the storage layer.

### Data Model

- Drizzle table definitions live in `shared/schema.ts`.
- Types are inferred from the schema so client and server code share the same source of truth.
- PostgreSQL is the intended persistent database, with Neon support for serverless hosted Postgres.
- The storage layer abstracts database operations behind a consistent interface.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values for your local or hosted database.

```bash
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
SESSION_SECRET=replace-with-a-long-random-secret
PORT=5000
VITE_BUTTONZ_URL=http://localhost:5175
```

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Start the development server

```bash
npm run dev
```

### 5. Run checks and production build

```bash
npm run check
npm run build
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express/Vite development server. |
| `npm run dev:server` | Start the backend server in development mode. |
| `npm run dev:client` | Start the Vite client dev server. |
| `npm run check` | Run TypeScript type checking. |
| `npm run build` | Build the client and bundle the server for production. |
| `npm run start` | Run the production server bundle. |
| `npm run db:push` | Push Drizzle schema changes to the database. |

## Current Status

GameForgeStudio is active and in progress. The platform currently demonstrates the core hub concept, dual Developer/Gamer experiences, session authentication, project and store workflows, community features, and external Buttonz navigation.

The next phase is focused on making the platform behavior tighter and more production-shaped while keeping the current status honest and clearly documented.


## Related App

- [Buttonz](../buttonz) - standalone communication app for the GameForgeStudio ecosystem.

## Resume Notes

This project highlights full-stack TypeScript development, role-based UX design, shared schema modeling, REST API design, session authentication, database-backed application architecture, and ecosystem-level product thinking.
