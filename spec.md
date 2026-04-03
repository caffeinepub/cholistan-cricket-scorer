# CCB Scoring Pro — Fixed Schedule Admin Edit Controls

## Current State
- TournamentEngine has `editScheduleMode` state but it only changes drag cursor style — it does NOT gate the edit buttons
- Edit controls (↑Up, ↓Down, ⇄Swap, 🕐Time, 🗑Delete) are always visible when `adminUnlocked` is true
- No `✏️ Edit Match` button to change teams in an existing match
- `+ Add Match` button exists and works
- `isManual=true` flag is set correctly on moveMatch, swapMatchTeams, saveMatchTime, deleteMatch, saveScore
- Match 10 = `[1,3]` in FIXED_5_TEAM_SCHEDULE = Team2 vs Team4 ✓ (correct mapping), but null/undefined team names possible if team lookup fails

## Requested Changes (Diff)

### Add
- `✏️ Edit Match` button per match card (admin + editScheduleMode) — opens dialog to change homeTeamId, awayTeamId, date, time; sets isManual=true
- `editMatchDialog` state for the edit-match dialog (matchId, homeTeamId, awayTeamId, matchTime, matchDate)
- Guard on all edit controls: only show when `editScheduleMode === true` (in addition to `adminUnlocked`)
- Match 10 null guard: fall back to matchId string if team not found, never render undefined

### Modify
- Existing edit controls (↑Up, ↓Down, ⇄Swap, 🕐Time, 🗑Delete) — wrap in `editScheduleMode &&` condition so they only appear when Edit Mode is ON
- `✏️ Edit Schedule` button remains as the toggle
- All edit actions continue to set `isManual=true` and the auto-schedule regeneration already skips `isManual` matches

### Remove
- Nothing removed

## Implementation Plan
1. Add `editMatchDialog` state (matchId, homeTeamId, awayTeamId, matchTime, matchDate, poolId)
2. Add `editMatch()` function that updates homeTeamId/awayTeamId/time/date and sets isManual=true
3. Wrap existing per-match edit buttons in `editScheduleMode &&` condition
4. Add ✏️ Edit Match button inside the editScheduleMode block
5. Add Edit Match dialog JSX at bottom of component (similar to Add Match dialog)
6. Fix null team name: use `team?.name ?? 'Team ' + (idx+1)` fallback in match display
7. Match 10: verify FIXED_5_TEAM_SCHEDULE[9] = [1,3] is correct and add safety fallback
