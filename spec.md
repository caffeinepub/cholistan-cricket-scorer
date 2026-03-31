# Cholistan Cricket Scorer

## Current State

A full-featured cricket scoring PWA (v74) with:
- `src/frontend/src/App.tsx` (~11,000 lines) — main app with all views
- `src/frontend/src/components/TournamentEngine.tsx` (~2,544 lines) — tournament pool/schedule/bracket system
- HomeView with admin login, cards, install PWA button
- SetupView for team/overs selection (teamA, teamB from dropdown, overs buttons)
- ScoringView for ball-by-ball scoring with editable batsman/bowler names
- `initInnings(batting, bowling)` hardcodes `batting.players[0]` and `batting.players[1]` as initial batsmen
- `handleStartMatch` goes directly from setup → scoring with no player selection step
- `handleStart2nd` goes directly innings-switch → scoring with no player selection step
- TournamentEngine receives only `teams` (20 default teams) — no `myTeams`
- Schedule edit mode has ↑↓ move, ⇄ swap, 🕐 time buttons — but NO delete or add match
- Match 10 schedule is correct `[1,3]` (Team2 vs Team4) but display fails when teams are My Teams (not in `teams` array)
- No Copy Link button on Home
- No combined Default+My Teams in tournament pool assignment

## Requested Changes (Diff)

### Add
- **PlayerSelectionView** (new screen/step between setup and scoring): after selecting teams & overs, show a "Select Players" screen where:
  - Striker: `<select>` from batting team's player list + inline edit text button
  - Non-Striker: `<select>` from batting team's player list + inline edit text button  
  - Bowler: `<select>` from bowling team's player list + inline edit text button
  - If batting team has 0 players → show text input directly (fallback)
  - If bowling team has 0 players → show text input directly (fallback)
  - Both select-from-list and edit/type manually available simultaneously
  - "Start Match" button proceeds to scoring with selected players
- **Copy Link button** in HomeView hero section: `navigator.clipboard.writeText(window.location.href)`, shows "Copied!" toast for 2 seconds
- **Delete Match button** (🗑) per match in TournamentEngine edit schedule mode (admin only), removes match from `poolMatches`
- **+ Add Match button** in TournamentEngine edit schedule mode (admin only), opens a modal to pick Home Team + Away Team from both Default Teams and My Teams (shown as separate `<optgroup>` sections)
- **myTeams prop** to TournamentEngine so it can reference user-created team names/IDs

### Modify
- `handleStartMatch(teamA, teamB, overs)` in App.tsx: instead of calling `initInnings` directly and going to "scoring", store teamA/teamB/overs in state and go to new "player-selection" view
- `handleStart2nd()` in App.tsx: instead of calling `initInnings` directly and going to "scoring", go to new "player-selection-2nd" view (same PlayerSelectionView but for 2nd innings)
- `initInnings` to accept optional striker/nonStriker/bowler initial values instead of hardcoding `players[0]` and `players[1]`
- TournamentEngine `teams` lookup for match display: use `allTeams = [...teams, ...(myTeams ?? [])]` so My Teams don't show as undefined
- TournamentEngine pool assignment (Setup tab): show both Default Teams and My Teams in team picker dropdowns (separate sections)
- TournamentEngine `TournamentEngineProps`: add optional `myTeams?: { id: string; name: string; players: any[] }[]`
- App.tsx render of `<TournamentEngine>`: pass `myTeams={myTeams}` prop
- UI Polish: improve card padding/gap, larger button min-heights (48px+), add subtle glow on active/hover states, smooth framer-motion transitions where absent

### Remove
- Nothing removed

## Implementation Plan

1. **App.tsx — new player-selection view type**: add `"player-selection"` and `"player-selection-2nd"` to the `View` union type
2. **App.tsx — state for pending match**: add state `pendingMatchSetup: { teamA: Team; teamB: Team; overs: number } | null`
3. **App.tsx — handleStartMatch**: set `pendingMatchSetup` + go to `"player-selection"` instead of calling `initInnings`
4. **App.tsx — handleStart2nd**: go to `"player-selection-2nd"` instead of calling `initInnings`
5. **App.tsx — PlayerSelectionView component** (~100 lines): props `{ battingTeam, bowlingTeam, inningsNum, onBack, onStart(strikerName, nonStrikerName, bowlerName) }`. For each of the 3 roles: if team has ≥1 player, show `<select>` with player names + a toggle to switch to text input. If team has 0 players, show text input directly. Submit calls `onStart`.
6. **App.tsx — handlePlayerSelectionStart**: called by PlayerSelectionView onStart. Creates custom Players from the names selected, calls `initInnings` with those players, goes to scoring.
7. **App.tsx — initInnings**: accept optional `initialStriker?: string` and `initialNonStriker?: string` and `initialBowler?: string` params; use them if provided, fall back to `players[0]`/`players[1]`
8. **App.tsx — HomeView**: add Copy Link button in the hero action buttons row. Use `navigator.clipboard.writeText(window.location.href)` with 2s "Copied!" state.
9. **TournamentEngine.tsx — props**: add `myTeams?: { id: string; name: string; players: any[] }[]` to `TournamentEngineProps`
10. **TournamentEngine.tsx — allTeams**: replace `const allTeams = teams` with `const allTeams = [...teams, ...(myTeams ?? [])]`
11. **TournamentEngine.tsx — deleteMatch**: add `function deleteMatch(matchId)` that removes from `poolMatches`, marks neighbors as isManual
12. **TournamentEngine.tsx — addMatch modal**: add state `showAddMatchModal`, form with homeTeamId/awayTeamId selects (both optgroups: Default Teams + My Teams). On submit, push a new `TPoolMatch` with `isManual: true` and next matchNumber.
13. **TournamentEngine.tsx — edit controls UI**: add 🗑 Delete and + Add Match buttons alongside existing ↑↓ ⇄ 🕐 controls
14. **TournamentEngine.tsx — Match 10 null fix**: all team name lookups now use `allTeams` not `teams`, preventing undefined display
15. **Data safety**: all existing save/backup patterns unchanged; new player selection names persist through initInnings state
