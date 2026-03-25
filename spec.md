# Cholistan Cricket Scorer — Final Production Upgrade

## Current State
- React PWA with 9199-line App.tsx, all features in one file
- localStorage-only persistence (no cross-device sync in main app data)
- Backend (Motoko) only handles announcements/media
- Service worker exists in public/ but is NOT registered in main.tsx
- Bulk player paste: NOT implemented
- Analytics dashboard: NOT implemented
- PNG save uses html-to-image (may have issues on Android Chrome)

## Requested Changes (Diff)

### Add
- Backend: registerUser(phone, name), getUserCount(), syncTeams(phone, teamsJSON), getTeams(phone), syncMatches(phone, matchesJSON), getMatches(phone), getAnalytics() → {userCount, teamCount, matchCount}
- Frontend: Service worker registration in main.tsx
- Frontend: Bulk player paste textarea (in MyTeamsManager add-player section) — each line = one player added to team
- Frontend: Analytics dashboard (admin-only card on Home, shows: Total Users, Total Teams, Total Matches, Activity)
- Frontend: Backend sync hooks — on login: pull teams/matches from canister; on save: push to canister in background; fallback to localStorage silently

### Modify
- Backend main.mo: Add user/team/match storage alongside existing announcements
- Frontend main.tsx: Add navigator.serviceWorker.register('/sw.js') call
- Frontend App.tsx: Wire backend sync in handleAddPlayer/handleMyTeams save + login flow; add analytics view; add bulk paste dialog

### Remove
- Nothing removed

## Implementation Plan
1. Expand Motoko backend with user registration, team sync, match sync, analytics queries
2. Update main.tsx to register service worker
3. Add bulk player paste: textarea dialog in TeamsTabView for My Teams section
4. Add analytics dashboard: new admin-only card + view showing 4 stat cards
5. Wire ICP backend sync: after login pull data, on changes push to backend (fire-and-forget, localStorage remains primary)
6. Fix PNG save: ensure html-to-image is called with correct options for Android Chrome (scale, backgroundColor, filter)
