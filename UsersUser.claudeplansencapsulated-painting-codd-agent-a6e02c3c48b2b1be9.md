# Implementation Plan: 7 Features for TrackFlow

## Dependency Order & Migration Strategy

All 7 features require Prisma schema changes. These must be batched into a **single migration** to avoid migration chain issues. The implementation order respects dependencies:

1. **Prisma schema changes** (all 7 features model additions in one migration)
2. **Usage Limits Per Plan** (foundational - other features rely on plan checks)
3. **Free Trial** (depends on plan limits being enforced)
4. **Onboarding Flow** (standalone, but should respect plan limits UX)
5. **Referral System** (depends on trial/billing infrastructure)
6. **In-App Changelog** (standalone)
7. **Landing Page Redesign** (standalone, frontend-only)
8. **GDPR Data Export + Account Deletion** (standalone, can be last)

---

## Phase 0: Single Prisma Migration

**File**: `backend/prisma/schema.prisma`

Add all new fields and models in one batch:

### User model additions

Add these fields to the existing User model:

- `onboardingCompleted  Boolean   @default(false)`
- `trialEndsAt          DateTime?`
- `lastSeenChangelog    DateTime?`
- `referralCode         String?   @unique`
- `deletedAt            DateTime?` (soft-delete for GDPR)
- `scheduledDeletionAt  DateTime?` (30-day grace period)

### New model: Changelog

```prisma
model Changelog {
  id          String   @id @default(cuid())
  version     String
  title       String
  content     String
  publishedAt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("changelogs")
}
```

### New model: Referral

```prisma
model Referral {
  id             String         @id @default(cuid())
  status         ReferralStatus @default(PENDING)
  rewardApplied  Boolean        @default(false)
  createdAt      DateTime       @default(now())
  completedAt    DateTime?

  referrerId     String
  referrer       User           @relation("ReferralsMade", fields: [referrerId], references: [id], onDelete: Cascade)
  referredUserId String         @unique
  referredUser   User           @relation("ReferralReceived", fields: [referredUserId], references: [id], onDelete: Cascade)

  @@index([referrerId])
  @@map("referrals")
}

enum ReferralStatus {
  PENDING
  COMPLETED
}
```

### User model relation additions

- `referralsMade    Referral[] @relation("ReferralsMade")`
- `referralReceived Referral?  @relation("ReferralReceived")`

### Migration command

```bash
cd backend
npx prisma migrate dev --name add_onboarding_trial_changelog_referral_gdpr
npx prisma generate
```

### Frontend type updates

**File**: `frontend/src/types/index.ts` -- Add to User interface:
- `onboardingCompleted?: boolean`
- `trialEndsAt?: string | null`
- `referralCode?: string | null`

### JWT Strategy and getMe updates

**File**: `backend/src/auth/strategies/jwt.strategy.ts` -- Add `onboardingCompleted` to the select clause (line 27) and include it in the returned object.

**File**: `backend/src/auth/auth.service.ts` -- Update `getMe()` (line 186) to include `onboardingCompleted`, `trialEndsAt`, `referralCode` in the select.

**File**: `backend/src/auth/auth.service.ts` -- Update `register()` (line 78) to generate a `referralCode` using `crypto.randomBytes(6).toString("hex")` and include `onboardingCompleted` in the returned select.
---

## Feature 1: Usage Limits Per Plan

### Backend

**New file**: `backend/src/common/plan-limits.ts`

Export a PLAN_LIMITS constant:
- USER: `{ projects: 5, tasks: 100, teams: 1, teamMembers: 5 }`
- PRO: `{ projects: Infinity, tasks: Infinity, teams: Infinity, teamMembers: Infinity }`
- ADMIN: `{ projects: Infinity, tasks: Infinity, teams: Infinity, teamMembers: Infinity }`

**New file**: `backend/src/common/plan-limits.service.ts`

A shared injectable service that checks counts against limits:
- `async checkProjectLimit(userId)` -- count non-deleted projects, compare to plan limit, throw ForbiddenException if exceeded
- `async checkTaskLimit(userId)` -- count tasks
- `async checkTeamLimit(userId)` -- count owned teams
- `async checkTeamMemberLimit(teamId, ownerId)` -- count team members

The service must also check `trialEndsAt` -- if the user role is PRO but `trialEndsAt` is in the past and `stripeSubscriptionId` is null, treat them as USER for limit purposes. This integrates trial expiry into limit checks.

**New file**: `backend/src/common/plan-limits.module.ts` -- exports PlanLimitsService, imports PrismaModule.

