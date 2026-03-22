# CCB SCORING PRO

## Current State
Full-featured cricket scoring web app (React + TypeScript) with:
- Dashboard grid of icon cards (Start Match, Team Directory, Edit Teams, Tournament, Live Match, Fixed Schedule, Announcements, Match Prediction, Match Info Cards)
- Bottom navigation bar (Home, Teams, Matches, Community)
- Live ball-by-ball scoring with bowler popup, Auto button, editable names
- Tournament system with pools, round-robin scheduling, leaderboard
- Community tab with announcements (text + image upload) and Match Prediction voting
- PDF/PNG save and WhatsApp share on result screen and Match Info Cards
- Admin controls via lock icon + password `Shahzad@99`
- PWA manifest, splash screen, HB logo, neon cricket icons
- All data in localStorage

## Requested Changes (Diff)

### Add
- Login screen (name + phone number) shown on first open; stored in localStorage; remembered on subsequent visits
- 20 specific predefined default teams (see list below)
- "My Teams" section for user-created teams (tied to user's phone number in localStorage)
- Create Team flow: team name (required) + optional logo upload from gallery
- Player management inside each team: add/edit/delete players with name + role (Batsman/Bowler/All-Rounder)
- Match team selection showing two groups: "Default Teams" and "My Teams"
- Onboarding steps on Home screen (Step 1: Create Team, Step 2: Add Players, Step 3: Start Match)

### Modify
- Default teams list replaced with exact 20 teams:
  1. 118 DNB, 2. 122 DNB, 3. 7 DRB, 4. 14 DRB, 5. 10 DRB,
  6. 18 DRB, 7. 120 DNB, 8. 4 DRB, 9. 19 DRB, 10. 5 DRB,
  11. 9 DRB, 12. 121 DNB, 13. 120 DNB, 14. 142 DRB, 15. 119 DNB,
  16. 20 DRB, 17. 8 DRB, 18. 130 DNB, 19. 94 DB, 20. 92 DB
- Teams Tab: split into "Default Teams" section and "My Teams" section
- Start Match team picker: grouped dropdown/list showing Default Teams first, then My Teams
- Home screen: login-aware (show logged-in user's name in header)

### Remove
- Any teams beyond the 20 listed above from the default list
- Any hardcoded 24-team references

## Implementation Plan
1. Add LoginScreen component -- shown if no user in localStorage; collects name + phone, stores as `ccb_user`
2. Create `DEFAULT_TEAMS` constant with exactly the 20 teams listed
3. Add `myTeams` state in localStorage keyed by phone number (`ccb_myteams_{phone}`)
4. Add CreateTeam modal/flow with team name input and logo upload (FileReader for base64 preview)
5. Add player management inside each team card (add/edit/delete, name + role selector)
6. Update Teams Tab to show two sections: Default Teams (read-only, expandable) and My Teams (editable)
7. Update StartMatch team picker to show grouped options
8. Add onboarding steps to Home screen hero section
9. Show logged-in user's name in app header with logout option
10. Preserve all existing features untouched (scoring, tournament, announcements, voting, PDF/PNG, admin)
