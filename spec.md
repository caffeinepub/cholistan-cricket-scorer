# Cholistan Cricket Scorer

## Current State
The dashboard home screen uses lucide-react SVG icons (Play, Users, Pencil, Trophy, Calendar, Bell, Wifi, MessageSquare) for 8 dashboard cards. The app logo in the header and splash screen uses `/assets/uploads/1773769089361-1.png`.

## Requested Changes (Diff)

### Add
- Nothing new — icon replacement only

### Modify
- Replace all 8 dashboard card icons with generated PNG images (neon glow, futuristic cricket style)
- Replace app logo in both header and splash screen with new HB logo
- PNG icons rendered as `<img>` tags with `w-14 h-14` size and `drop-shadow` glow filter

### Remove
- Lucide-react icon components from dashboard card renders (Play, Users, Pencil, Trophy, Calendar, Bell, Wifi, MessageSquare imports can stay but are no longer used in cards)

## Implementation Plan

### Icon Mapping (card → PNG path)
1. START MATCH → `/assets/generated/icon-start-match-transparent.dim_256x256.png`
2. TEAM DIRECTORY → `/assets/generated/icon-team-directory-transparent.dim_256x256.png`
3. EDIT TEAMS → `/assets/generated/icon-edit-teams-transparent.dim_256x256.png`
4. TOURNAMENT → `/assets/generated/icon-tournament-transparent.dim_256x256.png`
5. FIXED SCHEDULE → `/assets/generated/icon-schedule-transparent.dim_256x256.png`
6. ANNOUNCEMENTS → `/assets/generated/icon-scoreboard-transparent.dim_256x256.png`
7. LIVE MATCH → `/assets/generated/icon-live-match-transparent.dim_256x256.png`
8. POST & VOTE → `/assets/generated/icon-settings-transparent.dim_256x256.png`

### Logo
- Header img src → `/assets/generated/logo-hb-cricket-transparent.dim_512x512.png`
- Splash screen img src → `/assets/generated/logo-hb-cricket-transparent.dim_512x512.png`
- Keep existing sizing and glow filter styles

### Render Pattern
Replace each icon component like:
```tsx
<Play className="w-10 h-10 text-yellow-300" />
```
With:
```tsx
<img src="/assets/generated/icon-start-match-transparent.dim_256x256.png" alt="Start Match" className="w-14 h-14 object-contain" style={{ filter: 'drop-shadow(0 0 8px #00ff88)' }} />
```