**Modify**: `backend/src/projects/projects.service.ts`
- Inject PlanLimitsService
- In `create()` method (line 39): call `await this.planLimits.checkProjectLimit(userId)` before the Prisma create

**Modify**: `backend/src/tasks/tasks.service.ts`
- Inject PlanLimitsService
- In create() method: call `await this.planLimits.checkTaskLimit(userId)` before the Prisma create

**Modify**: `backend/src/teams/teams.service.ts`
- Inject PlanLimitsService
- In `createTeam()` (line 61): call `await this.planLimits.checkTeamLimit(userId)`
- In the join/add-member flow: call `await this.planLimits.checkTeamMemberLimit(teamId, team.ownerId)`

**Modify**: `backend/src/projects/projects.module.ts`, `backend/src/tasks/tasks.module.ts`, `backend/src/teams/teams.module.ts` -- import PlanLimitsModule.

### Frontend

**Modify**: `frontend/src/pages/BillingPage.tsx` -- Update FREE_FEATURES array (line 77) to match actual enforced limits: Up to 5 projects, 100 tasks, 1 team (5 members), Basic analytics.

Add error handling in project/task/team creation flows to show a toast with upgrade CTA when 403 is returned with a plan limit message.

### Verification
- Create a free user, create 5 projects, verify 6th fails with 403
- Create 100 tasks, verify 101st fails
- Create 1 team, verify 2nd fails
- Upgrade to PRO, verify unlimited creation works

---

## Feature 2: Free Trial (14 days PRO, opt-in)

### Backend

**Modify**: `backend/src/billing/billing.service.ts` -- Add method `startTrial(userId)`:
- Find user, check they are not already PRO, not ADMIN, and trialEndsAt is null (no prior trial)
- Set role=PRO, trialEndsAt=now+14days
- Return `{ trialEndsAt }`

**Modify**: `backend/src/billing/billing.controller.ts` -- Add endpoint:
- `POST /billing/start-trial` -- authenticated, calls `billingService.startTrial(user.id)`

**Trial expiry** -- use `@nestjs/schedule` (already imported in app.module.ts via ScheduleModule.forRoot()):

**New file**: `backend/src/billing/trial-expiry.cron.ts`
- Injectable class with `@Cron("0 * * * *")` running every hour
- Finds all users where role=PRO, trialEndsAt < now, stripeSubscriptionId is null
- Updates them to role=USER

**Modify**: `backend/src/billing/billing.module.ts` -- Add TrialExpiryCron to providers.

**Modify**: `backend/src/billing/billing.service.ts` -- Update `getSubscription()` to return `trialEndsAt` and `isTrial` boolean when user has trialEndsAt and no stripeSubscriptionId.

### Frontend

**Modify**: `frontend/src/pages/BillingPage.tsx`
- Add a "Start Free Trial" button in the Free plan card, visible when user.role === "USER" and user has no trialEndsAt
- When user is on trial (role=PRO, trialEndsAt exists, no subscription): show trial banner with days remaining and "Upgrade to keep Pro" CTA
- Mutation: `api.post("/billing/start-trial")`, on success call `fetchMe()` to refresh user state

### Verification
- Free user clicks "Start Free Trial" -> role becomes PRO, trialEndsAt set to 14 days out
- User sees trial banner with countdown
- After trial expires (test by setting trialEndsAt to past), cron sets role back to USER
- User who already used trial cannot start another
- User with active Stripe subscription is not affected by cron
---

## Feature 3: Onboarding Flow

### Backend

**Modify**: `backend/src/auth/auth.service.ts` -- Add method:
- `completeOnboarding(userId)` -- updates onboardingCompleted to true

**Modify**: `backend/src/auth/auth.controller.ts` -- Add endpoint:
- `POST /auth/complete-onboarding` -- authenticated, calls `authService.completeOnboarding(user.id)`

### Frontend

**New file**: `frontend/src/pages/OnboardingPage.tsx`

Multi-step stepper with 5 steps:
1. **Welcome** -- greeting with user first name, brief explanation of what TrackFlow does
2. **Create First Project** -- simple form (name, color picker), calls `POST /projects`
3. **Create First Task** -- form (title, priority), auto-assigns to project from step 2, calls `POST /tasks`
4. **Start Timer** -- shows the task, has a "Start Timer" button that calls `POST /time-tracker/start`, then shows running timer briefly, then "Next"
5. **Done** -- celebration graphic, "Go to Dashboard" button

Each step has a "Skip" link. On final step (or skip all), call `POST /auth/complete-onboarding`.

