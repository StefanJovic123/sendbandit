# E2E findings — 2026-10-28

Browser run against a local stack: Next.js dev on `localhost:3000`, the 5 API workers the web app calls (auth, clients,
templates, campaigns, analytics) under `wrangler dev`, a small path router on `:8800` doing what the Caddyfile does,
the `sendbandit-dev` Supabase project, and the Clerk development instance. Signed in as the dedicated test user
`e2e+clerk_test@example.com` (Clerk test email, code `424242`), admin of "Stefan's Organization".
Test records created during the run were deleted afterwards.

**Status (2026-10-28):** all six must-fix items are fixed, plus #8, #18, #19 and #20, each re-tested after the change.
They're committed on the branch `fix/e2e-findings`. Fixing them turned up #18–#22.

## What works

- Logged-out visit to `/dashboard` redirects to `/sign-in`; sign-in with email code lands on `/dashboard` with the org active.
- Clients list, client detail and its contacts load real data (3 clients, 8 contacts).
- Templates list loads (5 templates, channel filter counts are right).
- Campaigns list loads when opened from the sidebar (2 campaigns).
- Campaign builder opens; a draft with only the trigger node saves (`POST /campaigns` 201).
- Add Client saves (`POST /clients` 201).
- Channels page loads both connections.
- Sign-out (desktop width) returns to the landing page.
- Unauthenticated API calls get 401; CORS preflights pass for `localhost:3000`.

## Must fix

1. ~~**API returns snake_case, UI reads camelCase.**~~ **Fixed 2026-10-28.** Services returned raw Supabase rows
   (`created_at`, `trigger_type`, `client_id`, `flow_data`) while the pages and the API response types read camelCase:
   the campaign detail page crashed for every campaign, the edit page showed no client and an empty canvas, and dates
   showed "Invalid Date". Every row now goes through `toCamelCase` (new in `packages/shared/src/utils/index.ts`; it
   renames top-level keys only, so JSON columns such as `flow_data` keep their own keys) in api-auth, api-clients,
   api-templates, api-campaigns, api-analytics and api-billing. Nothing in the web app read snake_case.
   Verified in the browser: real dates in the clients table, template cards and campaign cards; campaign detail renders
   (type, trigger, created/updated); the edit page shows the client and the stored 4-node flow; contact messages show
   times and failure reasons. All six services and the shared package type-check.
2. ~~**Campaigns with a Send node can't be saved.**~~ **Fixed 2026-10-28.** The builder created `type: 'send'`, which
   the API rejects (400), and only logged the error. While fixing it, four more save problems turned up and were fixed:
   - Node data didn't match the API schema, which the queue processor also executes: wait `{duration, unit}` instead
     of `waitDuration`, flat condition fields instead of `condition`, `splitRatio` instead of `splitPercentages`. Zod
     drops unknown keys, so those settings were silently lost on save.
   - Condition handles were `yes`/`no`; the queue processor follows `true`/`false`.
   - Save Draft on the edit page called `createCampaign`, so it made a new campaign instead of updating.
   - api-campaigns ignored Supabase insert/update errors and answered 201/200 anyway.
   The builder now uses the API format (send nodes also store the selected template's channel, which the queue
   processor needs), converts flows stored in the old format when they are loaded (both seeded campaigns use it),
   updates existing campaigns, and shows the API's error in the builder. The create/update server actions return
   the error instead of throwing, since Next.js hides thrown server action messages in production.
   Verified in the browser: new campaign with Send (template) and Wait (2 hours) nodes and two edges → `POST 201`,
   stored as `send_message {templateId, channel}` and `wait {waitDuration: {value: 2, unit: hours}}`; editing it →
   `PATCH 200`, still 3 campaigns; the seeded "Welcome Series" opens with its old nodes shown correctly; saving it
   (active) shows "Could not save the campaign: Can only edit draft campaigns".
3. ~~**Unauthenticated Clerk webhook in api-auth.**~~ **Fixed 2026-10-28.** `POST /webhooks/clerk` accepted unsigned
   requests (confirmed: an unsigned `organization.deleted` got 200), so anyone could delete an org and, by cascade, its
   data. It now checks the Svix signature with `CLERK_WEBHOOK_SECRET` (`verifySvixSignature` in
   `packages/shared/src/utils/crypto.ts`), rejects bad or stale signatures with 401, and returns 500 when the secret is
   not set. Verified locally: 8/8 signature cases (valid, rotation, tampered body, old/future timestamp, wrong secret,
   wrong version, no headers). Deploy note: set the `CLERK_WEBHOOK_SECRET` Worker secret before Clerk points at api-auth.
