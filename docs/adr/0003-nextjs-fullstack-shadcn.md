# Full-stack Next.js (App Router) with shadcn/ui

The platform is built as a single Next.js application using the App Router, handling both the frontend (Server and Client Components) and the API (Route Handlers and Server Actions). shadcn/ui provides the component library.

This replaces the alternative of a separate API service (e.g., Express/Fastify) with a dedicated frontend — a split that adds deployment complexity and a network boundary with no benefit at our current scale. Next.js App Router gives us a single deployment unit, a single TypeScript type system across client and server, co-located data fetching via Server Components, and a first-class i18n story via `next-intl` or equivalent.

shadcn/ui was chosen over a fully managed component library (MUI, Ant Design) to keep full control over component markup and styling, which matters for white-label invitation rendering where platform branding must be fully replaceable without fighting a third-party component's DOM structure.

Pages Router was not chosen. App Router is the current default and provides the server component model needed for efficient data fetching at the Ceremony and Guest list scale.