UI pattern: full-page layout (no sidebar), stepper progress bar at top, card-based form in center. Use existing dark theme with indigo accents.

**Modify**: `frontend/src/App.tsx`
- Add lazy import for OnboardingPage
- Add route BEFORE the `/app` Layout route but still inside PrivateRoute. Place it as a standalone route so it does NOT use the sidebar Layout

**Modify**: `frontend/src/pages/RegisterPage.tsx`
- Line 27: Change `navigate("/app/dashboard")` to `navigate("/app/onboarding")`

**Modify**: `frontend/src/store/authStore.ts`
- Ensure onboardingCompleted flows through fetchMe

**Add redirect guard**: In the Layout component or DashboardPage, check if `user.onboardingCompleted === false` and redirect to `/app/onboarding`. This ensures users who refresh or navigate directly still get routed to onboarding.

### Verification
- Register new user -> redirected to /app/onboarding
- Complete all steps -> onboardingCompleted=true, redirected to dashboard
- Skip all steps -> same result
- Existing users (onboardingCompleted=false) -> can skip or complete
- Direct navigation to /app/dashboard with onboardingCompleted=false -> redirected to onboarding

---

## Feature 4: Referral System

### Backend

**New file**: `backend/src/referral/referral.service.ts`

Methods:
- `getReferralInfo(userId)` -- return user referralCode, count of successful referrals, pending referrals
- `applyReferralCode(referredUserId, code)` -- find referrer by code, create Referral record with PENDING status
- `completeReferral(referredUserId)` -- called after registration completes, mark COMPLETED, apply reward
- `applyReward(referrerId)` -- grant 1 month free: if referrer is USER with no trial, start 30-day trial; if on trial, extend trialEndsAt by 30 days; if paid PRO, log for future credit (stretch goal)

**New file**: `backend/src/referral/referral.controller.ts`
- `GET /referral/info` -- authenticated, returns referral code and stats
- `POST /referral/apply` -- body `{ code }`, authenticated, applies referral code

**New file**: `backend/src/referral/referral.module.ts` -- imports PrismaModule, BillingModule

**Modify**: `backend/src/app.module.ts` -- import ReferralModule

**Modify**: `backend/src/auth/auth.service.ts` -- In `register()`:
- Accept optional referralCode in RegisterDto
- After user creation, if referralCode provided, call referralService to create and complete referral

**Modify**: `backend/src/auth/dto/register.dto.ts` -- Add optional `referralCode?: string` field with `@IsOptional()` and `@IsString()` decorators

### Frontend

**Modify**: `frontend/src/pages/RegisterPage.tsx`
- Check URL for `?ref=CODE` query parameter
- If present, include referralCode in registration payload
- Show small banner: "Referred by a friend! You both get rewards."

**Modify**: `frontend/src/pages/SettingsPage.tsx`
- Add "Referral Program" card section
- Display user referral code with copy button
- Show shareable link: `{window.location.origin}/register?ref={code}`
- Show referral stats (count of successful referrals)

### Verification
- User A registers -> gets a referralCode
- User A shares link `/register?ref=ABC123`
- User B registers with that link -> Referral created as COMPLETED
- User A gets reward (trial extended or started)
- User B cannot use their own referral code
- Invalid referral codes are silently ignored (no registration failure)
---

## Feature 5: In-App Changelog Modal

### Backend

**New file**: `backend/src/changelog/changelog.service.ts`

Methods:
- `getPublicChangelogs(limit = 10)` -- return recent changelogs ordered by publishedAt desc
- `getUnseenChangelogs(userId)` -- return changelogs where publishedAt > user.lastSeenChangelog
- `markSeen(userId)` -- update user.lastSeenChangelog to now()
- `create(dto)` -- admin only, create changelog entry
- `update(id, dto)` -- admin only
- `delete(id)` -- admin only

**New file**: `backend/src/changelog/changelog.controller.ts`
- `GET /changelog` -- public, returns recent entries
- `GET /changelog/unseen` -- authenticated, returns unseen entries
- `POST /changelog/mark-seen` -- authenticated, marks all as seen
- `POST /changelog` -- admin only (use RolesGuard), create entry
- `PATCH /changelog/:id` -- admin only, update
- `DELETE /changelog/:id` -- admin only, delete

**New file**: `backend/src/changelog/changelog.module.ts` -- imports PrismaModule, AuthModule (for RolesGuard)

**New file**: `backend/src/changelog/dto/create-changelog.dto.ts` -- version, title, content fields

**Modify**: `backend/src/app.module.ts` -- import ChangelogModule

