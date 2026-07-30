# DZRZVD 杜戛地

A refreshed website for DZRZVD, a Taipei outdoor and functional apparel brand.

## Pages

- Home and product collections
- Brand story
- Taipei retail location
- Dedicated Shopee catalog overview at `/products`
- Separate Shopee marketplace category pages at `/products/[categorySlug]`
- Protected operator interface at `/admin/shopee-catalog`

## Development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Vercel + Supabase catalog

The catalog implementation uses:

- Vercel Functions and a protected daily Cron route
- Supabase Postgres through its transaction pooler
- Supabase Auth for the invite-only operator interface
- Shopee Open Platform Shop, Product, and Public APIs

Copy `.env.example` to `.env.local` and configure the values locally. Never
commit `.env.local` or any production credential.

Apply `supabase/migrations` to an isolated non-production Supabase project
before connecting a production project. Add the invited operator's Supabase Auth
UUID to `app_private.app_admin`.

For a linked Supabase project, use `npm run db:push`. For the local Supabase
stack, use `npm run db:reset`. The SQL files under `supabase/migrations` are the
only migration history; Drizzle schema definitions mirror them for application
types and queries.

The application intentionally renders a setup state at `/products` when
Supabase has not been configured, so builds and existing public pages remain
available before platform provisioning is complete.

Run the full verification suite with:

```bash
npm test
```
