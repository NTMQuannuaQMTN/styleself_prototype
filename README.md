# StyleSelf

AI commerce for fashion. StyleSelf gives fashion merchants a ready-to-deploy AI
commerce agent that helps customers discover, compare, and buy — all without
leaving the conversation.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`) for styling, tokens defined in
  [src/index.css](src/index.css)
- **react-router-dom** for routing

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## Structure

```
src/
  main.tsx                 # router + app entry
  pages/
    LandingPage.tsx        # composes the landing sections
    ComingSoon.tsx         # placeholder for auth screens (later phase)
  components/landing/       # landing-page sections
  hooks/useReveal.ts        # scroll-into-view animation helper
```

## Status

This is the **landing page** phase. Authentication, the merchant and customer
dashboards, the AI agent, and payments are later phases. All data shown on the
landing page is static/mock. CTA routes (`/login`, `/create-account?role=…`)
are wired to their final paths but render a placeholder for now.