### Frontend

**New file**: `frontend/src/components/ChangelogModal.tsx`

A modal component that:
- Fetches `GET /changelog/unseen` on mount (using useQuery)
- If there are unseen entries, shows modal overlay with list of changes (title, version badge, content)
- "Got it" button calls `POST /changelog/mark-seen` and closes modal
- Stores dismiss state in sessionStorage to avoid re-showing on same-session navigation

**Modify**: `frontend/src/components/Layout.tsx`
- Import and render `<ChangelogModal />` so it appears on any authenticated page load

### Verification
- Admin creates changelog entry with version "1.2.0"
- User logs in -> modal appears showing the entry
- User clicks "Got it" -> lastSeenChangelog updated
- User refreshes -> modal does not reappear
- Admin creates another entry -> modal appears again on next refresh

---

## Feature 6: Landing Page Redesign

### Frontend

**Modify**: `frontend/src/pages/HomePage.tsx` -- Full rewrite

The existing page has: nav, hero, stats, features grid, pricing (3 tiers), FAQ, footer. Keep these sections but redesign:

#### Sections (in order):
1. **Navbar** -- Sticky, glassmorphism background on scroll. Logo + nav links (Features, Pricing, FAQ) + CTA buttons (Login, Get Started Free)
2. **Hero** -- Split layout: left text (headline, subtext, dual CTA buttons, trust badges), right side animated dashboard preview (CSS gradient shapes)
3. **Social proof bar** -- "Trusted by teams at..." with placeholder company name pills
4. **Features grid** -- Keep existing 6 features, use alternating left-right layout for top 3, then 3-column grid for remaining
5. **Stats counter** -- Keep existing animated counters, redesign with larger numbers
6. **Testimonials** -- NEW section. 3 placeholder testimonials in cards with avatar initials, names, roles, quotes. Horizontal scroll on mobile
7. **Pricing** -- 3-tier cards (Free / Pro / Team). Pro card elevated with "Most Popular" badge. Team card is "Contact Us"
8. **FAQ** -- Keep existing accordion, improve spacing
9. **CTA Banner** -- Full-width gradient banner: "Ready to boost your productivity?"
10. **Footer** -- Links columns, copyright, social icon placeholders

#### Design tokens:
- Background: `#030712`
- Primary gradient: `#6366f1` to `#8b5cf6`
- Accent for Pro: `#f59e0b`
- Cards: `#0f172a` with `#1e293b` borders
- Navbar glass: `backdrop-filter: blur(12px)`, semi-transparent bg
- Subtle dot-grid background via CSS radial-gradient

### Verification
- Visual review at desktop (1280px), tablet (768px), mobile (375px)
- All nav links scroll to correct sections
- Login/Register links navigate correctly
- Animated counters trigger on scroll
- FAQ accordion works
---

## Feature 7: GDPR Data Export + Account Deletion

### Backend

**New file**: `backend/src/gdpr/gdpr.service.ts`

Methods:
- `exportUserData(userId): Promise<Buffer>` -- Gathers all user data, generates CSVs, zips them
  - CSVs: profile.csv, projects.csv, tasks.csv, time_entries.csv, calendar_events.csv, tags.csv, teams.csv, team_memberships.csv, task_comments.csv, notifications.csv, support_tickets.csv
  - Use `archiver` npm package for ZIP creation
  - Each CSV has headers matching model fields

- `requestAccountDeletion(userId, confirmationEmail)` -- Validate email matches user, set scheduledDeletionAt to 30 days from now

- `cancelAccountDeletion(userId)` -- Clears scheduledDeletionAt

- `executeScheduledDeletions()` -- Cron job: find users where scheduledDeletionAt < now(), cascade delete them

**New file**: `backend/src/gdpr/gdpr.controller.ts`
- `GET /gdpr/export` -- authenticated, streams ZIP as download (Content-Type: application/zip)
- `POST /gdpr/delete-account` -- authenticated, body `{ confirmation: string }` (must match email)
- `POST /gdpr/cancel-deletion` -- authenticated

**New file**: `backend/src/gdpr/gdpr.module.ts` -- imports PrismaModule

**New file**: `backend/src/gdpr/gdpr-cleanup.cron.ts` -- `@Cron("0 3 * * *")` daily at 3am

**Modify**: `backend/src/app.module.ts` -- import GdprModule

**Add dependency**: `npm install archiver @types/archiver`

### Frontend

**Modify**: `frontend/src/pages/SettingsPage.tsx` -- Add two new card sections at the bottom:

