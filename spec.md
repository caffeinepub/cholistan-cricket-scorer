# Cholistan Cricket Scorer — Production Stabilization

## Current State

- App is CCB SCORING PRO v81, a full-stack PWA cricket scoring + tournament management app in React/TypeScript
- Main files: `src/frontend/src/App.tsx` (~12,229 lines), `src/frontend/src/components/TournamentEngine.tsx` (~3,252 lines)
- localStorage keys in use: `ccb_teams`, `ccb_players`, `ccb_past_matches`, `ccb_rules`, `ccb_user`, `ccb_myteams_{phone}`, `ccb_fixed_schedule_v2`, `ccb_fixed_schedule_team_order`, `ccb_tournament_v2`, `ccb_tournament`, `ccb_pools`, `ccb_schedule`, `ccb_matches`, `ccb_backup`, `ccb_player_stats`, `ccb_live_match`, `ccb_all_tournaments`
- `saveTeams()` exists and writes both `ccb_teams` and `ccb_players` on player add/edit/delete ✅
- `smartBackup()` exists and snapshots all `ccb_*` keys ✅ BUT is only called on limited paths (not on scoring events like over complete, wicket)
- Service worker `sw.js` exists in `/public/` but is NOT registered in `index.html` or `main.tsx` ❌
- `TournamentEngine.tsx` writes `ccb_schedule` via `useEffect` on every `data` change ✅
- Fixed Schedule uses `ccb_fixed_schedule_v2` storage key (separate from `ccb_schedule`) — writes backup correctly ✅
- `tournamentId` exists in TournamentEngine data but match records saved by App.tsx do NOT carry `tournamentId` — potential cross-tournament data mixing
- Scoring view in App.tsx: `smartBackup()` is called on player selection confirm (match start) ✅ but NOT on over complete or wicket events
- No `useCallback`/`useMemo` wrappers on ScoreBtn handler — acceptable since ScoreBtn already uses its own `useCallback` internally

## Requested Changes (Diff)

### Add
- Service worker registration in `index.html` (inline script, before React loads): `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`
- `currentTournamentId` state in App.tsx; attach it to all match records saved to `ccb_past_matches`
- Backup trigger after every over complete (end of 6 balls in scoring) and every wicket event
- `ccb_schedule` sync in `saveFixedSchedule()` function (already saves to `ccb_fixed_schedule_v2` but should also mirror to `ccb_schedule` for compatibility)

### Modify
- `index.html`: add service worker registration script
- `App.tsx` - `handleInnings2End`: already calls `smartBackup()` before saving past matches — verify and ensure it's there; add `tournamentId` field to the `MatchRecord` type and record
- `App.tsx` - `ScoringView` (or scoring section): add `smartBackup()` call when an over completes (ball % 6 === 0 after applying legal delivery) and when a wicket is applied
- `App.tsx` - `saveTeams()`: already correct, confirm `ccb_players` is always written as `{teamId: [names]}` format after every player mutation
- `App.tsx` - teams `useState` initializer: confirm existing `ccb_players` merge logic never overwrites non-empty player data — add guard: only merge if base team has 0 players for that team
- `saveFixedSchedule()` in App.tsx: also write `localStorage.setItem("ccb_schedule", JSON.stringify(matches))` for cross-compatibility
- `manifest.json` `start_url`: confirm it is already "/" ✅ (already correct per review)

### Remove
- Nothing — no features or UI to remove

## Implementation Plan

1. **`index.html`** — Add inline SW registration script just before `</body>`: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(function(){}) }`. This is the minimal fix for PWA install prompt.

2. **`App.tsx` — MatchRecord type**: Add optional `tournamentId?: string` field to the `MatchRecord` interface.

3. **`App.tsx` — `currentTournamentId` state**: Add `const [currentTournamentId, setCurrentTournamentId] = useState<string>('main_event')`. Expose it to `TournamentEngine` so when user selects a tournament, App knows the active one. When saving a match record in `handleInnings2End`, attach `tournamentId: currentTournamentId` to the record.

4. **`App.tsx` — `handleInnings2End`**: Confirm `smartBackup()` call exists (it does). Add `tournamentId` to record. Ensure `localStorage.setItem("ccb_past_matches", ...)` writes the full updated array.

5. **`App.tsx` — Scoring backup triggers**: In the scoring logic (wherever `applyLegal`, `applyWicket`, `applyExtra` results are applied to state), add:
   - After applying a wicket: call `smartBackup()`
   - After an over completes (when `newBalls % 6 === 0` in the legal delivery handler): call `smartBackup()`
   - These calls are debounced by nature (only happen every 6 balls or on wicket) — no performance impact.

6. **`App.tsx` — `saveFixedSchedule()`**: After writing `ccb_fixed_schedule_v2`, also write `localStorage.setItem("ccb_schedule", JSON.stringify(matches))` so any system reading the legacy `ccb_schedule` key gets the latest fixed schedule data.

7. **`App.tsx` — `saveTeams()` guard**: Ensure the `ccb_players` key is written as `{teamId: [playerName, ...]}` for all teams (default + my teams). Already done, just validate no edge case where an empty array could overwrite existing data.

8. **`App.tsx` — teams init guard**: In the `useState(() => ...)` initializer for `teams`, when merging from `ccb_players`, only add new players from `ccb_players` if they don't already exist in the loaded `ccb_teams` data (already done via `existingNames` Set — confirm this is correct).

9. **`TournamentEngine.tsx` — tournamentId filter**: TournamentEngine already isolates data per tournament ID using dynamic keys (`ccb_tournament_{id}`). Confirm the `syncMatchToTournament` function only syncs matches whose `tournamentId` matches the current tournament, or has no `tournamentId` (backward compat). Add guard if missing.

10. No UI changes, no new screens, no design changes.
