# Cholistan Cricket Scorer

## Current State
The app has a Tournament section with pool/group management (Pool A-D) and team assignments. Admin can edit teams and pools with password protection.

## Requested Changes (Diff)

### Add
- Tournament Pool Match creation: Admin can create matches under Pool A/B/C/D by selecting two teams, entering a date/time, and setting a Status (Upcoming/Live/Completed)
- Each match card in a pool shows: Team A vs Team B, Date, Time, Status badge
- Admin can delete matches from pools (password protected)

### Modify
- Tournament screen: Pools section now shows both team standings AND scheduled matches per pool
- Pools displayed as tabs or expandable sections (A, B, C, D), each showing matches list with dates

### Remove
- Nothing removed

## Implementation Plan
1. Add PoolMatch type: { id, poolId, teamA, teamB, date, time, status }
2. Add poolMatches state array in Tournament section
3. Add 'Add Match' button per pool (admin only, password protected)
4. Add match creation dialog: pool selector, team A, team B (from 24-team list), date picker, time input, status dropdown
5. Render match cards per pool with date, time, status badge color-coded
6. Add delete button on each match card (admin only)
