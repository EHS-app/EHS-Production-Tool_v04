# Customer Portal — Implementation Plan

A read-mostly portal where end clients (the customer paying for the event) can see their project's status, the curated briefing pack, schedule, and sign off on items that require approval. Mirrors the existing **Freelance Portal** pattern.

---

## 1. Goals & non-goals

### Goals
- A logged-in surface customers visit at `/customer` (same React app, separate role).
- Customer sees **only** projects the producer has explicitly shared with them.
- Read-only access to: project status, schedule, venue, contacts, LED & Stage diagrams, Show Simulation summary, attached documents.
- One write surface: **approvals** (Approve / Request change with note).
- Optional: a comment thread per project for lightweight back-and-forth.

### Non-goals (for v1)
- No quoting / invoicing / payment.
- No editing of brief content by the customer.
- No multi-tenant company management (one customer = one Clerk user; multiple-users-per-company comes in v2).
- No e-signature legal binding (just a button + audit trail).

---

## 2. Architecture

| Layer | What's added | Notes |
|---|---|---|
| Auth | New Clerk role `customer` | Reuses existing Clerk setup, no second auth provider. |
| Routing | `/customer/*` routes in the rigging-load-report app | Sibling to `/portal/*` (freelancer). Layout component `CustomerLayout.tsx`. |
| DB | 3 new tables (see §3) | Drizzle migration via `drizzle-kit push`. |
| API | `/api/customer/*` routes | Same Express + Zod pattern as `portalBriefs.ts`. |
| Producer UI | "Customers" section on each project; "Invite customer" button | Lives inside Production Tool (existing app shell). |
| Customer UI | New `CustomerLayout`, `CustomerHome`, `CustomerProject`, `CustomerApprovals` screens | Reuses portal theme tokens (already aligned with main app). |
| i18n | New `customer.*` namespace | EN + Norwegian, same `useT()` plumbing. |

---

## 3. Data model

Three new tables:

### `customers`
| Field | Type | Notes |
|---|---|---|
| `id` | text PK | nanoid |
| `userId` | text | Clerk user id (the customer's login) |
| `companyName` | text | "ACME Festivals AS" |
| `displayName` | text | "Anna Hansen" |
| `email` | text | Cached from Clerk for search |
| `phone` | text | Optional |
| `notes` | text | Producer-only notes about this customer |
| `createdByUserId` | text | The producer who created/invited them |
| `createdAt`, `updatedAt` | timestamp | |

### `project_customers` (link table)
| Field | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `projectId` | text FK → projects | |
| `customerId` | text FK → customers | |
| `role` | text | `viewer` (v1 only; later: `approver`, `signer`) |
| `invitedAt` | timestamp | |
| `invitedByUserId` | text | Producer who linked them |
| Unique: `(projectId, customerId)` | | Prevents duplicates |

### `project_approvals`
| Field | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `projectId` | text FK → projects | |
| `requestedByUserId` | text | Producer who asked for approval |
| `title` | text | "Budget bump for extra LED panels" |
| `body` | text | Markdown-light description |
| `status` | text | `pending` → `approved` / `change_requested` |
| `decidedByCustomerId` | text FK → customers | Nullable until decided |
| `decidedAt` | timestamp | |
| `decisionNote` | text | Customer's reason if change requested |
| `attachmentObjectKey` | text | Optional Replit App Storage pointer |
| `createdAt`, `updatedAt` | timestamp | |

(Comments table deferred to v2.)

---

## 4. API surface

All routes are gated by `requireSignedIn` middleware (Clerk). Access is enforced by checking:
- **Customer routes**: requesting Clerk userId must match a row in `customers.userId` AND that customer must have a `project_customers` entry for the project being accessed.
- **Producer routes**: requesting Clerk userId must own the project (`projects.userId === auth.userId`).

### Customer-facing
```
GET    /api/customer/me                       → customer profile (or 404 if not invited)
GET    /api/customer/projects                 → list of projects shared with me
GET    /api/customer/projects/:id             → project detail (curated view)
GET    /api/customer/projects/:id/documents   → list of producer-shared attachments
GET    /api/customer/projects/:id/approvals   → approval requests visible to me
POST   /api/customer/approvals/:id/decide     → { decision: "approved" | "change_requested", note?: string }
```

### Producer-facing
```
GET    /api/customers                                       → producer's address book of customers
POST   /api/customers                                       → create a new customer (invites via email)
PATCH  /api/customers/:id                                   → edit company/contact info
POST   /api/projects/:id/customers                          → link an existing customer to a project
DELETE /api/projects/:id/customers/:customerId              → unlink
GET    /api/projects/:id/approvals                          → all approval requests on this project
POST   /api/projects/:id/approvals                          → create a new approval request
PATCH  /api/projects/:id/approvals/:approvalId              → edit (only while pending)
DELETE /api/projects/:id/approvals/:approvalId              → cancel
```

---

## 5. UI screens

### Customer side (`/customer/*`)
1. **`/customer`** — Home dashboard. Cards: "Your projects" (one card per shared project, status badge, next milestone). Empty state if no projects yet.
2. **`/customer/projects/:id`** — Project detail. Tabs:
   - **Overview** — venue, dates, key contacts, status.
   - **Schedule** — phase timeline (uses existing schedule rendering, read-only).
   - **Drawings** — LED & Stage diagrams (PNG previews, click to open full-size).
   - **Documents** — list of attached PDFs/files, click to download.
   - **Approvals** — pending requests at top, decided ones below. Per item: Approve / Request change buttons.
3. **`/customer/account`** — Profile, language, theme (3-way light/dark/system, same pattern as freelance portal).

### Producer side
- **Project Settings → Customers tab** (new): add/remove customers from this project; copy invite link.
- **Project Settings → Approvals tab** (new): create requests, see status, reopen.
- **Top-nav badge**: count of pending customer decisions across all projects.

---

## 6. Invitation flow

1. Producer clicks "Invite customer" → enters email + company.
2. Server creates a `customers` row with a placeholder `userId` (or holds it pending).
3. Server sends an email via the existing Gmail integration: "Olli invited you to view project X — click here to sign in".
4. Customer clicks link → Clerk sign-up flow with `role=customer` metadata.
5. On first sign-in, server matches email → links Clerk `userId` to the placeholder `customers` row.
6. From that point on, the link table `project_customers` controls what they see.

**Edge cases handled:**
- Customer signs up before being invited (signs in but no projects show → friendly "ask your producer to invite you" empty state).
- Customer re-invited after their account was deleted (server unlinks the dead userId, sends fresh invite).
- Producer revokes access (deletes from `project_customers`) — customer's next page-load returns 403.

---

## 7. Permissions matrix

| Action | Producer (owner) | Customer (linked) | Customer (not linked) |
|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ |
| List shared projects | n/a | ✅ (only their projects) | ✅ (empty list) |
| View project detail | ✅ | ✅ | ❌ 403 |
| View internal day rates / freelancer phones | ✅ | ❌ stripped from response | ❌ |
| View LED & Stage diagrams | ✅ | ✅ | ❌ |
| Decide approval | n/a | ✅ (if linked) | ❌ |
| Create approval | ✅ | ❌ | ❌ |
| Add/remove customers from project | ✅ | ❌ | ❌ |

The "stripping" of sensitive fields happens server-side in the `/api/customer/*` handlers — never trust the client to hide things.

---

## 8. Sequencing & milestones

**Milestone 1 — Foundation (≈ 2 days)**
- DB migration (3 tables).
- Server: customer CRUD + project-customer linking.
- Producer UI: "Customers" tab on a project (add / remove existing customers).

**Milestone 2 — Customer surface (≈ 2 days)**
- `CustomerLayout`, `CustomerHome`, `CustomerProject` overview tab.
- Auth-gate: signed-in user with no `customers` row → "request access" screen.
- Read-only display of venue, dates, schedule.

**Milestone 3 — Documents & diagrams (≈ 1 day)**
- Pull existing brief attachments + generated PDFs/LED PNGs into the customer view.
- Producer toggle: "Visible to customer" per document (so internal-only files don't leak).

**Milestone 4 — Approvals (≈ 2 days)**
- DB + API + producer create/edit/cancel flow.
- Customer decide flow with note.
- Notification email back to producer on decision.

**Milestone 5 — Invitations & polish (≈ 1 day)**
- Email invites via Gmail integration.
- i18n EN/NO for all customer screens.
- Top-bar badge with pending decision count.

Total: **~8 working days** for a clean v1.

---

## 9. Open questions to answer before building

1. **One customer = one user, or many users per company?** (v1 assumes single user; v2 can add company → many users.)
2. **Should the customer see the project budget?** Default no, unless producer explicitly toggles visibility per project.
3. **Should approval decisions be legally binding?** v1: soft (timestamp + IP recorded for audit, no e-sig). v2: integrate with a real e-sig provider if needed.
4. **Localisation default**: customer language — follow the OS, or inherit from the producer who invited them? (Recommend: follow OS, customer can override.)
5. **Email channel**: keep using producer's connected Gmail, or move to a transactional provider (Postmark, Resend)? (Recommend: Gmail for v1 to avoid adding a dependency.)

---

## 10. Risk register

| Risk | Mitigation |
|---|---|
| Customer sees internal data via a leaky API field | Strict response builders in `/api/customer/*` — whitelist fields, never `SELECT *`. |
| Producer accidentally deletes a customer that's linked to many projects | Soft-delete + confirmation modal showing affected projects. |
| Brief documents containing internal pricing get attached to customer view | Per-document "visible to customer" toggle defaults to **false**. Producer must opt in. |
| Customer abuse (mass refresh, scraping) | Per-customer rate limit at the proxy layer; existing Clerk session check absorbs most of this already. |

---

When you're ready, I can start Milestone 1 and we'll iterate from there.