**Export Your Data card**:
- Description text explaining included data
- "Export My Data" button -> calls `GET /gdpr/export` with `responseType: "blob"`
- Triggers browser download via URL.createObjectURL
- Loading state while generating

**Delete Account card** (red/danger border):
- Warning text explaining 30-day grace period
- If scheduledDeletionAt is set: show countdown + "Cancel Deletion" button
- If not: "Delete My Account" button
- Confirmation modal requires typing email to confirm
- Calls `POST /gdpr/delete-account` with `{ confirmation: email }`
- Success banner with scheduled deletion date

### Verification
- User clicks Export -> downloads ZIP with CSVs containing actual data
- Each CSV has correct headers and rows
- User requests deletion -> scheduledDeletionAt set, UI shows pending state
- User cancels deletion -> cleared, UI returns to normal
- Cron deletes users past their scheduled date
- Deleted user sessions are invalidated

---

## Implementation Sequence (Recommended)

1. **Phase 0**: Prisma schema migration (all model changes) + type/auth updates
2. **Feature 1**: Usage Limits -- foundational, affects all create operations
3. **Feature 2**: Free Trial -- depends on limits being enforced
4. **Feature 3**: Onboarding -- standalone, high user-impact
5. **Feature 4**: Referral System -- depends on trial infrastructure
6. **Feature 5**: Changelog -- standalone, low complexity
7. **Feature 6**: Landing Page -- frontend only, can be done in parallel
8. **Feature 7**: GDPR -- standalone, requires new npm dependency

**Parallelizable**: Features 5, 6, and 7 have no dependencies on each other.

---

## New Files Summary

| File | Feature |
|------|--------|
| `backend/src/common/plan-limits.ts` | Usage Limits |
| `backend/src/common/plan-limits.service.ts` | Usage Limits |
| `backend/src/common/plan-limits.module.ts` | Usage Limits |
| `backend/src/billing/trial-expiry.cron.ts` | Free Trial |
| `frontend/src/pages/OnboardingPage.tsx` | Onboarding |
| `backend/src/referral/referral.service.ts` | Referral |
| `backend/src/referral/referral.controller.ts` | Referral |
| `backend/src/referral/referral.module.ts` | Referral |
| `backend/src/changelog/changelog.service.ts` | Changelog |
| `backend/src/changelog/changelog.controller.ts` | Changelog |
| `backend/src/changelog/changelog.module.ts` | Changelog |
| `backend/src/changelog/dto/create-changelog.dto.ts` | Changelog |
| `frontend/src/components/ChangelogModal.tsx` | Changelog |
| `backend/src/gdpr/gdpr.service.ts` | GDPR |
| `backend/src/gdpr/gdpr.controller.ts` | GDPR |
| `backend/src/gdpr/gdpr.module.ts` | GDPR |
| `backend/src/gdpr/gdpr-cleanup.cron.ts` | GDPR |

## Modified Files Summary

| File | Features |
|------|----------|
| `backend/prisma/schema.prisma` | ALL (Phase 0) |
| `backend/src/app.module.ts` | Referral, Changelog, GDPR |
| `backend/src/auth/auth.service.ts` | Onboarding, Referral, Phase 0 |
| `backend/src/auth/auth.controller.ts` | Onboarding |
| `backend/src/auth/dto/register.dto.ts` | Referral |
| `backend/src/auth/strategies/jwt.strategy.ts` | Phase 0 |
| `backend/src/billing/billing.service.ts` | Free Trial |
| `backend/src/billing/billing.controller.ts` | Free Trial |
| `backend/src/billing/billing.module.ts` | Free Trial |
| `backend/src/projects/projects.service.ts` | Usage Limits |
| `backend/src/projects/projects.module.ts` | Usage Limits |
| `backend/src/tasks/tasks.service.ts` | Usage Limits |
| `backend/src/tasks/tasks.module.ts` | Usage Limits |
| `backend/src/teams/teams.service.ts` | Usage Limits |
| `backend/src/teams/teams.module.ts` | Usage Limits |
| `frontend/src/types/index.ts` | Phase 0 |
| `frontend/src/store/authStore.ts` | Phase 0 |
| `frontend/src/App.tsx` | Onboarding |
| `frontend/src/pages/RegisterPage.tsx` | Onboarding, Referral |
| `frontend/src/pages/BillingPage.tsx` | Free Trial, Usage Limits |
| `frontend/src/pages/SettingsPage.tsx` | Referral, GDPR |
| `frontend/src/pages/HomePage.tsx` | Landing Page |
| `frontend/src/components/Layout.tsx` | Changelog |