4. ~~**Next.js 14.1.0.**~~ **Fixed 2026-10-28: now 14.2.35** (`next` and `eslint-config-next`). 14.1.0 had the
   middleware authorization bypass (CVE-2025-29927). Confirmed on 14.1.0: `/dashboard` with
   `x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware` skipped `middleware.ts` entirely
   (only the layout's own `auth()` call stopped the page). On 14.2.35 the same request redirects to `/sign-in`.
   The new `eslint-config-next` pulls in `@typescript-eslint/eslint-plugin`, so ESLint now loads during `next build`;
   15 existing lint errors (unused imports/variables) then failed the build and were removed. Type-check and build
   pass, with the same 23 routes as before. Browser: sign-out, logged-out redirect, sign-in, dashboard, clients,
   campaigns, channels.
5. ~~**Campaign pages bounce to `/dashboard` on direct load or refresh.**~~ **Fixed 2026-10-28.** It wasn't only the
   campaign pages: all 16 pages that redirect when there is no organization did it, the contact page too. Waiting for
   `useAuth().isLoaded` alone would not have helped. Until clerk-js loads, `useAuth()` answers from the
   server-rendered auth state, and that one never has an organization (see #19), so `isLoaded` is already `true`
   with `orgId: null`. The new `useActiveOrg()` (`apps/web/lib/hooks/use-active-org.ts`) reports the org only once
   Clerk has loaded in the browser (`useClerk().loaded`); the 16 pages redirect only after that. Verified in the
   browser: direct loads of the campaigns list, the contact page, campaign detail (and F5 on it), channels and
   analytics stay on their URL and load their data.
6. ~~**Menu actions that do nothing.**~~ **Fixed 2026-10-28.** The campaign card's Duplicate, Activate, Pause and Delete,
   the client row's Delete, and also the campaign detail page's Activate/Pause/Resume buttons and the builder's
   Activate button had no handlers.
   - Card menu: each action calls the API, then the list reloads. Paused campaigns now get Resume. Delete asks for
     confirmation first. Failures show the API's message in an alert, as the channels page already does.
   - Duplicate: there was no endpoint. The new `POST /campaigns/:id/duplicate` copies the campaign as a draft named
     "… (copy)", keeping the stored flow as it is (`campaigns.duplicate` in `@sendbandit/api-client`).
   - Client Delete: confirms first, warning that its contacts, their messages and its campaigns go too (the foreign
     keys cascade), then uses `useDeleteClient()`.
   - Builder Activate: saves, then activates.
   - API: the client and campaign delete endpoints now report Supabase errors instead of always returning success.
   Verified in the browser:
   - Card: Duplicate → 201 and the copy appears; Activate, Pause and Resume → 200, with the status badge and counts
     updated; Delete on an active campaign → 400 with "Cannot delete active campaign" shown; Delete on the paused
     copy → 200 and it's gone.
   - Detail page: Pause and Resume → 200, with the badge and button switching.
   - Builder: Activate → PATCH 200, then activate 200.
   - Clients: a client added with Add Client was deleted through the row menu (200, row gone).
   All test data was removed through the UI; DB row counts match the baseline.

## Should fix

7. ~~**Clerk sync is webhook-only, with no backfill.**~~ **Fixed 2026-10-28.** Organizations whose webhook delivery never
   arrived (2 of 4 orgs and 1 user here, from before the webhook was set up) failed with `ORG_NOT_FOUND`. Webhooks do
   work now: they go to the `clerk-webhook` Supabase edge function, and a new org showed up in the DB within seconds.
   When the org isn't in the DB, `orgContextMiddleware` (`packages/middleware/src/org-context.ts`) now creates it from
   the Clerk API on first use (`CLERK_SECRET_KEY`), together with the user's membership and, if missing, their
   profile. The verified session token proves the membership; the role comes from its org claim (`o.rol`, now passed
   on as `orgRole`). Upserts on the unique keys make parallel requests safe. The Clerk role mapping moved to
   `clerkRoleToOrganizationRole` in `@sendbandit/shared/constants`, which api-auth now uses too; it accepts both the
   webhook form (`org:admin`) and the v2 token form (`admin`). Verified in the browser with a throwaway Clerk org whose
   DB rows were deleted to simulate a missed delivery: before, `GET /clients` → 404 and the page loaded forever;
   after, 200, "No clients yet", and the DB had the org, an `admin` membership and the profile. The org was deleted in
   Clerk afterwards and the webhook removed its rows. The missing orgs from before get created the first time someone
   opens them.
8. ~~**api-auth webhook maps roles wrong.**~~ **Fixed 2026-10-28.** `memberData.role === 'admin'` never matched Clerk's
   `org:admin`, so every member became `user`, and role changes (`organizationMembership.updated`) weren't handled at
   all. api-auth now maps roles like the clerk-webhook edge function (`org:admin` → admin, `org:member` → user, plus
   the legacy keys `admin`/`basic_member`/`guest_member`) and applies role changes. Verified with Svix-signed
   deliveries for a throwaway org against the running worker (Clerk can't reach localhost, so no real delivery):
   before, `org:admin` was stored as `user` and the role change was ignored; after, `admin`/`user`, and the change to
   admin was applied. The org was deleted again (members cascade). The 8 signature cases from #3 still pass.
9. ~~**Channel webhook URLs are hardcoded to the dev host** `https://webhooks.sendbandit.local/...`
   (`services/api-clients/src/index.ts:152`); production connections would store an unreachable URL.~~ **Fixed
   2026-10-29.** api-clients builds the URL from a new `WEBHOOKS_URL` var. `wrangler.toml` keeps the local host, and
   the Deploy Workers workflow passes the production one with `wrangler deploy --var` (repository variable
   `WEBHOOKS_URL`, default `https://webhooks.sendbandit.com`); a missing value fails channel creation instead of storing
   a wrong URL. Verified: `wrangler deploy --dry-run` with the workflow's flag lists the var, and with api-clients run
   locally with `--var WEBHOOKS_URL:https://hooks.e2e.test`, a Telegram connection created in the browser got
   `https://hooks.e2e.test/telegram/chn_…`. Still open: the existing WhatsApp row's id (and so its URL) is
   `undefined_…` from an earlier ID-prefix bug; the `webhook_secret` column is made with `Math.random`, though nothing
   verifies webhooks with it (the providers' own secrets in `credentials` are used).
10. ~~**Mobile layout: Clerk menus can't be used.**~~ **Fixed 2026-10-29.** The narrow-screen sidebar was a modal Radix
    sheet, which sets `pointer-events: none` on `<body>` and traps focus. Clerk renders the account menu, the
    organization switcher and their modals in portals at the end of `<body>`, so their items got no clicks and their
    inputs couldn't take focus. The mobile sheet is now non-modal with its own backdrop, and clicks or focus inside
    Clerk's portals no longer close it (`components/ui/sidebar.tsx`). Verified in the browser at phone width: Manage
    account opens and its fields take input (cancelled without saving); the organization switcher's Manage opens the
    organization modal, whose Members page and search work; Sign out signs out, and signing in again works; tapping the
    backdrop closes the sidebar; links still navigate.
11. ~~**New client doesn't show up until a reload.**~~ **Fixed 2026-10-29.** The Clients and Templates lists come from the
    react-query cache, which counts a result as fresh for a minute. Clients and templates are saved through server
    actions, and contacts through the contact dialogs, all outside that cache, so a list opened within the minute
    showed the old result. The two lists now refetch every time they're shown (`refetchOnMount: 'always'` in
    `useClients` and `useTemplates`). Verified in the browser in a throwaway org, each time within the minute: Add
    Client returned to a list that showed the new client right away. The contact count went from 0 to 1 after adding a
    contact. A new template showed up on Templates. Deleting the client from its row menu emptied the list.
12. **Placeholder pages.** Dashboard numbers are hardcoded (`dashboard/page.tsx:47,68`); Analytics shows zeros and makes
    no API call (`analytics/page.tsx:58`, DB has 18 messages); Settings is a static form (empty org name, Save does nothing).
13. ~~**Add Client saves industry "Technology"** although the form still shows "Select industry".~~ **Fixed
    2026-10-29.** The Industry select started at `''`. Radix only adds an empty option to the hidden form `<select>` when
    the value is `undefined`, so the browser selected the first industry and the form submitted it. It now starts at
    `undefined` (`clients/client-form.tsx`). Verified in the browser: a client added without an industry is listed
    with "-" (before: "Technology"), and choosing Retail in the edit form saves Retail.
18. ~~**Old DB password in all 10 `services/*/wrangler.toml`**~~ **Fixed 2026-10-28.** `[[hyperdrive]]
    localConnectionString` held the database password that was rotated on 2026-10-28. It now points at a credential-free
    placeholder (`postgresql://postgres:postgres@localhost:5432/postgres`). Wrangler needs some value to start locally,
    and no code uses the `HYPERDRIVE` binding (the services use supabase-js). To point local Hyperdrive at a real
    database, set `WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in the shell (the variable name for wrangler 3;
    it overrides the file). No credentialed connection strings are left in tracked files (`setup-local.sh` only has
    `[password]` templates). The old password is still in git history, which is acceptable because it no longer works.
    Verified: all five API workers start with the placeholder; clients, templates and campaigns load in the browser.
19. ~~**The Next.js server never sees the active organization.**~~ **Fixed 2026-10-28: `@clerk/nextjs` 6.39.8.** The Clerk
    instance issues v2 session tokens (org in the `o` claim), and `@clerk/nextjs` 5.7.5 bundled `@clerk/backend` 1.14.1,
    which only reads the v1 `org_id` claim, so server-side `auth().orgId` was always `undefined`. v6 bundles backend
    2.33.8. Logging it in the middleware on hard loads now prints the org (`org_392l…`) instead of `undefined`. The
    workarounds are gone: `lib/auth.ts` (the `__org_id` cookie fallback, which nothing imported) and
    `dashboard/org-sync.tsx` (which compared the client's org with itself, so it never fired). The dashboard now waits
    for Clerk like the other pages instead of flashing the organization picker. No code needed v6 changes: `auth()` was
    already awaited everywhere. Verified in the browser: sign-out, logged-out redirect (and the bypass header still
    blocked), sign-in with the email code straight to the dashboard with the org active (no "choose organization"
    step), clients and campaigns load through the API, direct load of a campaign page. Type-check and production
    build pass.
20. ~~**`GET /templates/media` can't be reached.**~~ **Fixed 2026-10-28.** api-templates registered `GET /:id` before
    `GET /media`, so `/media` was handled as a template lookup. The media routes now come first (moved unchanged, with a
    comment explaining the order). Verified in the browser with the signed-in session: before,
    `GET /templates/media` → 404 "Template not found"; after, 200 `{"data":[]}`. `GET /templates/:id` still returns
    200, and the template pages load.
21. ~~**Seeded campaigns use the builder's old flow format**~~ **Fixed 2026-10-28.** `packages/database/src/seed-real.ts`
    wrote `send` nodes without a channel, `{duration, unit}` waits and `triggerType` on the trigger node, which the
    queue processor can't execute. The seed now writes the API format: `send_message` with `templateId` and the
    template's `channel`, and `waitDuration`. The two campaigns already in the dev database were converted the same
    way. Their old `flow_data` was backed up first, and each converted flow passed the API's own `updateCampaignSchema`
    before it was written; `updated_at` was left alone. Verified in the browser: both open in the builder with their
    nodes shown correctly; saving the draft "Summer Sale Blast" unchanged returns 200, and the stored flow keeps the
    new format. (The flow type in `packages/database/src/schema/campaigns.ts` is loose (`type: string`), which is how
    the seed slipped through; the shared `FlowData` type is strict.)

26. ~~Deployed workers would run with `ENVIRONMENT = "development"`~~ **Fixed 2026-10-29.** CI deployed with plain
    `wrangler deploy`, which uses the top-level `[vars]` that local dev uses too. In production that would return
    internal error messages to clients (`packages/middleware/src/error-handler.ts`) and make api-clients send messages
    directly instead of through the queue. The Deploy Workers workflow now passes `--var ENVIRONMENT:production`.
    Verified with `wrangler deploy --dry-run` and the workflow's flags: before, `ENVIRONMENT: "development"`; after,
    `ENVIRONMENT: "production"`.

## Minor

14. ~~Page header says "Dashboard" on detail pages (client, campaign builder, channels): `components/site-header.tsx:18`
    falls back to it for unknown paths.~~ **Fixed 2026-10-29.** Pages under a section now take its title (longest match,
    with Channels added). Verified in the browser: the Channels page and a client page show "Channels" and "Clients".
15. `apps/web/next.config.js:3` turns off TLS verification for the whole dev server (`NODE_TLS_REJECT_UNAUTHORIZED=0`);
    trust the local CA with `NODE_EXTRA_CA_CERTS` instead.
16. ~~N+1 queries: contact counts per client in `GET /clients`, and the campaigns page fetches campaigns client by
    client.~~ **Fixed 2026-10-29.** `GET /clients` gets the counts with the clients (`contacts(count)`, one query instead
    of one per client). `GET /campaigns` without `clientId` now lists the whole organization (inner join on the
    organization's clients, which also gives each campaign's `clientName`), and the enrollment stats of all listed
    campaigns come from one query instead of one per campaign. The Campaigns page makes one request instead of one per
    client. Verified in the browser: the Clients page shows the same counts (4/2/2); the Campaigns page lists both
    campaigns with their clients from one request; in the throwaway org, a test campaign with 3 enrollments (2
    completed) showed 3 and 2, and only that org's campaigns were listed. Through the API, `?clientId=` still works for
    the org's own client (200) and gives 404 for another org's client. The test rows were deleted. (The Campaigns page
    loads up to 100 campaigns; the old per-client requests stopped at 20 per client.)
17. Local setup: default ports 8787/8790 can clash with other tools (ZDS Studio here), Caddy and PM2 aren't checked by
    `setup:local`, and `next dev -H 127.0.0.1` loops on Clerk's rewrite (use `localhost`).
22. ~~The template edit form's Status select only offers `active`/`draft` (`templates/template-form.tsx`), so templates
    with another status (the seeded ones are `approved`) open with an empty Status.~~ **Fixed 2026-10-29.** The edit
    page passed the stored status through a type cast. It now maps it the way the Templates list does: `approved` →
    Active, anything else → Draft (`templates/[id]/edit/page.tsx`). Verified in the browser: the approved "Welcome
    Message" opens with Status "Active" (left without saving).
23. ~~After switching organizations, the Clients page kept showing the previous org's clients until a reload.~~
    **Fixed 2026-10-29.** The react-query keys (`['clients']`, `['templates']`, … in `apps/web/lib/hooks`) didn't
    include the organization, so the cache was shared across orgs. Every key in the clients, templates and campaigns
    hooks now includes the active organization, and the queries wait for Clerk before fetching. The two lists show
    "Loading…" during that wait (`isPending`) instead of a brief "No clients yet". Verified in the browser with a
    throwaway org for the e2e user: Stefan's Organization's Clients page listed its 3 clients. Switching to the empty
    org and opening Clients within the minute the old list counts as fresh showed "No clients yet", where the bug had
    shown the previous org's clients. Switching back listed the 3 again. Templates load, also on a hard refresh.
24. ~~On phones the sidebar stays open after tapping a link, so it covers the page that just opened until the backdrop
    is tapped (`components/app-sidebar.tsx`).~~ **Fixed 2026-10-29.** The sidebar's links now close the phone sheet when
    followed (no effect on wider screens). Verified in the browser at phone width: tapping Clients and Channels closed
    the sidebar and showed the page.
25. The template form's Status select has no effect. `createTemplate` (`lib/actions/templates.ts`) doesn't send it, and
    the API's `createTemplateSchema`/`updateTemplateSchema` have no `status`, so new templates are always drafts and
    edits never change the status. Needs a decision: either let the API accept draft ↔ approved (nothing checks the
    status today), or show the status read-only if approval is meant to come from the channel provider.

## Still open from the earlier review

- ~~`pnpm lint` fails.~~ **Fixed 2026-10-28.** The root devDependencies now include `eslint` 8.57 and typescript-eslint
  8.72 (parser and plugin). Before, the 15 non-web packages only got ESLint through pnpm hoisting. A `pnpm.overrides`
  entry moves `eslint-config-next`'s own parser from 6.21 to 8 (its supported range includes 8), which removes the
  peer-dependency warning; the lockfile change is limited to lint packages. The 18 remaining errors in 10 packages
  were fixed: unused imports/variables, a `const`, braces for a `case` block, `_` prefixes for unused parameters,
  and `ignoreRestSiblings` for the omit-with-rest-destructuring pattern. `pnpm lint` (21/21), `pnpm type-check`
  (21/21), `pnpm test` and `pnpm install --frozen-lockfile` all pass locally, so the CI job should go green. The
  services were rebuilt and smoke-tested in the browser (campaigns, clients).
- Every push to `main` runs the Deploy Web and Deploy Workers workflows, which fail because the repository has no
  `CLOUDFLARE_API_TOKEN` (workers) or Clerk publishable key (web build) secrets, so nothing is deployed. Once
  the secrets are added, every push to `main` deploys.
- `scripts/setup-local.sh` is macOS-only and writes a root `.dev.vars` without the Supabase variables.
- No automated tests.
- Check whether `channel_connections.credentials` is encrypted at rest.
- Stripe keys are placeholders; billing wasn't tested.
