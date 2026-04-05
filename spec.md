# Cholistan Cricket Scorer — Premium Tournament System Complete Upgrade

## Current State

- App has `PremiumTournament.tsx` (v83) with basic locked/unlocked states, code unlock, screenshot upload, simple schedule with score entry dialog
- `PublicLiveMatchPage.tsx` exists — reads `ccb_live_match_{matchId}` from localStorage, auto-refreshes every 2s, shows score/batsman/bowler/status
- Live match data is written during scoring in `App.tsx`'s `ScoringView` effect
- Admin panel in PremiumTournament allows adding/removing unlock codes stored in `ccb_premium_codes`
- Home screen already has 💎 Premium Tournament card with gold glow
- Routing: `/match/{matchId}` → `PublicLiveMatchPage`
- Code limit: 1 code = 1 tournament enforced via `ccb_user_tournament_created`
- Multi-user data isolated via `ccb_premium_data[code]`
- Missing: full ball-by-ball scoring inside premium, PNG/PDF export, proper share with live link, branding footer on scorecard, fail-safe systems, score entry only via simple dialog (not full scoring)

## Requested Changes (Diff)

### Add
- Full ball-by-ball scoring system inside premium tournament matches (launch from schedule, full scorer UI)
- PNG download from premium scorecard using html-to-image with `ccb_premium_scorecard` element
- PDF download converting PNG to jsPDF
- Share scorecard function appending live match URL to shared content
- Fail-safe: auto-generate matchId if missing, block premium if userCode missing, restore backup if data corrupt
- Branding footer on PremiumTournament scorecard: "CCB Scoring Pro\nContact: 03418890677\nManaged by Shahzad Sultan"
- Auto-refresh every 3-5 seconds on PublicLiveMatchPage (currently 2s — upgrade to 3s)
- Gold glow animation on premium badge
- Better spacing, bigger buttons, smooth transitions
- `ccb_backup_premium` backup triggered after every action
- Fail-safe on load: if `ccb_premium_data` parse fails, restore from `ccb_backup_premium`
- If matchId missing on existing match, auto-generate one

### Modify
- `PremiumTournament.tsx`: Replace simple "Enter Score" dialog with a proper inline scoring entry that saves to `ccb_live_match_{matchId}` so the PublicLiveMatchPage shows live data
- `PremiumTournament.tsx`: Add PNG/PDF export buttons on completed match scorecard
- `PremiumTournament.tsx`: Improve all UI — gold glow badge, better card spacing, bigger tap targets, glow animation on premium button
- `PublicLiveMatchPage.tsx`: Update refresh interval to 3s, add branding footer with correct text
- Scorecard data written to `ccb_live_match_{matchId}` when admin enters score for premium match

### Remove
- Nothing removed

## Implementation Plan

1. Upgrade `PremiumTournament.tsx`:
   - Add matchId fail-safe: on data load, any match missing `matchId` gets one auto-generated
   - Add userCode fail-safe: if `ccb_user_code` not found when component mounts in unlocked state, reset to locked
   - Add data corruption fail-safe: wrap all localStorage reads in try/catch, restore from `ccb_backup_premium`
   - Every `saveData()` call also writes to `ccb_backup_premium`
   - Add `+` Add Match button always visible in schedule tab (admin only)
   - Add PNG export: `toPng(document.getElementById('premium-scorecard-{matchId}'))` with Blob download
   - Add PDF export: png → jsPDF
   - Add Share: `navigator.share({ text, files })` with live link appended
   - UI polish: larger buttons (min 44px height), gold glow pulse on 💎 badge, smooth card animations
   - Add branding div inside each match scorecard render

2. Update `PublicLiveMatchPage.tsx`:
   - Change setInterval from 2000 to 3000
   - Update footer text to match branding spec exactly

3. No changes to App.tsx needed — routing and premium integration are already correct
