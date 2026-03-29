# Cholistan Cricket Scorer

## Current State
TournamentEngine.tsx (2310 lines) already has:
- FIXED_5_TEAM_SCHEDULE array (correct 10-match pattern)
- generateFixedSchedule() uses poolTeamOrder
- moveTeamInPool() with ↑↓ in setup tab (only shows AFTER tournament is generated)
- calcStandings() sorts by points then NRR — missing admin-order tie-breaker
- No manual ranking in points table
- Pool generation is auto-distributed (generatePools() divides teams evenly)
- Data saves to STORAGE_KEY on state change via useEffect

## Requested Changes (Diff)

### Add
- Manual pool assignment UI in Setup tab: 4 fixed pool panels (A/B/C/D) shown BEFORE generating tournament. Each panel shows assigned teams with 1-5 numbering. Admin adds/removes teams from each pool. Teams not yet assigned shown in "Available" list.
- `manualPoolRankings` field in EngineData: `Record<string, string[]>` — stores admin-overridden ranking order per pool (keyed by poolId)
- Move Up / Move Down buttons in Points Table rows (admin only) — adjusts `manualPoolRankings`, overriding auto-calculated order
- Visual badge on manually ranked rows: "Manual" indicator

### Modify
- `calcStandings(pool, matches, teams, manualOrder?)`: add third sort key after points+NRR → fall back to pool.poolTeamOrder index (admin-defined position) when points AND NRR are equal
- `createTournament()`: use manually assigned pool teams (from new pool assignment UI state) instead of generatePools() auto-distribution
- Points table display: if `manualPoolRankings[pool.id]` exists, render in that order instead of auto-calculated order; show Move Up/Down buttons for admin
- Data save: ensure ccb_backup is written BEFORE overwriting STORAGE_KEY on every save
- On load error: restore from ccb_backup automatically
- generateFixedSchedule: enforce that poolTeamOrder is always exactly 5 entries; if pool has <5 or >5 teams, still generate correctly

### Remove
- Auto pool distribution logic from `createTournament()` (replace with manual assignment)
- `generatePools()` function (no longer needed since pools are always fixed A/B/C/D)

## Implementation Plan
1. Add `manualPoolRankings: Record<string, string[]>` to EngineData type and EMPTY_ENGINE
2. Add pool assignment state: `poolAssignments: Record<string, string[]>` as local React state (4 pools: pool_A, pool_B, pool_C, pool_D)
3. In Setup tab: show 4 pool panels BEFORE the Generate button. Each panel has numbered team list (1-5) with ↑↓ buttons to reorder, and an "Add Team" button showing unassigned teams. Teams already assigned to a pool can't be added to another.
4. Update `createTournament()` to build pools from poolAssignments state, skipping generatePools()
5. Initialize `poolAssignments` from `data.pools` if tournament already exists (so reload works)
6. Fix `calcStandings` sort: `b.points - a.points || b.nrr - a.nrr || pool.poolTeamOrder.indexOf(a.teamId) - pool.poolTeamOrder.indexOf(b.teamId)`
7. In Points Table tab: if `adminUnlocked && data.manualPoolRankings[pool.id]`, render standings in manual order. Add ⬆/⬇ buttons per row. On click: update `manualPoolRankings[pool.id]`, save.
8. If `manualPoolRankings[pool.id]` is set, use that order for display AND for getTop2() qualification. Auto-sort still happens but manual order overrides final display.
9. Fix save useEffect: write `ccb_backup` FIRST then STORAGE_KEY
10. Fix load: if STORAGE_KEY parse fails, try ccb_backup before returning EMPTY_ENGINE
