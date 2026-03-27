# CCB SCORING PRO — Full Auto Tournament Engine

## Current State
The app has an existing `TournamentView` inside App.tsx (~700 lines) that supports:
- Manual pool creation (up to 4 pools)
- Manual team assignment to pools
- Manual round-robin match generation per pool
- Score entry by admin
- Points table / standings tab
Data saved to `ccb_tournament` in localStorage.

The home dashboard has a 🏆 Tournament card that navigates to view="tournament" which renders the old TournamentView.

## Requested Changes (Diff)

### Add
- `TournamentEngine.tsx` — new standalone component with full auto-tournament logic
- New localStorage key `ccb_tournament_v2` for engine data (preserves old `ccb_tournament`)
- Auto pool generation (20 teams → 4 pools ×5, 16 → 4×4, 8 → 2×4)
- Auto round-robin schedule within each pool
- Pool match tags: "Pool A Match", "Pool B Match", etc.
- Night Match toggle per match (shows 🌙 label, signals 5 overs when starting)
- Points Table (Win=2, Loss=0, NRR) — public, auto-updated from completed matches
- Qualification: top 2 per pool qualify
- Auto Knockout bracket: QF cross-pool seeding (A1 vs C2, A2 vs C1, B1 vs D2, B2 vs D1)
- Semi Finals: QF1W vs QF2W, QF3W vs QF4W
- Final: SF1W vs SF2W
- Visual bracket screen (QF / SF / Final)
- Tournament Status Bar: Pool Stage → Knockout → Final
- Match tags: Pool Match / Quarter Final / Semi Final / Final
- Admin Override: admin can manually set winner/score for any match (requires Shahzad@99)
- Safe Edit: edited matches flagged as `isManual=true`, rest of system unaffected
- Match Linking: pool matches & knockout matches store `linkedMatchId` referencing a `MatchRecord.id`
- Auto-sync: when a match completes in scoring system, tournament engine auto-updates the corresponding tournament match if teams match
- `onStartMatch` callback: starts a match from tournament with pre-selected teams and correct overs
- `pendingTournamentMatchId` state in App.tsx to link scoring match back to tournament

### Modify
- App.tsx: replace `<TournamentView>` block with `<TournamentEngine>` for view="tournament"
- App.tsx: add `tournamentV2` state (loaded from `ccb_tournament_v2`)
- App.tsx: in `handleInnings2End`, auto-sync completed match to tournament engine
- App.tsx: add `onStartMatch` handler that pre-selects teams and overs in setup view

### Remove
- Nothing removed. Old `TournamentView` function remains in App.tsx (unused but not deleted for safety)

## Implementation Plan
1. Create `src/frontend/src/components/TournamentEngine.tsx`
   - Types: TPoolMatch, KnockoutMatch, EngineData
   - Utils: generatePools, generateRoundRobin, calcStandings, generateKnockout, autoProgressKnockout
   - 5 tabs: Setup, Pool Matches, Points Table, Qualified, Bracket
   - Load from / save to `ccb_tournament_v2`
   - `useEffect` on `completedMatches` for auto-sync
   - Admin password gate for result entry and overrides

2. Patch App.tsx (minimal changes):
   - Import TournamentEngine
   - Add `tournamentV2` useState (loaded from ccb_tournament_v2)
   - Add `pendingTournamentMatchId` useRef
   - Add `handleUpdateTournamentV2` save function
   - Modify `handleInnings2End` to call `autoSyncTournamentMatch(record)`
   - Add `handleTournamentStartMatch` handler
   - Replace the `{view === 'tournament' && <TournamentView ...>}` block
