# CCB Scoring Pro — Premium Tournament System + Live Match Link

## Current State
The app is a fully deployed cricket scoring PWA (v82) with:
- Home dashboard with neon-dark card grid
- Ball-by-ball scoring, player selection, innings management
- Tournament engine (TournamentEngine.tsx) with pools A/B/C/D, fixed schedule, bracket
- Fixed schedule view with edit/delete admin controls
- Live match page (LiveMatchView in App.tsx) reading `ccb_live_match` from localStorage
- Admin password `Shahzad@99` for all admin gates
- localStorage-backed persistence with backup
- View routing system (type View) inside App.tsx

## Requested Changes (Diff)

### Add
- **💎 Premium Tournament card** on Home dashboard — gold-themed, locked by default
- **PremiumTournament.tsx** — self-contained component handling:
  - Locked state: payment info (EasyPaisa/JazzCash 03418890677 Shahzad Sultan), screenshot upload, "Waiting for Admin Approval" state
  - Code unlock input (admin-generated codes only, no auto-generation)
  - Code limit: 1 code = 1 tournament (ccb_user_tournament_created flag)
  - Premium tournament creation: name, teams (pick from existing default+my teams), auto fixed schedule
  - Full scoring, edit/delete matches, PNG/PDF/share export
  - Multi-user isolation: `ccb_premium_data = { [userCode]: { teams, matches, schedule } }`
  - "📡 Copy Live Link" button on match and scorecard screens
  - Branding footer in scorecard: "CCB Scoring Pro | Contact: 03418890677 | Managed by Shahzad Sultan"
- **Admin code management panel** (inside admin mode, password-gated): view active codes, generate new code (manual entry), revoke codes
- **Live Match Link page** (`/match/:matchId`) — public page polling `ccb_live_match_{matchId}` from localStorage every 2s, showing team names, score, overs, batsman, bowler, match status
- **matchId generation** in ScoringView: generate `match_<timestamp>_<random4>` and store in `ccb_live_match` data; also save per-matchId: `ccb_live_match_{matchId}`
- **"📡 Copy Live Link" button** in ScoringView and ResultView scorecard area

### Modify
- **HomeView** — add `onPremiumTournament` prop and corresponding Premium card in dashboard grid
- **HomeViewProps interface** — add `onPremiumTournament: () => void`
- **View type** — add `"premium-tournament"` to union
- **ScoringView** — generate matchId on mount, write to `ccb_live_match` including `matchId` field; also write `ccb_live_match_{matchId}` for public link; add Copy Live Link button
- **ResultView** — add Copy Live Link button below scorecard
- **Main app render** — add `{view === "premium-tournament"}` case; update HomeView call with `onPremiumTournament`
- **App.tsx URL routing** — on mount, check `window.location.pathname` for `/match/` prefix and render public live match page directly
- **LiveMatchData interface** — add `matchId?: string` field

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/components/PremiumTournament.tsx`
   - States: locked → payment-pending → code-entry → unlocked/tournament
   - localStorage keys: `ccb_user_code`, `ccb_premium_unlocked`, `ccb_user_tournament_created`, `ccb_premium_data`, `ccb_premium_codes` (admin), `ccb_backup_premium`
   - Premium tournament: add teams from pool of all teams, create fixed schedule (same 10-match pattern), score matches, export PNG/PDF with live link in footer
   - "📡 Copy Live Link" button: `window.location.origin + "/match/" + matchId`
   - Admin panel sub-view (password-gated): enter code manually to add it to valid codes list
2. Create `src/frontend/src/components/PublicLiveMatchPage.tsx`
   - Read `window.location.pathname` to extract matchId
   - Poll `ccb_live_match_{matchId}` every 2s
   - Show: teams, score, overs, batsman, bowler, status
   - No auth, fully public
3. Update `App.tsx`:
   - Add `matchId` field to LiveMatchData, generate on ScoringView mount
   - Save `ccb_live_match_{matchId}` alongside `ccb_live_match`
   - Add Copy Live Link button in ScoringView header and ResultView
   - Add `"premium-tournament"` to View type
   - Add `onPremiumTournament` to HomeViewProps
   - Add Premium card in HomeView dashboard
   - Add routing case in AnimatePresence block
   - On mount: if `window.location.pathname.startsWith("/match/")` → render PublicLiveMatchPage
