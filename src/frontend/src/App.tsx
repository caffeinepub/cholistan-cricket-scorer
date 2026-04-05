import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// html-to-image loaded dynamically
// jsPDF loaded dynamically from CDN
import {
  ArrowLeft,
  Bell,
  Calendar,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Download,
  History,
  Home,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  Shield,
  Trash2,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useState } from "react";
import { AdminLoginModal } from "./components/AdminLoginModal";
import AnnouncementSection from "./components/AnnouncementSection";
import { RulesPage } from "./components/RulesPage";
import ScoreBoardTemplate from "./components/ScoreBoardTemplate";
import {
  TournamentEngine,
  syncMatchToTournament,
} from "./components/TournamentEngine";
import { useActor } from "./hooks/useActor";
import { useAdminSession } from "./hooks/useAdminSession";

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  role?: "batsman" | "bowler" | "allrounder";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
}

type WicketType = "Caught" | "Bowled" | "Run Out";
type View =
  | "home"
  | "teams"
  | "setup"
  | "player-selection"
  | "scoring"
  | "innings-switch"
  | "result"
  | "tournament"
  | "match-info"
  | "fixed-schedule"
  | "announcements"
  | "live-match"
  | "post-vote"
  | "matches-tab"
  | "community-tab"
  | "teams-tab"
  | "scoreboard"
  | "rules"
  | "analytics"
  | "player-leaderboard";

interface BatsmanState {
  player: Player;
  runs: number;
  balls: number;
  isStriker: boolean;
  isOut: boolean;
  wicketType?: WicketType;
}

interface BowlerRecord {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
}
// ──────────────────────────────────────────────────────────────
// TOURNAMENT TYPES
// ──────────────────────────────────────────────────────────────

interface PoolMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeRuns?: number;
  awayRuns?: number;
  homeBalls?: number;
  awayBalls?: number;
  totalOvers: number;
  status: "scheduled" | "completed" | "tied";
  note?: string;
  date?: string;
  time?: string;
}

interface TournamentPool {
  id: string;
  name: string;
  teamIds: string[];
}

interface Tournament {
  id: string;
  name: string;
  pools: TournamentPool[];
  matches: PoolMatch[];
  createdAt: string;
}

const EMPTY_TOURNAMENT: Tournament = {
  id: "1",
  name: "CCB Tournament",
  pools: [],
  matches: [],
  createdAt: "",
};

// ──────────────────────────────────────────────────────────────
// MATCH INFO CARD TYPES
// ──────────────────────────────────────────────────────────────

interface MatchInfoCard {
  id: string;
  tournamentName: string;
  matchTitle: string;
  coverPhoto: string | null;
  matchSummary: string;
  topPerformer: string;
  location: string;
  status: "Upcoming" | "Live" | "Completed";
  date: string;
}

interface InningsState {
  battingTeam: Team;
  bowlingTeam: Team;
  totalRuns: number;
  wickets: number;
  balls: number;
  activeBatsmen: BatsmanState[];
  outBatsmen: BatsmanState[];
  nextBatsmanIndex: number;
  isComplete: boolean;
  bowlers: BowlerRecord[];
}

interface MatchRecord {
  id: string;
  date: string;
  time?: string;
  teamA: Team;
  teamB: Team;
  totalOvers: number;
  innings1: InningsState;
  innings2?: InningsState;
  resultText?: string;
  manOfTheMatch?: {
    name: string;
    teamName: string;
    runs: number;
    wickets: number;
    photo?: string;
  };
}

interface PlayerStats {
  key: string;
  name: string;
  teamName: string;
  totalRuns: number;
  totalWickets: number;
  matchesPlayed: number;
}

interface WicketDialog {
  open: boolean;
  step: "type" | "batsman";
  wicketType?: WicketType;
}

// ──────────────────────────────────────────────────────────────
// DEFAULT TEAMS (20 fixed)
// ──────────────────────────────────────────────────────────────

interface MyTeam {
  id: string;
  name: string;
  logo?: string; // base64
  players: Player[];
}

interface CcbUser {
  name: string;
  phone: string;
}

const DEFAULT_TEAMS: Team[] = [
  { id: "dt1", name: "118 DNB", players: [] },
  { id: "dt2", name: "122 DNB", players: [] },
  { id: "dt3", name: "7 DRB", players: [] },
  { id: "dt4", name: "14 DRB", players: [] },
  { id: "dt5", name: "10 DRB", players: [] },
  { id: "dt6", name: "18 DRB", players: [] },
  { id: "dt7", name: "120 DNB", players: [] },
  { id: "dt8", name: "4 DRB", players: [] },
  { id: "dt9", name: "19 DRB", players: [] },
  { id: "dt10", name: "5 DRB", players: [] },
  { id: "dt11", name: "9 DRB", players: [] },
  { id: "dt12", name: "121 DNB", players: [] },
  { id: "dt13", name: "120 DNB (B)", players: [] },
  { id: "dt14", name: "142 DRB", players: [] },
  { id: "dt15", name: "119 DNB", players: [] },
  { id: "dt16", name: "20 DRB", players: [] },
  { id: "dt17", name: "8 DRB", players: [] },
  { id: "dt18", name: "130 DNB", players: [] },
  { id: "dt19", name: "94 DB", players: [] },
  { id: "dt20", name: "92 DB", players: [] },
];

// Keep legacy TEAMS for backwards compat (tournament etc)
const TEAMS: Team[] = DEFAULT_TEAMS;
// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function initInnings(batting: Team, bowling: Team): InningsState {
  const p0: Player = batting.players[0] ?? {
    id: "p_placeholder_0",
    name: "Batsman 1",
  };
  const p1: Player = batting.players[1] ?? {
    id: "p_placeholder_1",
    name: "Batsman 2",
  };
  return {
    battingTeam: batting,
    bowlingTeam: bowling,
    totalRuns: 0,
    wickets: 0,
    balls: 0,
    activeBatsmen: [
      {
        player: p0,
        runs: 0,
        balls: 0,
        isStriker: true,
        isOut: false,
      },
      {
        player: p1,
        runs: 0,
        balls: 0,
        isStriker: false,
        isOut: false,
      },
    ],
    outBatsmen: [],
    nextBatsmanIndex: 2,
    isComplete: false,
    bowlers: [],
  };
}

function isInningsComplete(innings: InningsState, totalOvers: number): boolean {
  return innings.balls >= totalOvers * 6 || innings.wickets >= 10;
}

/** Update or add a bowler entry when runs are scored. countBall=true for legal deliveries. */
function updateBowlerRuns(
  bowlers: BowlerRecord[],
  name: string,
  runs: number,
  countBall: boolean,
): BowlerRecord[] {
  const existing = bowlers.find((b) => b.name === name);
  if (existing) {
    const newBalls = existing.balls + (countBall ? 1 : 0);
    return bowlers.map((b) =>
      b.name === name
        ? {
            ...b,
            runs: b.runs + runs,
            balls: newBalls,
            overs: Math.floor(newBalls / 6),
          }
        : b,
    );
  }
  const balls = countBall ? 1 : 0;
  return [...bowlers, { name, overs: 0, balls, runs, wickets: 0 }];
}

function updateBowlerWicket(
  bowlers: BowlerRecord[],
  name: string,
): BowlerRecord[] {
  return bowlers.map((b) =>
    b.name === name ? { ...b, wickets: b.wickets + 1 } : b,
  );
}

/** Apply a legal delivery (0–6 runs). Updates runs, balls, strike rotation. */
function applyLegal(
  innings: InningsState,
  runs: number,
  totalOvers: number,
  bowlerName: string,
): InningsState {
  const newBalls = innings.balls + 1;
  const endOfOver = newBalls % 6 === 0;
  const oddRuns = runs % 2 !== 0;
  // rotate if oddRuns XOR endOfOver
  const rotate = oddRuns !== endOfOver;

  const newActive = innings.activeBatsmen.map((b) => {
    if (b.isStriker) {
      return {
        ...b,
        runs: b.runs + runs,
        balls: b.balls + 1,
        isStriker: !rotate,
      };
    }
    return { ...b, isStriker: rotate };
  });

  // Update bowler stats
  const updatedBowlers = updateBowlerRuns(
    innings.bowlers,
    bowlerName,
    runs,
    true,
  );

  const next: InningsState = {
    ...innings,
    totalRuns: innings.totalRuns + runs,
    balls: newBalls,
    activeBatsmen: newActive,
    bowlers: updatedBowlers,
    isComplete: false,
  };
  next.isComplete = isInningsComplete(next, totalOvers);
  return next;
}

/** Apply wide or no-ball: add runs, do NOT count ball. */
function applyExtra(
  innings: InningsState,
  extraRuns: number,
  bowlerName: string,
): InningsState {
  const updatedBowlers = updateBowlerRuns(
    innings.bowlers,
    bowlerName,
    extraRuns,
    false,
  );
  return {
    ...innings,
    totalRuns: innings.totalRuns + extraRuns,
    bowlers: updatedBowlers,
  };
}

/** Apply wicket — must have already determined newBatsman (or null if last wicket). */
function applyWicket(
  innings: InningsState,
  wt: WicketType,
  newBatsman: Player | null,
  totalOvers: number,
  bowlerName: string,
): InningsState {
  const newBalls = innings.balls + 1;
  const endOfOver = newBalls % 6 === 0;

  const striker = innings.activeBatsmen.find((b) => b.isStriker)!;
  const nonStriker = innings.activeBatsmen.find((b) => !b.isStriker)!;
  const outRecord: BatsmanState = {
    ...striker,
    balls: striker.balls + 1,
    isOut: true,
    wicketType: wt,
  };

  let newActive: BatsmanState[] = [];
  if (newBatsman) {
    // New batsman comes in at striker end; if end-of-over, strike swaps
    const newBsm: BatsmanState = {
      player: newBatsman,
      runs: 0,
      balls: 0,
      isStriker: !endOfOver,
      isOut: false,
    };
    const ns = { ...nonStriker, isStriker: endOfOver };
    newActive = [newBsm, ns];
  }

  // Update bowler stats — wicket + 1 ball
  const updatedBowlers = updateBowlerWicket(
    updateBowlerRuns(innings.bowlers, bowlerName, 0, true),
    bowlerName,
  );

  const next: InningsState = {
    ...innings,
    balls: newBalls,
    wickets: innings.wickets + 1,
    activeBatsmen: newActive,
    outBatsmen: [...innings.outBatsmen, outRecord],
    nextBatsmanIndex: innings.nextBatsmanIndex + 1,
    bowlers: updatedBowlers,
    isComplete: false,
  };
  next.isComplete = isInningsComplete(next, totalOvers);
  return next;
}

function getAvailableBatsmen(innings: InningsState): Player[] {
  const used = new Set([
    ...innings.activeBatsmen.map((b) => b.player.id),
    ...innings.outBatsmen.map((b) => b.player.id),
  ]);
  return innings.battingTeam.players.filter((p) => !used.has(p.id));
}

function calcResult(i1: InningsState, i2: InningsState): string {
  if (i2.totalRuns > i1.totalRuns) {
    const w = 10 - i2.wickets;
    return `${i2.battingTeam.name} won by ${w} wicket${w !== 1 ? "s" : ""}`;
  }
  if (i2.totalRuns < i1.totalRuns) {
    const r = i1.totalRuns - i2.totalRuns;
    return `${i1.battingTeam.name} won by ${r} run${r !== 1 ? "s" : ""}`;
  }
  return "Match Tied!";
}

// ──────────────────────────────────────────────────────────────
// SCORE BUTTON
// ──────────────────────────────────────────────────────────────

interface ScoreBtnProps {
  label: string;
  sub?: string;
  colorClass: string;
  onClick: () => void;
  ocid: string;
  wide?: boolean;
  disabled?: boolean;
}

function ScoreBtn({
  label,
  sub,
  colorClass,
  onClick,
  ocid,
  wide,
  disabled,
}: ScoreBtnProps) {
  const [pop, setPop] = useState(false);
  const handle = useCallback(() => {
    if (disabled) return;
    setPop(true);
    setTimeout(() => setPop(false), 280);
    onClick();
  }, [onClick, disabled]);

  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={handle}
      disabled={disabled}
      className={[
        colorClass,
        wide ? "col-span-3 h-16" : "min-h-[76px]",
        pop ? "score-pop" : "",
        "w-full flex flex-col items-center justify-center rounded-xl",
        "font-bold text-black border-0 outline-none select-none touch-manipulation",
        "transition-opacity active:opacity-80",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-xl sm:text-2xl leading-none">{label}</span>
      {sub && (
        <span className="text-[10px] mt-0.5 font-normal text-black/70">
          {sub}
        </span>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// FOOTER
// ──────────────────────────────────────────────────────────────

function Footer({ dev }: { dev?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer className="py-4 px-4 text-center space-y-1">
      {dev && (
        <p className="text-white/50 text-xs font-body">
          Developed by Shehzad Sultan | 03418890677
        </p>
      )}
      <p className="text-white/30 text-[10px] font-body">
        © {year}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white/60"
        >
          caffeine.ai
        </a>
      </p>
    </footer>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE TRANSITION WRAPPER
// ──────────────────────────────────────────────────────────────

function Page({
  children,
  style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="min-h-screen bg-background flex flex-col"
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// PLAYER STATS HELPERS
// ──────────────────────────────────────────────────────────────

function loadPlayerStats(): PlayerStats[] {
  try {
    const saved = localStorage.getItem("ccb_player_stats");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function savePlayerStats(stats: PlayerStats[]): void {
  try {
    localStorage.setItem("ccb_player_stats", JSON.stringify(stats));
  } catch {}
}

function updatePlayerStatsAfterMatch(record: MatchRecord): void {
  const stats = loadPlayerStats();
  const statsMap = new Map<string, PlayerStats>(stats.map((s) => [s.key, s]));
  const participatingKeys = new Set<string>();

  for (const inn of [record.innings1, record.innings2].filter(
    Boolean,
  ) as InningsState[]) {
    for (const b of [...inn.activeBatsmen, ...inn.outBatsmen]) {
      const key = `${inn.battingTeam.id}_${b.player.name}`;
      participatingKeys.add(key);
      const existing = statsMap.get(key) ?? {
        key,
        name: b.player.name,
        teamName: inn.battingTeam.name,
        totalRuns: 0,
        totalWickets: 0,
        matchesPlayed: 0,
      };
      existing.totalRuns += b.runs;
      statsMap.set(key, existing);
    }
    for (const bw of inn.bowlers) {
      const key = `${inn.bowlingTeam.id}_${bw.name}`;
      participatingKeys.add(key);
      const existing = statsMap.get(key) ?? {
        key,
        name: bw.name,
        teamName: inn.bowlingTeam.name,
        totalRuns: 0,
        totalWickets: 0,
        matchesPlayed: 0,
      };
      existing.totalWickets += bw.wickets;
      statsMap.set(key, existing);
    }
  }

  for (const key of participatingKeys) {
    const s = statsMap.get(key);
    if (s) {
      s.matchesPlayed += 1;
      statsMap.set(key, s);
    }
  }

  savePlayerStats(Array.from(statsMap.values()));
}

// ──────────────────────────────────────────────────────────────
// ANALYTICS DASHBOARD
// ──────────────────────────────────────────────────────────────

function AnalyticsDashboard({
  isAdmin,
  onAdminLogin,
  onBack,
  pastMatchesCount,
}: {
  isAdmin: boolean;
  onAdminLogin: () => void;
  onBack: () => void;
  pastMatchesCount: number;
}) {
  const { actor } = useActor();
  const [totalUsers, setTotalUsers] = React.useState<number | null>(null);
  const [totalTeams, setTotalTeams] = React.useState<number | null>(null);
  const [totalMatches, setTotalMatches] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!actor) return;
    setLoading(true);
    Promise.all([
      actor.getTotalUsers().catch(() => BigInt(0)),
      actor.getTotalTeams().catch(() => BigInt(0)),
      actor.getTotalMatches().catch(() => BigInt(0)),
    ])
      .then(([u, t, m]) => {
        setTotalUsers(Number(u));
        setTotalTeams(Number(t));
        setTotalMatches(Number(m));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  if (!isAdmin) {
    return (
      <motion.div
        key="analytics-locked"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-screen flex flex-col items-center justify-center px-4 pb-24"
        style={{
          background: "linear-gradient(180deg,#050a0e 0%,#0a1a12 100%)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 text-white/60 text-sm bg-white/5 rounded-lg px-3 py-2 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center space-y-4">
          <div style={{ fontSize: 64 }}>🔒</div>
          <h2 className="text-xl font-bold text-white">Admin Only</h2>
          <p className="text-white/50 text-sm">
            Analytics are restricted to admin access
          </p>
          <button
            type="button"
            onClick={onAdminLogin}
            className="px-6 py-3 rounded-xl font-bold text-sm cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#00e676,#00b248)",
              color: "#000",
            }}
          >
            🔓 Login as Admin
          </button>
        </div>
      </motion.div>
    );
  }

  const stats = [
    { label: "Total Users", value: totalUsers, icon: "👥", color: "#00e5ff" },
    { label: "Total Teams", value: totalTeams, icon: "🏏", color: "#00ff88" },
    {
      label: "Total Matches",
      value: totalMatches,
      icon: "🏆",
      color: "#ffd700",
    },
    {
      label: "Local Matches",
      value: pastMatchesCount,
      icon: "📱",
      color: "#ff6b35",
    },
  ];

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen pb-32 px-4 pt-4"
      style={{ background: "linear-gradient(180deg,#050a0e 0%,#0a1a12 100%)" }}
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 text-sm bg-white/5 rounded-lg px-3 py-2 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-white">📊 Analytics</h1>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/40">
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 border"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: `${s.color}33`,
                  boxShadow: `0 0 20px ${s.color}22`,
                }}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div
                  className="text-3xl font-bold font-display"
                  style={{ color: s.color, textShadow: `0 0 12px ${s.color}` }}
                >
                  {s.value ?? "—"}
                </div>
                <div className="text-xs text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(0,255,136,0.2)",
            }}
          >
            <h3 className="text-sm font-bold text-white/80 mb-3">
              📈 Activity
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50">Matches on this device</span>
                <span className="text-primary font-bold">
                  {pastMatchesCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50">Backend synced matches</span>
                <span style={{ color: "#ffd700" }} className="font-bold">
                  {totalMatches ?? "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50">Registered users</span>
                <span style={{ color: "#00e5ff" }} className="font-bold">
                  {totalUsers ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// HOME VIEW
// ──────────────────────────────────────────────────────────────

interface HomeViewProps {
  onSetup: () => void;
  onTeams: () => void;
  onEditTeams: () => void;
  onTournament: () => void;
  onFixedSchedule: () => void;
  onLiveMatch: () => void;
  onScoreBoard: () => void;
  pastMatches: MatchRecord[];
  currentUser?: CcbUser | null;
  myTeamsCount?: number;
  onCreateTeam?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  onAdminLogin?: () => void;
  onAdminLogout?: () => void;
  myTeams?: MyTeam[];
  onAddPlayer?: (team: MyTeam) => void;
  onRules?: () => void;
  onAnalytics?: () => void;
  onPlayerLeaderboard?: () => void;
}

function HomeView({
  onSetup,
  onTeams,
  onEditTeams,
  onTournament,
  onFixedSchedule,
  onLiveMatch,
  onScoreBoard,
  pastMatches,
  currentUser,
  myTeamsCount = 0,
  onCreateTeam,
  onLogout,
  isAdmin = false,
  onAdminLogin,
  onAdminLogout,
  myTeams = [],
  onAddPlayer,
  onRules,
  onAnalytics,
  onPlayerLeaderboard,
}: HomeViewProps) {
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(
    () => (window as any).__deferredInstallPrompt || null,
  );
  const [pwaInstalled, setPwaInstalled] = useState(
    () => !!(window as any).__pwaInstalled,
  );
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {
        try {
          const el = document.createElement("input");
          el.value = window.location.href;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        } catch {}
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
  }

  useEffect(() => {
    // Pick up prompt if already captured globally before React mounted
    if ((window as any).__deferredInstallPrompt) {
      setPwaInstallPrompt((window as any).__deferredInstallPrompt);
    }
    const onAvailable = () => {
      setPwaInstallPrompt((window as any).__deferredInstallPrompt);
    };
    const onInstalled = () => {
      setPwaInstalled(true);
      setPwaInstallPrompt(null);
    };
    window.addEventListener("pwa-install-available", onAvailable);
    window.addEventListener("pwa-app-installed", onInstalled);
    // Also listen directly in case the event fires after mount
    const handler = (e: any) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      setPwaInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("pwa-install-available", onAvailable);
      window.removeEventListener("pwa-app-installed", onInstalled);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const _handleInstallApp = async () => {
    const prompt = pwaInstallPrompt || (window as any).__deferredInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") {
        setPwaInstalled(true);
        setPwaInstallPrompt(null);
        (window as any).__deferredInstallPrompt = null;
      }
    } else {
      alert('To install: tap the browser menu → "Add to Home Screen"');
    }
  };

  const handleShareApp = () => {
    const url = window.location.href;
    const msg = encodeURIComponent(
      `Check out CCB Scoring Pro - Cricket Scoring App! ${url}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const [showHistory, setShowHistory] = useState(false);
  const [showAddPlayerPicker, setShowAddPlayerPicker] = useState(false);

  return (
    <Page
      style={{
        background:
          "linear-gradient(160deg, #000000 0%, #001a0a 60%, #000d1a 100%)",
      }}
    >
      {/* Header */}
      <header className="pt-3 pb-2 px-6 text-center relative">
        {/* Admin Mode badge */}
        {isAdmin && (
          <div
            className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(0,255,136,0.15)",
              border: "1px solid rgba(0,255,136,0.5)",
              color: "#00ff88",
            }}
            data-ocid="home.admin_mode.success_state"
          >
            🛡️ Admin Mode Active
          </div>
        )}
        {!isAdmin && (
          <button
            type="button"
            data-ocid="home.admin_login.button"
            onClick={onAdminLogin}
            title="Admin Login"
            className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            🔒 Admin
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            data-ocid="home.admin_logout.button"
            onClick={onAdminLogout}
            title="Logout Admin"
            className="absolute top-10 left-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs cursor-pointer"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,80,80,0.3)",
              color: "rgba(255,100,100,0.7)",
            }}
          >
            🔓 Logout
          </button>
        )}
        {currentUser && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-white/60 text-xs font-body truncate max-w-[100px]">
              {currentUser.name}
            </span>
            <button
              type="button"
              data-ocid="home.logout.button"
              onClick={onLogout}
              title="Logout"
              className="text-white/40 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-white/10 cursor-pointer bg-transparent"
            >
              ⏏
            </button>
          </div>
        )}
        <div className="flex justify-center mb-2">
          <img
            src="/assets/uploads/file_000000003a687208b1003ca9aabc1805-Picsart-BackgroundRemover-1.png"
            alt="CCB SCORING PRO"
            className="w-14 h-14 object-contain"
            style={{ filter: "drop-shadow(0 0 16px #00ff88)" }}
          />
        </div>
        <h1
          className="font-display font-bold text-primary text-2xl sm:text-3xl tracking-widest uppercase leading-tight"
          style={{ textShadow: "0 0 30px rgba(250,255,0,0.4)" }}
        >
          CHOLISTAN
          <br />
          CRICKET BOARD
        </h1>
        <p className="text-white/70 font-body text-sm mt-2 tracking-wider uppercase">
          Official Match Scorer
        </p>
      </header>

      {/* Divider */}
      <div className="mx-6 h-px bg-primary/20" />

      {/* Action Buttons */}
      <main className="flex-1 flex flex-col items-center gap-4 px-6 py-8 pb-36">
        {/* Hero Welcome Section */}
        <div
          className="w-full max-w-sm"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,180,80,0.12) 0%, rgba(0,0,0,0) 100%)",
            borderRadius: "20px",
            padding: "24px 20px",
            marginBottom: "4px",
            border: "1px solid rgba(0,180,80,0.25)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#00e676",
              margin: "0 0 4px",
              letterSpacing: "-0.5px",
            }}
          >
            {currentUser
              ? `Welcome, ${currentUser.name}! 👋`
              : "CCB Scoring Pro"}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.9rem",
              margin: "0 0 18px",
              lineHeight: 1.4,
            }}
          >
            {myTeamsCount > 0
              ? `You have ${myTeamsCount} team${myTeamsCount !== 1 ? "s" : ""}. Ready to start a match!`
              : "Create your team and start live cricket scoring easily"}
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <motion.button
              type="button"
              data-ocid="home.hero.create_team.primary_button"
              whileTap={{ scale: 0.95 }}
              onClick={onCreateTeam || onTeams}
              style={{
                background: "linear-gradient(135deg,#00e676,#00b248)",
                color: "#000",
                fontWeight: 700,
                fontSize: "0.9rem",
                border: "none",
                borderRadius: 14,
                padding: "11px 22px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 4px 15px rgba(0,230,118,0.4)",
                minWidth: 130,
              }}
            >
              <span>👥</span> Create Team
            </motion.button>
            <motion.button
              type="button"
              data-ocid="home.hero.setup.secondary_button"
              whileTap={{ scale: 0.95 }}
              onClick={onSetup}
              style={{
                background: "transparent",
                color: "#00e676",
                fontWeight: 700,
                fontSize: "0.9rem",
                border: "2px solid #00e676",
                borderRadius: 14,
                padding: "11px 22px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                minWidth: 130,
              }}
            >
              <span>🏏</span> Start Match
            </motion.button>
          </div>
        </div>

        {/* Onboarding Steps */}
        {myTeamsCount === 0 ? (
          <div
            style={{
              display: "flex",
              gap: 7,
              justifyContent: "center",
              flexWrap: "wrap",
              width: "100%",
              maxWidth: "24rem",
            }}
          >
            {(
              [
                { step: 1, icon: "👥", label: "Create Team" },
                { step: 2, icon: "➕", label: "Add Players" },
                { step: 3, icon: "🏏", label: "Start Match" },
              ] as const
            ).map(({ step, icon, label }) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,230,118,0.2)",
                  borderRadius: 30,
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                <span
                  style={{
                    background: "rgba(0,230,118,0.2)",
                    color: "#00e676",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step}
                </span>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.45)",
              width: "100%",
              maxWidth: "24rem",
            }}
          >
            🏆 Quick start: pick teams and score your match!
          </div>
        )}

        {/* PWA + Share Row */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%",
            maxWidth: "24rem",
          }}
        >
          {!pwaInstalled && (
            <button
              type="button"
              data-ocid="home.share_app.button"
              onClick={handleShareApp}
              style={{
                background: "rgba(37,211,102,0.12)",
                color: "#25d366",
                border: "1px solid rgba(37,211,102,0.35)",
                borderRadius: 12,
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Share2 size={13} /> Share App
            </button>
          )}
          <motion.button
            type="button"
            data-ocid="home.copy_link.button"
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            style={{
              background: linkCopied ? "rgba(0,230,118,0.2)" : "transparent",
              color: linkCopied ? "#00e676" : "rgba(255,255,255,0.6)",
              fontWeight: 600,
              fontSize: "0.82rem",
              border: `1px solid ${linkCopied ? "rgba(0,230,118,0.5)" : "rgba(255,255,255,0.2)"}`,
              borderRadius: 12,
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.2s",
            }}
          >
            {linkCopied ? "✅ Copied!" : "🔗 Copy Link"}
          </motion.button>
        </div>

        {/* Dashboard Icon Cards Grid */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4">
          {/* Start Match Card */}
          <motion.button
            type="button"
            data-ocid="home.start_match.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onSetup}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-yellow-400/30 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(250,255,0,0.12) 0%, rgba(250,255,0,0.04) 100%)",
              boxShadow:
                "0 0 24px rgba(250,255,0,0.25), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src="/assets/generated/icon-start-match-transparent.dim_256x256.png"
              alt="Start Match"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 12px #00ff88) drop-shadow(0 0 24px #00cc66)",
              }}
            />
            <span className="text-sm font-bold text-yellow-300 tracking-wide text-center leading-tight">
              START MATCH
            </span>
          </motion.button>

          {/* Team Directory Card */}
          <motion.button
            type="button"
            data-ocid="home.teams.secondary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onTeams}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src="/assets/generated/icon-team-directory-transparent.dim_256x256.png"
              alt="Team Directory"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 10px #ffd700) drop-shadow(0 0 20px #cc9900)",
              }}
            />
            <span className="text-sm font-bold text-white tracking-wide text-center leading-tight">
              TEAM DIRECTORY
            </span>
          </motion.button>

          {/* Edit Teams Card */}
          <motion.button
            type="button"
            data-ocid="home.edit_teams.secondary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onEditTeams}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src="/assets/generated/icon-edit-teams-transparent.dim_256x256.png"
              alt="Edit Teams"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 10px #00ff88) drop-shadow(0 0 20px #00aa55)",
              }}
            />
            <span className="text-sm font-bold text-white tracking-wide text-center leading-tight">
              EDIT TEAMS
            </span>
          </motion.button>

          {/* Tournament Card */}
          <motion.button
            type="button"
            data-ocid="home.tournament.secondary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onTournament}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-yellow-400/20 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(250,255,0,0.08) 0%, rgba(250,255,0,0.02) 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src="/assets/generated/icon-tournament-transparent.dim_256x256.png"
              alt="Tournament"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 12px #ffd700) drop-shadow(0 0 24px #ffaa00)",
              }}
            />
            <span className="text-sm font-bold text-yellow-200 tracking-wide text-center leading-tight">
              TOURNAMENT
            </span>
          </motion.button>

          {/* Fixed Schedule Card */}
          <motion.button
            type="button"
            data-ocid="home.fixed_schedule.secondary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onFixedSchedule}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-yellow-400/20 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(250,255,0,0.08) 0%, rgba(250,255,0,0.02) 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src="/assets/generated/icon-schedule-transparent.dim_256x256.png"
              alt="Fixed Schedule"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 10px #00ff88) drop-shadow(0 0 20px #ffd700)",
              }}
            />
            <span className="text-sm font-bold text-yellow-200 tracking-wide text-center leading-tight">
              FIXED SCHEDULE
            </span>
          </motion.button>

          {/* Live Match Card */}
          <motion.button
            type="button"
            data-ocid="home.live_match.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onLiveMatch}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-400/40 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)",
              boxShadow:
                "0 0 18px rgba(239,68,68,0.3), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src="/assets/generated/icon-live-match-transparent.dim_256x256.png"
              alt="Live Match"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 12px #ff4444) drop-shadow(0 0 24px #00ff88)",
              }}
            />
            <span className="text-sm font-bold text-red-300 tracking-wide text-center leading-tight">
              LIVE MATCH
            </span>
          </motion.button>

          {/* Score Board Card */}
          <motion.button
            type="button"
            data-ocid="home.scoreboard.secondary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onScoreBoard}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,188,212,0.12) 0%, rgba(0,188,212,0.04) 100%)",
              borderColor: "rgba(0,188,212,0.35)",
              boxShadow:
                "0 0 18px rgba(0,188,212,0.2), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                filter:
                  "drop-shadow(0 0 10px #00BCD4) drop-shadow(0 0 20px #0097A7)",
              }}
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Score Board</title>
                <rect
                  x="4"
                  y="10"
                  width="48"
                  height="36"
                  rx="5"
                  stroke="#00BCD4"
                  strokeWidth="2.5"
                  fill="none"
                />
                <rect
                  x="4"
                  y="10"
                  width="48"
                  height="10"
                  rx="5"
                  fill="rgba(0,188,212,0.15)"
                />
                <rect
                  x="9"
                  y="14"
                  width="20"
                  height="2"
                  rx="1"
                  fill="#00BCD4"
                />
                <rect
                  x="9"
                  y="26"
                  width="12"
                  height="2"
                  rx="1"
                  fill="#00BCD4"
                  opacity="0.8"
                />
                <rect
                  x="9"
                  y="32"
                  width="16"
                  height="2"
                  rx="1"
                  fill="#00BCD4"
                  opacity="0.6"
                />
                <rect
                  x="9"
                  y="38"
                  width="10"
                  height="2"
                  rx="1"
                  fill="#00BCD4"
                  opacity="0.4"
                />
                <rect
                  x="32"
                  y="26"
                  width="16"
                  height="2"
                  rx="1"
                  fill="#00E676"
                />
                <rect
                  x="32"
                  y="32"
                  width="12"
                  height="2"
                  rx="1"
                  fill="#00E676"
                  opacity="0.7"
                />
                <rect
                  x="32"
                  y="38"
                  width="8"
                  height="2"
                  rx="1"
                  fill="#00E676"
                  opacity="0.5"
                />
              </svg>
            </div>
            <span
              className="text-sm font-bold tracking-wide text-center leading-tight"
              style={{ color: "#00BCD4" }}
            >
              SCORE BOARD
            </span>
          </motion.button>

          {/* Create Team Card */}
          <motion.button
            type="button"
            data-ocid="home.create_team.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onCreateTeam}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,230,118,0.14) 0%, rgba(0,230,118,0.04) 100%)",
              borderColor: "rgba(0,230,118,0.4)",
              boxShadow:
                "0 0 20px rgba(0,230,118,0.22), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                filter:
                  "drop-shadow(0 0 10px #00E676) drop-shadow(0 0 20px #00aa55)",
              }}
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Create Team</title>
                <circle
                  cx="20"
                  cy="20"
                  r="8"
                  stroke="#00E676"
                  strokeWidth="2.5"
                  fill="none"
                />
                <path
                  d="M8 40c0-8 5.4-12 12-12s12 4 12 12"
                  stroke="#00E676"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="28"
                  r="6"
                  stroke="#00ff88"
                  strokeWidth="2"
                  fill="rgba(0,255,136,0.1)"
                />
                <line
                  x1="40"
                  y1="24"
                  x2="40"
                  y2="32"
                  stroke="#00ff88"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="36"
                  y1="28"
                  x2="44"
                  y2="28"
                  stroke="#00ff88"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              className="text-sm font-bold tracking-wide text-center leading-tight"
              style={{ color: "#00E676" }}
            >
              CREATE TEAM
            </span>
          </motion.button>

          {/* Add Player Card */}
          <motion.button
            type="button"
            data-ocid="home.add_player.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAddPlayerPicker(true)}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(41,121,255,0.14) 0%, rgba(41,121,255,0.04) 100%)",
              borderColor: "rgba(41,121,255,0.4)",
              boxShadow:
                "0 0 20px rgba(41,121,255,0.22), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                filter:
                  "drop-shadow(0 0 10px #2979FF) drop-shadow(0 0 20px #1565C0)",
              }}
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Add Player</title>
                <circle
                  cx="24"
                  cy="18"
                  r="9"
                  stroke="#2979FF"
                  strokeWidth="2.5"
                  fill="none"
                />
                <path
                  d="M8 44c0-9 7-14 16-14s16 5 16 14"
                  stroke="#2979FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle
                  cx="44"
                  cy="36"
                  r="8"
                  fill="rgba(41,121,255,0.15)"
                  stroke="#2979FF"
                  strokeWidth="2"
                />
                <line
                  x1="44"
                  y1="31"
                  x2="44"
                  y2="41"
                  stroke="#2979FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="39"
                  y1="36"
                  x2="49"
                  y2="36"
                  stroke="#2979FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              className="text-sm font-bold tracking-wide text-center leading-tight"
              style={{ color: "#82B1FF" }}
            >
              ADD PLAYER
            </span>
          </motion.button>
          {/* Rules         </div> Regulations Card */}
          <motion.button
            type="button"
            data-ocid="home.rules.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onRules?.()}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.04) 100%)",
              borderColor: "rgba(34,197,94,0.4)",
              boxShadow:
                "0 0 20px rgba(34,197,94,0.22), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                filter:
                  "drop-shadow(0 0 10px #22c55e) drop-shadow(0 0 20px #16a34a)",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                <title>Rules</title>
                <rect
                  x="8"
                  y="4"
                  width="24"
                  height="32"
                  rx="4"
                  stroke="#22c55e"
                  strokeWidth="2"
                  fill="none"
                />
                <line
                  x1="13"
                  y1="12"
                  x2="27"
                  y2="12"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="13"
                  y1="18"
                  x2="27"
                  y2="18"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="13"
                  y1="24"
                  x2="22"
                  y2="24"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="28" cy="30" r="6" fill="#fbbf24" opacity="0.9" />
                <text
                  x="28"
                  y="34"
                  textAnchor="middle"
                  fontSize="8"
                  fill="#000"
                  fontWeight="bold"
                >
                  R
                </text>
              </svg>
            </div>
            <span
              className="text-sm font-bold tracking-wide text-center leading-tight"
              style={{ color: "#22c55e" }}
            >
              RULES
            </span>
          </motion.button>

          {/* Analytics Card — Admin Only */}
          {isAdmin && (
            <motion.button
              type="button"
              data-ocid="home.analytics.primary_button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onAnalytics?.()}
              className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,229,255,0.14) 0%, rgba(0,229,255,0.04) 100%)",
                borderColor: "rgba(0,229,255,0.4)",
                boxShadow:
                  "0 0 20px rgba(0,229,255,0.22), 0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  filter:
                    "drop-shadow(0 0 10px #00e5ff) drop-shadow(0 0 20px #0088aa)",
                }}
              >
                <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                  <title>Analytics</title>
                  <rect
                    x="6"
                    y="28"
                    width="6"
                    height="8"
                    fill="#00e5ff"
                    opacity="0.9"
                    rx="1"
                  />
                  <rect
                    x="14"
                    y="20"
                    width="6"
                    height="16"
                    fill="#00e5ff"
                    opacity="0.9"
                    rx="1"
                  />
                  <rect
                    x="22"
                    y="12"
                    width="6"
                    height="24"
                    fill="#00e5ff"
                    opacity="0.9"
                    rx="1"
                  />
                  <rect
                    x="30"
                    y="6"
                    width="6"
                    height="30"
                    fill="#ffd700"
                    opacity="0.9"
                    rx="1"
                  />
                  <line
                    x1="4"
                    y1="36"
                    x2="38"
                    y2="36"
                    stroke="#00e5ff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span
                className="text-sm font-bold tracking-wide text-center leading-tight"
                style={{ color: "#00e5ff" }}
              >
                ANALYTICS
              </span>
            </motion.button>
          )}

          {/* Tournament Leaderboard Card */}
          <motion.button
            type="button"
            data-ocid="home.player_leaderboard.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onPlayerLeaderboard?.()}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,215,0,0.14) 0%, rgba(255,215,0,0.04) 100%)",
              borderColor: "rgba(255,215,0,0.4)",
              boxShadow:
                "0 0 20px rgba(255,215,0,0.22), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                filter:
                  "drop-shadow(0 0 10px #ffd700) drop-shadow(0 0 20px #aa8800)",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                <title>Tournament Leaderboard</title>
                <rect
                  x="14"
                  y="24"
                  width="12"
                  height="12"
                  rx="2"
                  fill="#ffd700"
                  opacity="0.9"
                />
                <rect
                  x="4"
                  y="28"
                  width="10"
                  height="8"
                  rx="2"
                  fill="#ffd700"
                  opacity="0.6"
                />
                <rect
                  x="26"
                  y="28"
                  width="10"
                  height="8"
                  rx="2"
                  fill="#ffd700"
                  opacity="0.6"
                />
                <polygon
                  points="20,4 23,14 34,14 25,21 28,31 20,24 12,31 15,21 6,14 17,14"
                  fill="#ffd700"
                  opacity="0.95"
                />
              </svg>
            </div>
            <span
              className="text-sm font-bold tracking-wide text-center leading-tight"
              style={{ color: "#ffd700" }}
            >
              LEADERBOARD
            </span>
          </motion.button>
        </div>
        {/* Past Matches Toggle */}
        <button
          type="button"
          data-ocid="home.past_matches.toggle"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full max-w-sm h-12 rounded-xl font-body font-semibold text-sm text-white/60 border border-white/15 bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <History size={16} />
          PAST MATCHES
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Past Matches List */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-sm overflow-hidden"
            >
              {pastMatches.length === 0 ? (
                <div
                  data-ocid="home.past_matches.empty_state"
                  className="text-center text-white/40 text-sm py-6 font-body"
                >
                  No past matches yet
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {pastMatches.map((m, i) => (
                    <div
                      key={m.id}
                      data-ocid={`home.past_matches.item.${i + 1}`}
                      className="bg-card border border-primary/20 rounded-lg p-3"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        minHeight: "auto",
                        marginBottom: "4px",
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          style={{
                            background: "rgba(0,255,136,0.15)",
                            color: "#00ff88",
                            borderRadius: "6px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        >
                          #{pastMatches.length - i}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            className="text-white font-body font-semibold text-sm"
                            style={{
                              wordBreak: "break-word",
                              lineHeight: "1.4",
                            }}
                          >
                            {m.teamA.name} vs {m.teamB.name}
                          </p>
                          <p
                            className="text-primary text-xs font-body mt-0.5"
                            style={{ wordBreak: "break-word" }}
                          >
                            {m.resultText}
                          </p>
                          <p className="text-white/40 text-xs font-body mt-1">
                            {m.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Player Team Picker Dialog */}
      {showAddPlayerPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setShowAddPlayerPicker(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAddPlayerPicker(false)}
        >
          <div
            style={{
              background: "#0a1a0f",
              border: "1.5px solid rgba(41,121,255,0.5)",
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "360px",
              boxShadow: "0 0 32px rgba(41,121,255,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                color: "#82B1FF",
                fontWeight: 700,
                fontSize: "16px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              ➕ Add Player — Select Team
            </h3>
            {myTeams.length === 0 ? (
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "14px",
                    marginBottom: "16px",
                  }}
                >
                  No teams yet. Create a team first.
                </p>
                <button
                  type="button"
                  data-ocid="home.add_player.create_team.button"
                  onClick={() => {
                    setShowAddPlayerPicker(false);
                    onCreateTeam?.();
                  }}
                  style={{
                    background: "rgba(0,230,118,0.15)",
                    border: "1.5px solid #00E676",
                    borderRadius: "12px",
                    padding: "10px 24px",
                    color: "#00E676",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  🏟️ Create Team
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "320px",
                  overflowY: "auto",
                }}
              >
                {myTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    data-ocid="home.add_player.team.button"
                    onClick={() => {
                      setShowAddPlayerPicker(false);
                      onAddPlayer?.(team);
                    }}
                    style={{
                      background: "rgba(41,121,255,0.1)",
                      border: "1.5px solid rgba(41,121,255,0.3)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>
                      {team.logo ? "🖼️" : "👥"}
                    </span>
                    <span>{team.name}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "rgba(255,255,255,0.35)",
                        fontSize: "12px",
                      }}
                    >
                      {team.players.length} players
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              data-ocid="home.add_player_picker.close_button"
              onClick={() => setShowAddPlayerPicker(false)}
              style={{
                marginTop: "16px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                padding: "8px",
                color: "rgba(255,255,255,0.5)",
                fontSize: "13px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <Footer dev />

      {/* Floating PWA Install Button */}
      {pwaInstallPrompt && !pwaInstalled && (
        <button
          type="button"
          data-ocid="home.install_app.button"
          onClick={_handleInstallApp}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            zIndex: 9999,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            padding: "12px 20px",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(34,197,94,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "pulse 2s infinite",
          }}
        >
          📲 Install App
        </button>
      )}
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// EDIT TEAMS DIALOG
// ──────────────────────────────────────────────────────────────

interface EditTeamsDialogProps {
  open: boolean;
  teams: Team[];
  onSave: (teams: Team[]) => void;
  onClose: () => void;
}

function EditTeamsDialog({
  open,
  teams,
  onSave,
  onClose,
}: EditTeamsDialogProps) {
  const [draft, setDraft] = useState<Team[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savePwdInput, setSavePwdInput] = useState("");
  const [savePwdDialog, setSavePwdDialog] = useState(false);
  const [savePwdError, setSavePwdError] = useState(false);

  // Sync draft with teams when dialog opens
  useEffect(() => {
    if (open) {
      setDraft(
        teams.map((t) => ({ ...t, players: t.players.map((p) => ({ ...p })) })),
      );
    }
  }, [open, teams]);

  function updateTeamName(teamId: string, name: string) {
    setDraft((prev) => prev.map((t) => (t.id === teamId ? { ...t, name } : t)));
  }

  function updatePlayerName(teamId: string, playerId: string, name: string) {
    setDraft((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              players: t.players.map((p) =>
                p.id === playerId ? { ...p, name } : p,
              ),
            }
          : t,
      ),
    );
  }

  function addPlayer(teamId: string) {
    const newPlayer: Player = { id: `p_${Date.now()}`, name: "New Player" };
    setDraft((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, players: [...t.players, newPlayer] } : t,
      ),
    );
  }

  function removePlayer(teamId: string, playerId: string) {
    setDraft((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
          : t,
      ),
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className="max-w-lg w-full max-h-[85vh] flex flex-col p-0 border border-yellow-400/40"
          style={{ background: "#000", color: "#fff" }}
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-yellow-400/20 shrink-0">
            <DialogTitle className="text-yellow-400 font-bold text-lg tracking-wide flex items-center gap-2">
              <Pencil size={18} />
              Edit Teams
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {draft.map((team, idx) => (
              <div
                key={team.id}
                data-ocid={`edit_teams.item.${idx + 1}`}
                className="border border-yellow-400/20 rounded-xl overflow-hidden"
              >
                {/* Team header with name input */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5">
                  <div className="w-7 h-7 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center shrink-0">
                    <Shield size={12} className="text-yellow-400" />
                  </div>
                  <input
                    data-ocid={`edit_teams.team_name.input.${idx + 1}`}
                    value={team.name}
                    onChange={(e) => updateTeamName(team.id, e.target.value)}
                    className="flex-1 bg-transparent text-white font-semibold text-sm outline-none border-b border-yellow-400/30 focus:border-yellow-400 pb-0.5 min-w-0"
                    placeholder="Team name..."
                  />
                  <button
                    type="button"
                    data-ocid={`edit_teams.expand.toggle.${idx + 1}`}
                    onClick={() =>
                      setExpandedId(expandedId === team.id ? null : team.id)
                    }
                    className="text-yellow-400/70 hover:text-yellow-400 p-1 rounded transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    {expandedId === team.id ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                  </button>
                </div>

                {/* Players list */}
                <AnimatePresence>
                  {expandedId === team.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-2 space-y-1.5 border-t border-yellow-400/10 bg-black">
                        {team.players.map((player, pi) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-2"
                          >
                            <span className="text-yellow-400/50 text-xs w-5 shrink-0">
                              {pi + 1}.
                            </span>
                            <input
                              data-ocid={`edit_teams.player_name.input.${pi + 1}`}
                              value={player.name}
                              onChange={(e) =>
                                updatePlayerName(
                                  team.id,
                                  player.id,
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-white/5 text-white text-xs outline-none border border-white/10 focus:border-yellow-400/50 rounded px-2 py-1 min-w-0"
                              placeholder="Player name..."
                            />
                            <button
                              type="button"
                              data-ocid={`edit_teams.player.delete_button.${pi + 1}`}
                              onClick={() => removePlayer(team.id, player.id)}
                              className="text-red-400/60 hover:text-red-400 p-1 rounded transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          data-ocid={`edit_teams.add_player.button.${idx + 1}`}
                          onClick={() => addPlayer(team.id)}
                          className="flex items-center gap-1.5 text-yellow-400/70 hover:text-yellow-400 text-xs font-semibold mt-2 cursor-pointer border-0 bg-transparent py-1 transition-colors"
                        >
                          <Plus size={13} />
                          Add Player
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <DialogFooter className="px-5 py-4 border-t border-yellow-400/20 shrink-0 flex gap-3">
            <button
              type="button"
              data-ocid="edit_teams.cancel_button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-white/20 text-white/70 font-semibold text-sm hover:bg-white/5 cursor-pointer bg-transparent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="edit_teams.save_button"
              onClick={() => {
                setSavePwdInput("");
                setSavePwdError(false);
                setSavePwdDialog(true);
              }}
              className="flex-1 h-11 rounded-xl bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 cursor-pointer border-0 tracking-wide transition-colors"
              style={{ boxShadow: "0 0 16px rgba(250,255,0,0.3)" }}
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {savePwdDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-xs rounded-2xl border border-primary/40 bg-zinc-950 p-6 flex flex-col gap-4">
            <h2 className="text-primary font-display font-bold text-lg text-center">
              🔒 Admin Password
            </h2>
            <p className="text-white/60 text-sm text-center">
              Enter password to save changes
            </p>
            <input
              type="password"
              value={savePwdInput}
              onChange={(e) => {
                setSavePwdInput(e.target.value);
                setSavePwdError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (savePwdInput === "Shahzad@99") {
                    onSave(draft);
                    setSavePwdDialog(false);
                  } else setSavePwdError(true);
                }
              }}
              placeholder="Enter Password"
              className="w-full rounded-lg border border-white/20 bg-black text-white px-4 py-3 text-base outline-none focus:border-primary text-center tracking-widest"
            />
            {savePwdError && (
              <p className="text-red-400 text-sm text-center">Wrong password</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSavePwdDialog(false)}
                className="flex-1 h-11 rounded-xl border border-white/20 text-white/60 font-semibold text-sm cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (savePwdInput === "Shahzad@99") {
                    onSave(draft);
                    setSavePwdDialog(false);
                  } else setSavePwdError(true);
                }}
                className="flex-1 h-11 rounded-xl bg-primary text-black font-bold text-sm cursor-pointer border-0"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// TEAMS VIEW
// ──────────────────────────────────────────────────────────────

function TeamsView({ onBack, teams }: { onBack: () => void; teams: Team[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Page>
      <header className="flex items-center gap-3 px-4 pt-8 pb-4 border-b border-primary/20">
        <button
          type="button"
          data-ocid="teams.back.button"
          onClick={onBack}
          className="text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer border-0 bg-transparent"
        >
          <Home size={20} />
        </button>
        <div>
          <h2 className="text-primary font-display font-bold text-xl tracking-wide">
            TEAM DIRECTORY
          </h2>
          <p className="text-white/50 text-xs font-body">
            {teams.length} Registered Teams
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {teams.map((team, idx) => (
          <div
            key={team.id}
            data-ocid={`teams.item.${idx + 1}`}
            className="border border-primary/30 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === team.id ? null : team.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-card hover:bg-primary/5 transition-colors cursor-pointer border-0 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Shield size={14} className="text-primary" />
                </div>
                <span className="text-white font-body font-semibold text-sm">
                  {team.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs font-body">
                  {team.players.length} players
                </span>
                {expanded === team.id ? (
                  <ChevronUp size={16} className="text-primary" />
                ) : (
                  <ChevronDown size={16} className="text-primary" />
                )}
              </div>
            </button>
            <AnimatePresence>
              {expanded === team.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-background border-t border-primary/20 px-4 py-3 grid grid-cols-2 gap-1">
                    {team.players.map((p, pi) => (
                      <p
                        key={p.id}
                        className="text-white/70 text-xs font-body py-0.5"
                      >
                        <span className="text-primary/60 mr-1">{pi + 1}.</span>
                        {p.name}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </main>

      <Footer />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// SETUP VIEW
// ──────────────────────────────────────────────────────────────

interface SetupViewProps {
  onBack: () => void;
  onStart: (teamA: Team, teamB: Team, overs: number) => void;
  teams: Team[];
  myTeams?: MyTeam[];
}

function SetupView({ onBack, onStart, teams, myTeams = [] }: SetupViewProps) {
  // Combine: default teams + user's teams (convert MyTeam → Team)
  const myTeamsAsTeams: Team[] = myTeams.map((t) => ({
    id: t.id,
    name: t.name,
    players: t.players,
  }));
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [overs, setOvers] = useState(6);
  const [error, setError] = useState("");

  const allSelectableTeams = [...teams, ...myTeamsAsTeams];
  const teamA = allSelectableTeams.find((t) => t.id === teamAId) ?? null;
  const teamB = allSelectableTeams.find((t) => t.id === teamBId) ?? null;

  function handleStart() {
    if (!teamA || !teamB) {
      setError("Please select both teams.");
      return;
    }
    if (teamA.id === teamB.id) {
      setError("Teams must be different.");
      return;
    }
    setError("");
    onStart(teamA, teamB, overs);
  }

  const selectClass =
    "w-full bg-card border border-primary/40 text-white font-body text-sm rounded-xl px-4 py-3 outline-none focus:border-primary cursor-pointer";

  return (
    <Page>
      <header className="flex items-center gap-3 px-4 pt-8 pb-4 border-b border-primary/20">
        <button
          type="button"
          data-ocid="setup.back.button"
          onClick={onBack}
          className="text-primary p-2 rounded-lg hover:bg-primary/10 cursor-pointer border-0 bg-transparent"
        >
          <Home size={20} />
        </button>
        <div>
          <h2 className="text-primary font-display font-bold text-xl tracking-wide">
            MATCH SETUP
          </h2>
          <p className="text-white/50 text-xs font-body">
            Configure your match
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Team A */}
          <div>
            <label
              htmlFor="teamASelect"
              className="block text-white font-body font-semibold text-sm mb-2"
            >
              🏏 Batting First — Team A
            </label>
            <select
              id="teamASelect"
              data-ocid="setup.team_a.select"
              value={teamAId}
              onChange={(e) => setTeamAId(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled style={{ background: "#111" }}>
                Select Team A...
              </option>
              <optgroup
                label="─── Default Teams ───"
                style={{ background: "#111", color: "#00e676" }}
              >
                {teams.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    style={{ background: "#111" }}
                  >
                    {t.name}
                  </option>
                ))}
              </optgroup>
              {myTeamsAsTeams.length > 0 && (
                <optgroup
                  label="─── My Teams ───"
                  style={{ background: "#111", color: "#ffd600" }}
                >
                  {myTeamsAsTeams.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      style={{ background: "#111" }}
                    >
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Team B */}
          <div>
            <label
              htmlFor="teamBSelect"
              className="block text-white font-body font-semibold text-sm mb-2"
            >
              🎯 Bowling First — Team B
            </label>
            <select
              id="teamBSelect"
              data-ocid="setup.team_b.select"
              value={teamBId}
              onChange={(e) => setTeamBId(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled style={{ background: "#111" }}>
                Select Team B...
              </option>
              <optgroup
                label="─── Default Teams ───"
                style={{ background: "#111", color: "#00e676" }}
              >
                {teams
                  .filter((t) => t.id !== teamAId)
                  .map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      style={{ background: "#111" }}
                    >
                      {t.name}
                    </option>
                  ))}
              </optgroup>
              {myTeamsAsTeams.length > 0 && (
                <optgroup
                  label="─── My Teams ───"
                  style={{ background: "#111", color: "#ffd600" }}
                >
                  {myTeamsAsTeams
                    .filter((t) => t.id !== teamAId)
                    .map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        style={{ background: "#111" }}
                      >
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Overs */}
          <div>
            <p className="text-white font-body font-semibold text-sm mb-3">
              ⏱ Total Overs
            </p>
            <div className="flex gap-2 flex-wrap">
              {[3, 4, 5, 6, 7, 8, 9, 10].map((ov) => (
                <button
                  type="button"
                  key={ov}
                  data-ocid={`setup.overs_${ov}.toggle`}
                  onClick={() => setOvers(ov)}
                  className={[
                    "w-12 h-12 rounded-xl font-display font-bold text-lg border-2 cursor-pointer transition-all",
                    overs === ov
                      ? "bg-primary text-black border-primary"
                      : "bg-transparent text-white border-white/30 hover:border-primary/60",
                  ].join(" ")}
                >
                  {ov}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              data-ocid="setup.error_state"
              className="text-btn-red font-body text-sm"
            >
              ⚠ {error}
            </p>
          )}

          {/* Start */}
          <button
            type="button"
            data-ocid="setup.start_match.primary_button"
            onClick={handleStart}
            className="w-full h-16 rounded-xl font-display font-bold text-xl text-black bg-primary border-0 cursor-pointer tracking-wider"
            style={{ boxShadow: "0 0 24px rgba(250,255,0,0.35)" }}
          >
            START MATCH 🏏
          </button>
        </div>
      </main>

      <Footer />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// PLAYER SELECTION VIEW
// ──────────────────────────────────────────────────────────────

interface PlayerSelectionViewProps {
  battingTeam: Team;
  bowlingTeam: Team;
  inningsNum: 1 | 2;
  onBack: () => void;
  onConfirm: (striker: string, nonStriker: string, bowler: string) => void;
}

function PlayerPicker({
  label,
  value,
  onChange,
  mode,
  setMode,
  players,
  ocid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode: "select" | "edit";
  setMode: (m: "select" | "edit") => void;
  players: Player[];
  ocid: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={ocid} className="text-white font-semibold text-sm">
          {label}
        </label>
        {players.length > 0 && (
          <button
            type="button"
            onClick={() => setMode(mode === "select" ? "edit" : "select")}
            className="text-xs px-2 py-1 rounded-lg border cursor-pointer transition-colors"
            style={{
              borderColor:
                mode === "edit"
                  ? "rgba(0,230,118,0.5)"
                  : "rgba(255,255,255,0.2)",
              color: mode === "edit" ? "#00e676" : "rgba(255,255,255,0.5)",
              background: "transparent",
            }}
          >
            {mode === "select" ? "✏️ Edit" : "📋 List"}
          </button>
        )}
      </div>
      {mode === "select" && players.length > 0 ? (
        <select
          data-ocid={ocid}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border text-white text-sm rounded-xl px-4 py-3 outline-none cursor-pointer"
          style={{
            background: "#0a1a0f",
            borderColor: "rgba(0,230,118,0.25)",
          }}
        >
          <option value="" disabled style={{ background: "#111" }}>
            Select player...
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.name} style={{ background: "#111" }}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          data-ocid={`${ocid}_input`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()} name...`}
          className="w-full border text-white text-sm rounded-xl px-4 py-3 outline-none"
          style={{
            background: "#0a1a0f",
            borderColor: "rgba(0,230,118,0.25)",
          }}
        />
      )}
    </div>
  );
}

function PlayerSelectionView({
  battingTeam,
  bowlingTeam,
  inningsNum,
  onBack,
  onConfirm,
}: PlayerSelectionViewProps) {
  const battingPlayers = battingTeam.players ?? [];
  const bowlingPlayers = bowlingTeam.players ?? [];

  const [strikerMode, setStrikerMode] = useState<"select" | "edit">(
    battingPlayers.length > 0 ? "select" : "edit",
  );
  const [nonStrikerMode, setNonStrikerMode] = useState<"select" | "edit">(
    battingPlayers.length > 0 ? "select" : "edit",
  );
  const [bowlerMode, setBowlerMode] = useState<"select" | "edit">(
    bowlingPlayers.length > 0 ? "select" : "edit",
  );

  const [striker, setStriker] = useState(battingPlayers[0]?.name ?? "");
  const [nonStriker, setNonStriker] = useState(battingPlayers[1]?.name ?? "");
  const [bowler, setBowler] = useState(bowlingPlayers[0]?.name ?? "");
  const [error, setError] = useState("");

  function handleConfirm() {
    if (!striker.trim() || !nonStriker.trim() || !bowler.trim()) {
      setError("Please fill all three fields.");
      return;
    }
    if (striker.trim() === nonStriker.trim()) {
      setError("Striker and Non-Striker must be different players.");
      return;
    }
    setError("");
    onConfirm(striker.trim(), nonStriker.trim(), bowler.trim());
  }

  return (
    <Page>
      <header
        className="flex items-center gap-3 px-4 pt-8 pb-4"
        style={{ borderBottom: "1px solid rgba(0,230,118,0.2)" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="text-primary p-2 rounded-lg cursor-pointer border-0 bg-transparent"
          style={{ color: "#00e676" }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2
            className="font-bold text-xl tracking-wide"
            style={{ color: "#00e676" }}
          >
            SELECT PLAYERS
          </h2>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            {inningsNum === 1
              ? `${battingTeam.name} batting`
              : `2nd Innings — ${battingTeam.name} batting`}
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          {/* Team info banner */}
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(0,230,118,0.06)",
              border: "1px solid rgba(0,230,118,0.2)",
            }}
          >
            <p className="font-bold text-sm" style={{ color: "#00e676" }}>
              🏏 Batting: {battingTeam.name}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              vs 🎯 Bowling: {bowlingTeam.name}
            </p>
          </div>

          {/* Striker */}
          <PlayerPicker
            label="🏏 Striker (Opener)"
            value={striker}
            onChange={setStriker}
            mode={strikerMode}
            setMode={setStrikerMode}
            players={battingPlayers}
            ocid="player-selection.striker.select"
          />

          {/* Non-Striker */}
          <PlayerPicker
            label="🏃 Non-Striker"
            value={nonStriker}
            onChange={setNonStriker}
            mode={nonStrikerMode}
            setMode={setNonStrikerMode}
            players={battingPlayers}
            ocid="player-selection.non_striker.select"
          />

          {/* Bowler */}
          <PlayerPicker
            label="🎯 Opening Bowler"
            value={bowler}
            onChange={setBowler}
            mode={bowlerMode}
            setMode={setBowlerMode}
            players={bowlingPlayers}
            ocid="player-selection.bowler.select"
          />

          {/* Error */}
          {error && (
            <p
              data-ocid="player-selection.error_state"
              className="text-sm rounded-lg px-3 py-2"
              style={{
                color: "#f87171",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              ⚠️ {error}
            </p>
          )}

          {/* Confirm button */}
          <motion.button
            type="button"
            data-ocid="player-selection.start.button"
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            className="w-full font-bold text-xl text-black border-0 cursor-pointer tracking-wider rounded-xl"
            style={{
              minHeight: 56,
              background: "linear-gradient(135deg, #00e676, #00b248)",
              boxShadow: "0 0 24px rgba(0,230,118,0.4)",
            }}
          >
            START INNINGS 🏏
          </motion.button>
        </div>
      </main>
      <Footer />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// SCORING VIEW
// ──────────────────────────────────────────────────────────────

interface ScoringViewProps {
  innings: InningsState;
  inningsNum: 1 | 2;
  totalOvers: number;
  target?: number; // innings 2 only
  onUpdate: (newInnings: InningsState) => void;
  onInningsEnd: (finalInnings: InningsState) => void;
  onHome: () => void;
  initialBowlerName?: string;
}

function ScoringView({
  innings,
  inningsNum,
  totalOvers,
  target,
  onUpdate,
  onInningsEnd,
  onHome,
  initialBowlerName,
}: ScoringViewProps) {
  const [undoStack, setUndoStack] = useState<InningsState[]>([]);
  const [bowlerName, setBowlerName] = useState(
    initialBowlerName || innings.bowlingTeam.name,
  );

  // Write live match data to localStorage for LiveMatchView
  useEffect(() => {
    const striker = innings.activeBatsmen.find((b) => b.isStriker);
    const nonStriker = innings.activeBatsmen.find((b) => !b.isStriker);
    const currentBowler = innings.bowlers[innings.bowlers.length - 1];
    const data = {
      teamA: innings.battingTeam.name,
      teamB: innings.bowlingTeam.name,
      totalRuns: innings.totalRuns,
      wickets: innings.wickets,
      balls: innings.balls,
      totalOvers,
      strikerName: striker?.player.name ?? "",
      strikerRuns: striker?.runs ?? 0,
      strikerBalls: striker?.balls ?? 0,
      nonStrikerName: nonStriker?.player.name ?? "",
      nonStrikerRuns: nonStriker?.runs ?? 0,
      bowlerName: currentBowler?.name ?? bowlerName,
      target,
      isComplete: innings.isComplete,
      inningsNum,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem("ccb_live_match", JSON.stringify(data));
    } catch {}
  }, [innings, bowlerName, target, inningsNum, totalOvers]);

  const [bowlerDlg, setBowlerDlg] = useState(false);
  const [bowlerInput, setBowlerInput] = useState("");
  const [wicketDlg, setWicketDlg] = useState<WicketDialog>({
    open: false,
    step: "type",
  });
  const [editableTeamName, setEditableTeamName] = useState(
    innings.battingTeam.name,
  );

  const striker = innings.activeBatsmen.find((b) => b.isStriker);
  const nonStriker = innings.activeBatsmen.find((b) => !b.isStriker);

  const oversText = `${formatOvers(innings.balls)} / ${totalOvers}`;
  const runsNeeded =
    target !== undefined ? target - innings.totalRuns : undefined;
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;

  function pushUndo(state: InningsState) {
    setUndoStack((prev) => [...prev, state]);
  }

  function handleRun(runs: number) {
    pushUndo(innings);
    const next = applyLegal(innings, runs, totalOvers, bowlerName);

    // 2nd innings target check — auto stop
    if (inningsNum === 2 && target !== undefined && next.totalRuns >= target) {
      onInningsEnd(next);
      return;
    }

    if (next.isComplete) {
      onInningsEnd(next);
    } else {
      onUpdate(next);
      // End of over — ask for next bowler
      if (next.balls % 6 === 0 && next.balls > 0) {
        smartBackup();
        setBowlerInput("");
        setBowlerDlg(true);
      }
    }
  }

  function handleExtra(extraRuns: number) {
    pushUndo(innings);
    const next = applyExtra(innings, extraRuns, bowlerName);
    onUpdate(next);
  }

  function handleOutClick() {
    setWicketDlg({ open: true, step: "type", wicketType: undefined });
  }

  function handleWicketType(wt: WicketType) {
    const available = getAvailableBatsmen(innings);
    const wouldBeLastWicket = innings.wickets >= 9 || available.length === 0;

    if (wouldBeLastWicket) {
      pushUndo(innings);
      const next = applyWicket(innings, wt, null, totalOvers, bowlerName);
      setWicketDlg({ open: false, step: "type" });
      smartBackup();
      onInningsEnd(next);
    } else {
      setWicketDlg({ open: true, step: "batsman", wicketType: wt });
    }
  }

  function handleNewBatsman(player: Player) {
    if (!wicketDlg.wicketType) return;
    pushUndo(innings);
    const next = applyWicket(
      innings,
      wicketDlg.wicketType,
      player,
      totalOvers,
      bowlerName,
    );
    setWicketDlg({ open: false, step: "type" });
    if (inningsNum === 2 && target !== undefined && next.totalRuns >= target) {
      onInningsEnd(next);
      return;
    }
    if (next.isComplete) {
      onInningsEnd(next);
    } else {
      onUpdate(next);
    }
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    onUpdate(prev);
  }

  const available = getAvailableBatsmen(innings);
  const targetReached =
    inningsNum === 2 && target !== undefined && innings.totalRuns >= target;

  return (
    <Page>
      {/* AppBar — Flutter-style black header with yellow title */}
      <header className="bg-black px-4 py-3 flex items-center justify-center border-b border-primary/20 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <button
            data-ocid="scoring.home.button"
            type="button"
            onClick={onHome}
            className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
            title="Home"
          >
            <Home size={18} />
          </button>
        </div>
        <h1 className="font-display font-bold text-primary text-lg tracking-widest uppercase text-center">
          CHOLISTAN CRICKET BOARD
        </h1>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-white/40 text-xs font-body">
            INN {inningsNum}
          </span>
          <button
            data-ocid="scoring.share.button"
            type="button"
            onClick={() => {
              const text = `🏏 CCB Live Score 🏏\nScore: ${innings.totalRuns}/${innings.wickets}\nOvers: ${formatOvers(innings.balls)}/${totalOvers}\nShared via CCB Scoring Pro`;
              if (navigator.share) {
                navigator.share({ title: "CCB Live Score", text });
              } else {
                navigator.clipboard?.writeText(text);
              }
            }}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
            title="Share Score"
          >
            <Share2 size={16} />
          </button>
          <button
            data-ocid="scoring.live_link.button"
            type="button"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#live`;
              navigator.clipboard.writeText(url).catch(() => {});
              alert("Live link copied!");
            }}
            style={{
              fontSize: "10px",
              padding: "3px 7px",
              background: "#1a3a2a",
              border: "1px solid #22c55e",
              borderRadius: "6px",
              color: "#22c55e",
              cursor: "pointer",
            }}
          >
            📡 Live
          </button>
        </div>
      </header>

      {/* Target Banner */}
      {target !== undefined && (
        <div
          className={[
            "px-4 py-2 text-center font-body font-bold text-sm",
            innings.totalRuns >= target
              ? "bg-green-700 text-white"
              : "bg-primary/90 text-black",
          ].join(" ")}
        >
          {innings.totalRuns >= target ? (
            <span>🏆 Target Reached!</span>
          ) : (
            <span>
              🎯 Target: {target} | Need: <strong>{runsNeeded}</strong> from{" "}
              {(totalOvers - oversBowled) * 6 - ballsThisOver} balls
            </span>
          )}
        </div>
      )}

      {/* Score Section — pure black, Flutter-style */}
      <div className="bg-black px-5 pt-4 pb-3">
        {/* Editable Team Name */}
        <input
          type="text"
          data-ocid="scoring.team_name.input"
          value={editableTeamName}
          onChange={(e) => setEditableTeamName(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-white font-display font-bold text-[22px] text-center tracking-wide placeholder-white/40 focus:ring-0 p-0"
          placeholder="Enter Team Name"
        />

        {/* Score — white, 60px, bold */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${innings.totalRuns}-${innings.wickets}`}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="text-center mt-1"
          >
            <p
              className="font-display font-bold text-white leading-none"
              style={{ fontSize: "clamp(52px, 15vw, 72px)" }}
            >
              {innings.totalRuns} / {innings.wickets}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Overs — yellow text */}
        <p className="text-primary font-body text-lg text-center font-semibold mt-1">
          Overs: {oversText}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/15 mx-0" />

      {/* Batsman & Bowler Row — inline editable, Flutter-style */}
      <div className="bg-black px-4 py-3 flex gap-4">
        <div className="flex-1">
          <p className="text-white/60 font-body text-xs mb-1">Batsman</p>
          <input
            type="text"
            data-ocid="scoring.batsman.input"
            value={striker?.player.name ?? ""}
            onChange={(e) => {
              if (!striker) return;
              const updated = innings.activeBatsmen.map((b) =>
                b.isStriker
                  ? { ...b, player: { ...b.player, name: e.target.value } }
                  : b,
              );
              onUpdate({ ...innings, activeBatsmen: updated });
            }}
            className="w-full bg-transparent border-none border-b border-cyan-400/60 outline-none font-body font-semibold text-base pb-1 focus:ring-0 p-0 focus:border-b focus:border-cyan-400"
            style={{ color: "#00FFFF" }}
            placeholder="Batsman Name"
          />
          {striker && (
            <p className="text-white/40 font-body text-[11px] mt-0.5">
              {striker.runs}({striker.balls})
            </p>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white/60 font-body text-xs mb-1">Bowler</p>
          <input
            type="text"
            data-ocid="scoring.bowler.input"
            value={bowlerName}
            onChange={(e) => setBowlerName(e.target.value)}
            className="w-full bg-transparent border-none border-b border-orange-400/60 outline-none font-body font-semibold text-base pb-1 focus:ring-0 p-0 focus:border-b focus:border-orange-400"
            style={{ color: "#FF8C00" }}
            placeholder="Bowler Name"
          />
          {nonStriker && (
            <div className="mt-1">
              <p className="text-white/40 font-body text-[9px] uppercase tracking-wide mb-0.5">
                Non-striker
              </p>
              <input
                type="text"
                data-ocid="scoring.nonstriker.input"
                value={nonStriker?.player.name ?? ""}
                onChange={(e) => {
                  if (!nonStriker) return;
                  const updated = innings.activeBatsmen.map((b) =>
                    !b.isStriker
                      ? { ...b, player: { ...b.player, name: e.target.value } }
                      : b,
                  );
                  onUpdate({ ...innings, activeBatsmen: updated });
                }}
                className="w-full bg-transparent border-none border-b border-lime-400/60 outline-none font-body text-sm pb-0.5 focus:ring-0 p-0 focus:border-b focus:border-lime-400"
                style={{ color: "#ADFF2F" }}
                placeholder="Non-striker Name"
              />
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-white/15" />

      {/* Scoring Buttons — 3x3 grid + LEGAL full-width */}
      <div className="flex-1 bg-black p-3 sm:p-4">
        {targetReached && (
          <div
            data-ocid="scoring.target_reached.success_state"
            className="mb-3 max-w-sm mx-auto rounded-xl bg-green-600 border-2 border-green-400 px-4 py-3 text-center"
          >
            <p className="text-white font-display font-bold text-lg tracking-wider">
              🏆 TARGET REACHED!
            </p>
            <p className="text-white/80 font-body text-sm">
              Match Won! — Target Reached!
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm mx-auto">
          {/* Row 1: 1, 2, 3 — light green */}
          <ScoreBtn
            label="1"
            sub="Run"
            colorClass="bg-btn-green"
            onClick={() => handleRun(1)}
            ocid="scoring.run_1.button"
            disabled={targetReached}
          />
          <ScoreBtn
            label="2"
            sub="Runs"
            colorClass="bg-btn-green"
            onClick={() => handleRun(2)}
            ocid="scoring.run_2.button"
            disabled={targetReached}
          />
          <ScoreBtn
            label="3"
            sub="Runs"
            colorClass="bg-btn-green"
            onClick={() => handleRun(3)}
            ocid="scoring.run_3.button"
            disabled={targetReached}
          />
          {/* Row 2: 4, 6, WD */}
          <ScoreBtn
            label="4"
            sub="FOUR"
            colorClass="bg-btn-blue"
            onClick={() => handleRun(4)}
            ocid="scoring.run_4.button"
            disabled={targetReached}
          />
          <ScoreBtn
            label="6"
            sub="SIX"
            colorClass="bg-btn-orange"
            onClick={() => handleRun(6)}
            ocid="scoring.run_6.button"
            disabled={targetReached}
          />
          <ScoreBtn
            label="WD"
            sub="Wide"
            colorClass="bg-btn-pink"
            onClick={() => handleExtra(1)}
            ocid="scoring.wide.button"
            disabled={targetReached}
          />
          {/* Row 3: NB, OUT, 0 */}
          <ScoreBtn
            label="NB"
            sub="No Ball"
            colorClass="bg-btn-purple"
            onClick={() => handleExtra(1)}
            ocid="scoring.noball.button"
            disabled={targetReached}
          />
          <ScoreBtn
            label="OUT"
            sub="Wicket"
            colorClass="bg-btn-red"
            onClick={handleOutClick}
            ocid="scoring.out.button"
            disabled={targetReached}
          />
          <ScoreBtn
            label="0"
            sub="Dot"
            colorClass="bg-btn-gray"
            onClick={() => handleRun(0)}
            ocid="scoring.run_0.button"
            disabled={targetReached}
          />
          {/* LEGAL — full width bottom */}
          <ScoreBtn
            label="LEGAL"
            sub="Legal Ball"
            colorClass="bg-btn-legal"
            onClick={() => handleRun(0)}
            ocid="scoring.legal.button"
            wide
            disabled={targetReached}
          />
        </div>

        {/* Undo */}
        <div className="flex justify-center mt-3 max-w-sm mx-auto">
          <button
            type="button"
            data-ocid="scoring.undo.button"
            onClick={handleUndo}
            disabled={undoStack.length === 0 || targetReached}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-btn-amber/60 text-btn-amber font-body font-semibold text-sm hover:bg-btn-amber/10 transition-colors cursor-pointer bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw size={15} />
            UNDO Last Ball
          </button>
        </div>
      </div>

      {/* Developer Footer */}
      <footer className="bg-black py-3 px-4 text-center">
        <p className="text-white/50 text-xs font-body">
          Developed by Shehzad Sultan | 03418890677
        </p>
      </footer>

      {/* Bowler Selection Dialog — non-dismissible */}
      <Dialog open={bowlerDlg} onOpenChange={() => {}}>
        <DialogContent
          className="bg-black border-2 border-yellow-400 text-white max-w-sm mx-4"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-yellow-400 font-bold text-xl">
              Over Complete!
            </DialogTitle>
          </DialogHeader>
          <p className="text-white text-sm mb-2">Enter Next Bowler Name:</p>
          <div className="flex gap-2 mb-1">
            <input
              className="flex-1 bg-gray-900 text-white border border-yellow-400/50 rounded px-3 py-2 text-base outline-none"
              value={bowlerInput}
              onChange={(e) => setBowlerInput(e.target.value)}
              placeholder="Bowler name..."
              data-ocid="scoring.bowler_name.input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && bowlerInput.trim()) {
                  setBowlerName(bowlerInput.trim());
                  setBowlerDlg(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                // Auto: pick next unused player from bowling team, or generate Bowler N
                const bowlingPlayers = innings.bowlingTeam.players || [];
                const usedNames = innings.bowlers.map((b) => b.name);
                const unused = bowlingPlayers.filter(
                  (p: { name: string }) => !usedNames.includes(p.name),
                );
                let autoName: string;
                if (unused.length > 0) {
                  autoName = unused[0].name;
                } else {
                  autoName = `Bowler ${innings.bowlers.length + 1}`;
                }
                setBowlerInput(autoName);
              }}
              className="bg-green-500 text-black font-bold px-4 py-2 rounded-xl hover:bg-green-400 cursor-pointer border-0 text-sm whitespace-nowrap"
            >
              ⚡ Auto
            </button>
          </div>
          <DialogFooter>
            <button
              type="button"
              data-ocid="scoring.bowler_name.confirm_button"
              onClick={() => {
                if (bowlerInput.trim()) {
                  setBowlerName(bowlerInput.trim());
                  setBowlerDlg(false);
                }
              }}
              disabled={!bowlerInput.trim()}
              className="w-full bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
            >
              Start Over
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wicket Dialog */}
      <Dialog
        open={wicketDlg.open}
        onOpenChange={(open) =>
          !open && setWicketDlg({ open: false, step: "type" })
        }
      >
        <DialogContent
          data-ocid="scoring.wicket.dialog"
          className="bg-card border border-primary/40 text-white max-w-sm mx-4"
        >
          <DialogHeader>
            <DialogTitle className="text-primary font-display font-bold text-xl">
              {wicketDlg.step === "type" ? "🔴 WICKET!" : "Select Next Batsman"}
            </DialogTitle>
          </DialogHeader>

          {wicketDlg.step === "type" && (
            <div className="space-y-3 pt-2">
              <p className="text-white/60 font-body text-sm">
                How was the batsman dismissed?
              </p>
              {(["Caught", "Bowled", "Run Out"] as WicketType[]).map((wt) => (
                <button
                  key={wt}
                  type="button"
                  data-ocid={`scoring.wicket_type_${wt.toLowerCase().replace(" ", "_")}.button`}
                  onClick={() => handleWicketType(wt)}
                  className="w-full py-3 rounded-xl border border-white/20 text-white font-body font-semibold text-base hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-pointer bg-transparent"
                >
                  {wt}
                </button>
              ))}
              <button
                type="button"
                data-ocid="scoring.wicket.cancel_button"
                onClick={() => setWicketDlg({ open: false, step: "type" })}
                className="w-full py-2 text-white/40 font-body text-sm cursor-pointer bg-transparent border-0"
              >
                Cancel
              </button>
            </div>
          )}

          {wicketDlg.step === "batsman" && (
            <div className="space-y-2 pt-2">
              <p className="text-white/60 font-body text-sm">
                {wicketDlg.wicketType} — Select next batsman:
              </p>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {available.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    data-ocid="scoring.new_batsman.button"
                    onClick={() => handleNewBatsman(p)}
                    className="w-full py-3 px-4 rounded-xl border border-white/20 text-white font-body text-sm text-left hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-pointer bg-transparent"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-ocid="scoring.new_batsman.cancel_button"
                onClick={() => setWicketDlg({ open: false, step: "type" })}
                className="w-full py-2 text-white/40 font-body text-sm cursor-pointer bg-transparent border-0"
              >
                Cancel
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}

interface InningsSwitchProps {
  innings1: InningsState;
  onStart2nd: () => void;
}

function InningsSwitchView({ innings1, onStart2nd }: InningsSwitchProps) {
  const target = innings1.totalRuns + 1;
  return (
    <Page>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="space-y-6"
        >
          <div className="text-6xl">🏏</div>
          <div>
            <p className="text-white/60 font-body text-sm uppercase tracking-widest">
              Innings 1 Complete
            </p>
            <p className="text-primary font-display font-bold text-2xl mt-1">
              {innings1.battingTeam.name}
            </p>
            <p
              className="font-display font-bold text-primary mt-2"
              style={{
                fontSize: "clamp(48px,12vw,72px)",
                textShadow: "0 0 30px rgba(250,255,0,0.4)",
              }}
            >
              {innings1.totalRuns}/{innings1.wickets}
            </p>
            <p className="text-white/50 font-body text-sm mt-1">
              Overs: {formatOvers(innings1.balls)}
            </p>
          </div>

          <div className="bg-card border-2 border-primary rounded-2xl px-8 py-5">
            <p className="text-white/60 font-body text-sm uppercase tracking-wider">
              Target for {innings1.bowlingTeam.name}
            </p>
            <p
              className="font-display font-bold text-primary"
              style={{
                fontSize: "clamp(52px,14vw,80px)",
                textShadow: "0 0 40px rgba(250,255,0,0.6)",
              }}
            >
              {target}
            </p>
            <p className="text-white/50 font-body text-xs">runs to win</p>
          </div>

          <button
            type="button"
            data-ocid="innings_switch.start_second.primary_button"
            onClick={onStart2nd}
            className="w-full max-w-xs h-16 rounded-xl font-display font-bold text-xl text-black bg-primary border-0 cursor-pointer tracking-wider"
            style={{ boxShadow: "0 0 24px rgba(250,255,0,0.4)" }}
          >
            START 2nd INNINGS
          </button>
        </motion.div>
      </main>
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// MAN OF THE MATCH MODAL
// ──────────────────────────────────────────────────────────────

interface MotmCandidate {
  name: string;
  teamName: string;
  teamId: string;
  runs: number;
  wickets: number;
}

interface ManOfTheMatchModalProps {
  match: MatchRecord;
  onConfirm: (motm: {
    name: string;
    teamName: string;
    runs: number;
    wickets: number;
    photo?: string;
  }) => void;
  onSkip: () => void;
}

function ManOfTheMatchModal({
  match,
  onConfirm,
  onSkip,
}: ManOfTheMatchModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  const candidateMap = new Map<string, MotmCandidate>();
  for (const inn of [match.innings1, match.innings2].filter(
    Boolean,
  ) as InningsState[]) {
    for (const b of [...inn.activeBatsmen, ...inn.outBatsmen]) {
      const key = `${inn.battingTeam.id}_${b.player.name}`;
      const ex = candidateMap.get(key);
      if (ex) {
        ex.runs += b.runs;
      } else
        candidateMap.set(key, {
          name: b.player.name,
          teamName: inn.battingTeam.name,
          teamId: inn.battingTeam.id,
          runs: b.runs,
          wickets: 0,
        });
    }
    for (const bw of inn.bowlers) {
      const key = `${inn.bowlingTeam.id}_${bw.name}`;
      const ex = candidateMap.get(key);
      if (ex) {
        ex.wickets += bw.wickets;
      } else
        candidateMap.set(key, {
          name: bw.name,
          teamName: inn.bowlingTeam.name,
          teamId: inn.bowlingTeam.id,
          runs: 0,
          wickets: bw.wickets,
        });
    }
  }

  const candidates = Array.from(candidateMap.values()).sort(
    (a, b) => b.runs + b.wickets * 20 - (a.runs + a.wickets * 20),
  );
  const selectedCandidate = selected ? candidateMap.get(selected) : null;

  return (
    <div
      data-ocid="motm.modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        overflowY: "auto",
        padding: "20px 16px 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>🏆</div>
          <h2
            style={{
              color: "#ffd700",
              fontSize: "22px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            Man of the Match
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              marginTop: "6px",
            }}
          >
            Select the best performer
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          {candidates.map((c) => {
            const key = `${c.teamId}_${c.name}`;
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                data-ocid="motm.item.1"
                onClick={() => setSelected(isSelected ? null : key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: `2px solid ${isSelected ? "#ffd700" : "rgba(255,255,255,0.1)"}`,
                  background: isSelected
                    ? "rgba(255,215,0,0.12)"
                    : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  boxShadow: isSelected
                    ? "0 0 20px rgba(255,215,0,0.3)"
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: isSelected
                      ? "rgba(255,215,0,0.2)"
                      : "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {isSelected ? "⭐" : c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: isSelected ? "#ffd700" : "#fff",
                      fontWeight: 700,
                      margin: 0,
                      fontSize: "15px",
                    }}
                  >
                    {c.name}
                  </p>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: "11px",
                      margin: "2px 0 0",
                    }}
                  >
                    {c.teamName}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  {c.runs > 0 && (
                    <span
                      style={{
                        background: "rgba(255,165,0,0.2)",
                        color: "#ffa500",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {c.runs}R
                    </span>
                  )}
                  {c.wickets > 0 && (
                    <span
                      style={{
                        background: "rgba(180,0,255,0.2)",
                        color: "#cc44ff",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {c.wickets}W
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,215,0,0.2)",
              background: "rgba(255,215,0,0.05)",
            }}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "12px",
                marginBottom: "8px",
              }}
            >
              📸 Upload Photo (optional)
            </p>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px dashed rgba(255,215,0,0.4)",
                color: "rgba(255,255,255,0.6)",
                fontSize: "13px",
              }}
            >
              {photo ? "✅ Photo selected" : "📷 Choose from gallery"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setPhoto(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {photo && (
              <img
                src={photo}
                alt="MOTM"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  marginTop: "8px",
                  border: "2px solid #ffd700",
                }}
              />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            data-ocid="motm.cancel_button"
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontWeight: 600,
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            data-ocid="motm.confirm_button"
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selectedCandidate) return;
              onConfirm({
                name: selectedCandidate.name,
                teamName: selectedCandidate.teamName,
                runs: selectedCandidate.runs,
                wickets: selectedCandidate.wickets,
                photo,
              });
            }}
            style={{
              flex: 2,
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: selected
                ? "linear-gradient(135deg,#ffd700,#ff8c00)"
                : "rgba(255,255,255,0.1)",
              color: selected ? "#000" : "rgba(255,255,255,0.3)",
              fontWeight: 700,
              fontSize: "15px",
              cursor: selected ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            🏆 Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// RESULT VIEW
// ──────────────────────────────────────────────────────────────

interface ResultViewProps {
  match: MatchRecord;
  onNewMatch: () => void;
}

function ResultView({ match, onNewMatch }: ResultViewProps) {
  const { innings1, innings2, resultText } = match;
  const [savingPng, setSavingPng] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [autoSaveModal, setAutoSaveModal] = useState(false);
  const [autoSaveImageUrl, setAutoSaveImageUrl] = useState<string | null>(null);
  const [autoSaveGenerating, setAutoSaveGenerating] = useState(false);
  const autoSaveTriggered = React.useRef(false);
  const [showMotmModal, setShowMotmModal] = useState(true);
  const [confirmedMotm, setConfirmedMotm] = useState<
    MatchRecord["manOfTheMatch"]
  >(match.manOfTheMatch ?? undefined);

  // Auto-create MatchInfoCard when result screen loads
  useEffect(() => {
    try {
      const key = "ccb_match_info_cards";
      const existing: MatchInfoCard[] = JSON.parse(
        localStorage.getItem(key) ?? "[]",
      );
      const alreadyExists = existing.some(
        (c) =>
          c.matchTitle === `${match.teamA.name} vs ${match.teamB.name}` &&
          c.date === match.date,
      );
      if (!alreadyExists) {
        // Compute MoM
        const allBatsmen: { name: string; runs: number }[] = [];
        for (const inn of [innings1, innings2].filter(
          Boolean,
        ) as InningsState[]) {
          for (const b of [...inn.activeBatsmen, ...inn.outBatsmen]) {
            const ex = allBatsmen.find((x) => x.name === b.player.name);
            if (ex) ex.runs += b.runs;
            else allBatsmen.push({ name: b.player.name, runs: b.runs });
          }
        }
        const motm = allBatsmen.sort((a, b) => b.runs - a.runs)[0];
        const newCard: MatchInfoCard = {
          id: `auto_${match.id}`,
          matchTitle: `${match.teamA.name} vs ${match.teamB.name}`,
          tournamentName: "",
          coverPhoto: null,
          matchSummary: resultText ?? "",
          topPerformer: motm ? `${motm.name} - ${motm.runs} Runs` : "",
          location: "",
          status: "Completed",
          date: match.date,
        };
        localStorage.setItem(key, JSON.stringify([newCard, ...existing]));
      }
    } catch {}
  }, [match, innings1, innings2, resultText]);

  // Auto-generate scorecard image on result screen mount (after MOTM selection)
  useEffect(() => {
    if (showMotmModal) return;
    if (autoSaveTriggered.current) return;
    autoSaveTriggered.current = true;

    const timer = setTimeout(async () => {
      setAutoSaveGenerating(true);
      const dataUrl = await generateScorecardImage("scorecard-print");
      setAutoSaveGenerating(false);
      if (dataUrl) {
        setAutoSaveImageUrl(dataUrl);
        setAutoSaveModal(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [showMotmModal]);

  function renderBatsmen(inn: InningsState) {
    const all = [...inn.outBatsmen, ...inn.activeBatsmen];
    return all.map((b) => (
      <tr key={b.player.id} className="border-b border-white/10">
        <td className="py-1.5 pr-3 text-white font-body text-xs">
          {b.player.name}
          {b.isStriker && !b.isOut ? " *" : ""}
        </td>
        <td className="py-1.5 px-2 text-white/60 font-body text-xs">
          {b.isOut ? b.wicketType : b.isOut === false ? "not out" : ""}
        </td>
        <td className="py-1.5 px-2 text-primary font-body font-bold text-xs text-right">
          {b.runs}
        </td>
        <td className="py-1.5 pl-2 text-white/50 font-body text-xs text-right">
          {b.balls}
        </td>
      </tr>
    ));
  }

  function renderBowlers(inn: InningsState) {
    if (!inn.bowlers || inn.bowlers.length === 0) return null;
    return inn.bowlers.map((b) => (
      <tr key={b.name} className="border-b border-white/10">
        <td className="py-1.5 pr-3 text-white font-body text-xs">{b.name}</td>
        <td className="py-1.5 px-2 text-white/60 font-body text-xs text-right">
          {b.overs}.{b.balls % 6}
        </td>
        <td className="py-1.5 px-2 text-primary font-body font-bold text-xs text-right">
          {b.runs}
        </td>
        <td className="py-1.5 pl-2 text-white/50 font-body text-xs text-right">
          {b.wickets}
        </td>
      </tr>
    ));
  }

  async function handleShare() {
    // Build MoM
    const allBatsmen: { name: string; runs: number }[] = [];
    for (const inn of [innings1, innings2].filter(Boolean) as InningsState[]) {
      for (const b of [...inn.activeBatsmen, ...inn.outBatsmen]) {
        const ex = allBatsmen.find((x) => x.name === b.player.name);
        if (ex) ex.runs += b.runs;
        else allBatsmen.push({ name: b.player.name, runs: b.runs });
      }
    }
    const motm = allBatsmen.sort((a, b) => b.runs - a.runs)[0];

    function topBatsmen(inn: InningsState) {
      return [...inn.outBatsmen, ...inn.activeBatsmen]
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 3)
        .map((b) => `  ${b.player.name}: ${b.runs} runs (${b.balls} balls)`)
        .join("\n");
    }

    let text = "🏏 CCB SCORING PRO - Match Report\n";
    text += `${match.teamA.name} vs ${match.teamB.name} | ${match.date}\n`;
    text += `Result: ${resultText ?? ""}\n\n`;
    text += `INNINGS 1 - ${innings1.battingTeam.name}:\n`;
    text += `${topBatsmen(innings1)}\n`;
    text += `Total: ${innings1.totalRuns}/${innings1.wickets} in ${formatOvers(innings1.balls)} overs\n`;
    if (innings2) {
      text += `\nINNINGS 2 - ${innings2.battingTeam.name}:\n`;
      text += `${topBatsmen(innings2)}\n`;
      text += `Total: ${innings2.totalRuns}/${innings2.wickets} in ${formatOvers(innings2.balls)} overs\n`;
    }
    if (motm && motm.runs > 0) {
      text += `\n🏆 Man of the Match: ${motm.name} - ${motm.runs} runs\n`;
    }
    text += "\nScored with CCB Scoring Pro";

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    // Try to generate image first for Web Share API
    setSavingPng(true);
    const dataUrl = await generateScorecardImage("scorecard-print");
    setSavingPng(false);

    if (dataUrl) {
      try {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], "scorecard.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "CCB Match Report",
            text,
          });
          return;
        }
      } catch (e) {
        console.warn("Image share failed, falling back:", e);
      }
    }

    // Fallback 1: text share
    if (navigator.share) {
      try {
        await navigator.share({ title: "CCB Match Report", text });
        return;
      } catch {}
    }

    // Fallback 2: WhatsApp
    window.open(waUrl, "_blank");
  }

  if (showMotmModal) {
    return (
      <ManOfTheMatchModal
        match={match}
        onConfirm={(motm) => {
          try {
            const saved = JSON.parse(
              localStorage.getItem("ccb_past_matches") ?? "[]",
            ) as MatchRecord[];
            const updated = saved.map((m) =>
              m.id === match.id ? { ...m, manOfTheMatch: motm } : m,
            );
            localStorage.setItem("ccb_past_matches", JSON.stringify(updated));
          } catch {}
          setConfirmedMotm(motm);
          setShowMotmModal(false);
        }}
        onSkip={() => setShowMotmModal(false)}
      />
    );
  }

  return (
    <Page>
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {/* Winner Banner */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center mb-6"
        >
          <Trophy size={40} className="text-primary mx-auto mb-3" />
          <p className="text-white/50 font-body text-xs uppercase tracking-widest">
            Match Result
          </p>
          <p
            className="text-primary font-display font-bold text-2xl mt-1"
            style={{ textShadow: "0 0 20px rgba(250,255,0,0.4)" }}
          >
            {resultText}
          </p>
          <p className="text-white/40 font-body text-xs mt-1">{match.date}</p>
        </motion.div>

        {/* Man of the Match */}
        {confirmedMotm && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mb-6 rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-950/60 to-black/80 px-5 py-4 text-center shadow-[0_0_24px_rgba(250,204,21,0.35)]"
            data-ocid="result.motm.card"
          >
            <p className="text-yellow-400/70 text-xs uppercase tracking-[0.2em] font-semibold mb-1">
              🏆 Man of the Match
            </p>
            {confirmedMotm.photo && (
              <img
                src={confirmedMotm.photo}
                alt="MOTM"
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  margin: "0 auto 10px",
                  border: "3px solid #ffd700",
                  boxShadow: "0 0 20px rgba(255,215,0,0.4)",
                }}
              />
            )}
            <p
              className="text-yellow-300 font-display font-bold text-2xl"
              style={{ textShadow: "0 0 16px rgba(250,204,21,0.5)" }}
            >
              {confirmedMotm.name}
            </p>
            <p className="text-yellow-400/60 text-xs mt-1 font-body">
              {confirmedMotm.teamName}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginTop: "8px",
              }}
            >
              {confirmedMotm.runs > 0 && (
                <span
                  style={{
                    background: "rgba(255,165,0,0.2)",
                    color: "#ffa500",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "8px",
                  }}
                >
                  {confirmedMotm.runs} Runs
                </span>
              )}
              {confirmedMotm.wickets > 0 && (
                <span
                  style={{
                    background: "rgba(180,0,255,0.2)",
                    color: "#cc44ff",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "8px",
                  }}
                >
                  {confirmedMotm.wickets} Wkts
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Scorecard */}
        <div id="scorecard-print" className="space-y-4">
          <p className="text-white font-body font-bold text-xs uppercase tracking-widest text-center">
            📋 SCORECARD — {match.teamA.name} vs {match.teamB.name} (
            {match.totalOvers} Overs)
          </p>

          {/* Innings 1 */}
          <div className="bg-card border border-primary/30 rounded-xl p-3">
            <p className="text-primary font-body font-bold text-sm mb-2">
              Innings 1 — {innings1.battingTeam.name}{" "}
              <span className="text-white font-normal">
                {innings1.totalRuns}/{innings1.wickets} (
                {formatOvers(innings1.balls)})
              </span>
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white/40 font-body text-[10px] uppercase pb-1">
                    Batsman
                  </th>
                  <th className="text-left text-white/40 font-body text-[10px] uppercase pb-1">
                    How Out
                  </th>
                  <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                    R
                  </th>
                  <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                    B
                  </th>
                </tr>
              </thead>
              <tbody>{renderBatsmen(innings1)}</tbody>
            </table>
            {innings1.bowlers && innings1.bowlers.length > 0 && (
              <>
                <p className="text-white/40 font-body text-[10px] uppercase mt-3 mb-1">
                  Bowling
                </p>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-white/40 font-body text-[10px] uppercase pb-1">
                        Bowler
                      </th>
                      <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                        O
                      </th>
                      <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                        R
                      </th>
                      <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                        W
                      </th>
                    </tr>
                  </thead>
                  <tbody>{renderBowlers(innings1)}</tbody>
                </table>
              </>
            )}
          </div>

          {/* Innings 2 */}
          {innings2 && (
            <div className="bg-card border border-btn-blue/30 rounded-xl p-3">
              <p className="text-btn-blue font-body font-bold text-sm mb-2">
                Innings 2 — {innings2.battingTeam.name}{" "}
                <span className="text-white font-normal">
                  {innings2.totalRuns}/{innings2.wickets} (
                  {formatOvers(innings2.balls)})
                </span>
              </p>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-white/40 font-body text-[10px] uppercase pb-1">
                      Batsman
                    </th>
                    <th className="text-left text-white/40 font-body text-[10px] uppercase pb-1">
                      How Out
                    </th>
                    <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                      R
                    </th>
                    <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                      B
                    </th>
                  </tr>
                </thead>
                <tbody>{renderBatsmen(innings2)}</tbody>
              </table>
              {innings2.bowlers && innings2.bowlers.length > 0 && (
                <>
                  <p className="text-white/40 font-body text-[10px] uppercase mt-3 mb-1">
                    Bowling
                  </p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left text-white/40 font-body text-[10px] uppercase pb-1">
                          Bowler
                        </th>
                        <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                          O
                        </th>
                        <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                          R
                        </th>
                        <th className="text-right text-white/40 font-body text-[10px] uppercase pb-1">
                          W
                        </th>
                      </tr>
                    </thead>
                    <tbody>{renderBowlers(innings2)}</tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="result.print.button"
              disabled={savingPdf}
              onClick={() =>
                saveAsPdf(
                  "scorecard-print",
                  "match-report.pdf",
                  () => setSavingPdf(true),
                  () => setSavingPdf(false),
                )
              }
              className="flex-1 h-14 rounded-xl border border-white/30 text-white font-body font-semibold flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingPdf ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer size={18} />
              )}
              {savingPdf ? "Saving..." : "Save PDF"}
            </button>
            <button
              type="button"
              data-ocid="result.save_png.button"
              disabled={savingPng}
              onClick={() =>
                saveAsPng(
                  "scorecard-print",
                  "match-report.png",
                  () => setSavingPng(true),
                  () => setSavingPng(false),
                )
              }
              className="flex-1 h-14 rounded-xl border border-primary/40 text-primary font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary/10 cursor-pointer bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingPng ? (
                <span className="inline-block w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {savingPng ? "Saving..." : "Save PNG"}
            </button>
            <button
              type="button"
              data-ocid="result.share.button"
              disabled={sharing}
              onClick={async () => {
                setSharing(true);
                try {
                  await handleShare();
                } finally {
                  setSharing(false);
                }
              }}
              className="flex-1 h-14 rounded-xl border border-primary/50 text-primary font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary/10 cursor-pointer bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sharing ? (
                <span className="inline-block w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Share2 size={18} />
              )}
              {sharing ? "Sharing..." : "WhatsApp"}
            </button>
          </div>

          <button
            type="button"
            data-ocid="result.new_match.primary_button"
            onClick={onNewMatch}
            className="w-full h-14 rounded-xl font-display font-bold text-lg text-black bg-primary border-0 cursor-pointer tracking-wider"
            style={{ boxShadow: "0 0 20px rgba(250,255,0,0.3)" }}
          >
            🏏 NEW MATCH
          </button>
        </div>
      </main>

      {/* Auto-Save Result Modal */}
      {autoSaveModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0d1f0d, #0a1628)",
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "360px",
              width: "100%",
              boxShadow: "0 0 40px rgba(0,255,136,0.2)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "2rem" }}>🏆</div>
              <h3
                style={{
                  color: "#00ff88",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  margin: "8px 0 4px",
                }}
              >
                Match Complete!
              </h3>
              <p
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}
              >
                {resultText}
              </p>
            </div>

            {autoSaveImageUrl && (
              <img
                src={autoSaveImageUrl}
                alt="Scorecard preview"
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  border: "1px solid rgba(0,255,136,0.2)",
                  marginBottom: "16px",
                  maxHeight: "200px",
                  objectFit: "cover",
                }}
              />
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <button
                type="button"
                data-ocid="result.autosave.save_button"
                onClick={() => {
                  if (!autoSaveImageUrl) return;
                  try {
                    const blob = dataUrlToBlob(autoSaveImageUrl);
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.download = `scorecard-${match.teamA.name}-vs-${match.teamB.name}.png`;
                    link.href = blobUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                  } catch (e) {
                    console.error("Auto-save download failed:", e);
                    window.print();
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                📸 Save Image
              </button>

              <button
                type="button"
                data-ocid="result.autosave.share_button"
                onClick={async () => {
                  setAutoSaveModal(false);
                  const text = `🏏 ${match.teamA.name} vs ${match.teamB.name}\nResult: ${resultText}\n\nScored with CCB Scoring Pro`;
                  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  if (autoSaveImageUrl) {
                    try {
                      const blob = dataUrlToBlob(autoSaveImageUrl);
                      const file = new File([blob], "scorecard.png", {
                        type: "image/png",
                      });
                      if (navigator.canShare?.({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: "CCB Match Report",
                          text,
                        });
                        return;
                      }
                    } catch (e) {
                      console.warn("Modal image share failed:", e);
                    }
                  }
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "CCB Match Report",
                        text,
                      });
                      return;
                    } catch {}
                  }
                  window.open(waUrl, "_blank");
                }}
                style={{
                  background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                📤 Share Scorecard
              </button>

              <button
                type="button"
                data-ocid="result.autosave.close_button"
                onClick={() => setAutoSaveModal(false)}
                style={{
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  padding: "12px",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                ❌ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {autoSaveGenerating && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            color: "#00ff88",
            padding: "10px 20px",
            borderRadius: "20px",
            zIndex: 99998,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ⏳ Generating scorecard...
        </div>
      )}

      <Footer />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// TOURNAMENT HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────

function calcNRR(
  teamId: string,
  matches: PoolMatch[],
  poolTeamIds: string[],
): number {
  let runsScored = 0;
  let oversFaced = 0;
  let runsConceded = 0;
  let oversBowled = 0;

  for (const m of matches) {
    if (m.status === "scheduled") continue;
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    if (!isHome && !isAway) continue;
    if (
      !poolTeamIds.includes(m.homeTeamId) ||
      !poolTeamIds.includes(m.awayTeamId)
    )
      continue;

    const totalBalls = m.totalOvers * 6;
    if (isHome) {
      runsScored += m.homeRuns ?? 0;
      oversFaced += (m.homeBalls ?? totalBalls) / 6;
      runsConceded += m.awayRuns ?? 0;
      oversBowled += (m.awayBalls ?? totalBalls) / 6;
    } else {
      runsScored += m.awayRuns ?? 0;
      oversFaced += (m.awayBalls ?? totalBalls) / 6;
      runsConceded += m.homeRuns ?? 0;
      oversBowled += (m.homeBalls ?? totalBalls) / 6;
    }
  }

  if (oversFaced === 0 || oversBowled === 0) return 0;
  return runsScored / oversFaced - runsConceded / oversBowled;
}

interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
}

function calcPoolStandings(
  pool: TournamentPool,
  matches: PoolMatch[],
  teams: Team[],
): TeamStanding[] {
  const standings: TeamStanding[] = pool.teamIds.map((tid) => {
    const team = teams.find((t) => t.id === tid);
    return {
      teamId: tid,
      teamName: team?.name ?? tid,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0,
    };
  });

  const poolMatches = matches.filter(
    (m) =>
      m.status !== "scheduled" &&
      pool.teamIds.includes(m.homeTeamId) &&
      pool.teamIds.includes(m.awayTeamId),
  );

  for (const m of poolMatches) {
    const home = standings.find((s) => s.teamId === m.homeTeamId);
    const away = standings.find((s) => s.teamId === m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    if (m.status === "tied") {
      home.tied++;
      away.tied++;
    } else if ((m.homeRuns ?? 0) > (m.awayRuns ?? 0)) {
      home.won++;
      home.points += 2;
      away.lost++;
    } else {
      away.won++;
      away.points += 2;
      home.lost++;
    }
  }

  for (const s of standings) {
    s.nrr = calcNRR(s.teamId, matches, pool.teamIds);
  }

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });
}

// ──────────────────────────────────────────────────────────────
// TOURNAMENT VIEW
// ──────────────────────────────────────────────────────────────

interface ScoreDialogState {
  open: boolean;
  matchId: string;
  homeRuns: string;
  homeBalls: string;
  awayRuns: string;
  awayBalls: string;
  totalOvers: string;
}

// biome-ignore lint/correctness/noUnusedVariables: kept for future use
function TournamentView({
  onBack,
  tournament,
  onUpdate,
  teams,
  externalAdminUnlocked = false,
}: {
  onBack: () => void;
  tournament: Tournament;
  onUpdate: (t: Tournament) => void;
  teams: Team[];
  externalAdminUnlocked?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "setup" | "schedule" | "standings"
  >("setup");
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => externalAdminUnlocked,
  );
  useEffect(() => {
    if (externalAdminUnlocked) setAdminUnlocked(true);
  }, [externalAdminUnlocked]);
  const [adminPwdDialog, setAdminPwdDialog] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState("");
  const [adminPwdError, setAdminPwdError] = useState(false);
  const [scoreDialog, setScoreDialog] = useState<ScoreDialogState>({
    open: false,
    matchId: "",
    homeRuns: "",
    homeBalls: "",
    awayRuns: "",
    awayBalls: "",
    totalOvers: "6",
  });
  const [addMatchDialog, setAddMatchDialog] = useState<{
    open: boolean;
    poolId: string;
    teamAId: string;
    teamBId: string;
    date: string;
    time: string;
    status: "scheduled" | "completed" | "tied";
    pwdInput: string;
    pwdError: boolean;
    pwdVerified: boolean;
  }>({
    open: false,
    poolId: "",
    teamAId: "",
    teamBId: "",
    date: "",
    time: "",
    status: "scheduled",
    pwdInput: "",
    pwdError: false,
    pwdVerified: false,
  });

  function updateTournament(patch: Partial<Tournament>) {
    const updated = { ...tournament, ...patch };
    onUpdate(updated);
  }

  function addPool() {
    if (tournament.pools.length >= 4) return;
    const names = ["A", "B", "C", "D"];
    const usedNames = tournament.pools.map((p) => p.name);
    const nextName = names.find((n) => !usedNames.includes(n)) ?? "A";
    const newPool: TournamentPool = {
      id: Date.now().toString(),
      name: nextName,
      teamIds: [],
    };
    updateTournament({ pools: [...tournament.pools, newPool] });
  }

  function deletePool(poolId: string) {
    updateTournament({
      pools: tournament.pools.filter((p) => p.id !== poolId),
      matches: tournament.matches.filter(
        (m) =>
          !tournament.pools
            .find((p) => p.id === poolId)
            ?.teamIds.includes(m.homeTeamId),
      ),
    });
  }

  function updatePoolName(poolId: string, name: string) {
    updateTournament({
      pools: tournament.pools.map((p) =>
        p.id === poolId ? { ...p, name } : p,
      ),
    });
  }

  function addTeamToPool(poolId: string, teamId: string) {
    // remove from other pools first
    const pools = tournament.pools.map((p) => ({
      ...p,
      teamIds: p.teamIds.filter((id) => id !== teamId),
    }));
    const target = pools.find((p) => p.id === poolId);
    if (!target || target.teamIds.length >= 5) return;
    updateTournament({
      pools: pools.map((p) =>
        p.id === poolId ? { ...p, teamIds: [...p.teamIds, teamId] } : p,
      ),
    });
  }

  function removeTeamFromPool(poolId: string, teamId: string) {
    updateTournament({
      pools: tournament.pools.map((p) =>
        p.id === poolId
          ? { ...p, teamIds: p.teamIds.filter((id) => id !== teamId) }
          : p,
      ),
    });
  }

  function addMatch(poolId: string) {
    const pool = tournament.pools.find((p) => p.id === poolId);
    if (!pool || pool.teamIds.length < 2) return;
    setAddMatchDialog({
      open: true,
      poolId,
      teamAId: pool.teamIds[0],
      teamBId: pool.teamIds[1],
      date: "",
      time: "",
      status: "scheduled",
      pwdInput: "",
      pwdError: false,
      pwdVerified: adminUnlocked,
    });
  }

  function saveAddMatch() {
    if (!addMatchDialog.pwdVerified) {
      if (addMatchDialog.pwdInput === "Shahzad@99") {
        setAddMatchDialog((prev) => ({
          ...prev,
          pwdVerified: true,
          pwdError: false,
        }));
      } else {
        setAddMatchDialog((prev) => ({ ...prev, pwdError: true }));
      }
      return;
    }
    const newMatch: PoolMatch = {
      id: Date.now().toString(),
      homeTeamId: addMatchDialog.teamAId,
      awayTeamId: addMatchDialog.teamBId,
      totalOvers: 6,
      status: addMatchDialog.status,
      date: addMatchDialog.date,
      time: addMatchDialog.time,
    };
    updateTournament({ matches: [...tournament.matches, newMatch] });
    setAddMatchDialog((prev) => ({ ...prev, open: false }));
  }

  function generateScheduleForPool(poolId: string) {
    const pool = tournament.pools.find((p) => p.id === poolId);
    if (!pool || pool.teamIds.length < 2) return;
    const teamCount = pool.teamIds.length;
    const matchCount = (teamCount * (teamCount - 1)) / 2;
    const confirmed = window.confirm(
      `Generate round-robin schedule for Pool ${pool.name}?\n\n${teamCount} teams → ${matchCount} matches will be created.\nExisting unplayed matches for this pool will be removed.`,
    );
    if (!confirmed) return;
    // Remove existing non-completed matches for this pool
    const otherMatches = tournament.matches.filter((m) => {
      const isPoolMatch =
        pool.teamIds.includes(m.homeTeamId) &&
        pool.teamIds.includes(m.awayTeamId);
      return !isPoolMatch || m.status === "completed" || m.status === "tied";
    });
    // Generate round-robin pairs
    const newMatches: PoolMatch[] = [];
    const baseId = Date.now();
    let matchIdx = 0;
    for (let i = 0; i < pool.teamIds.length; i++) {
      for (let j = i + 1; j < pool.teamIds.length; j++) {
        newMatches.push({
          id: (baseId + matchIdx).toString(),
          homeTeamId: pool.teamIds[i],
          awayTeamId: pool.teamIds[j],
          totalOvers: 6,
          status: "scheduled",
        });
        matchIdx++;
      }
    }
    updateTournament({ matches: [...otherMatches, ...newMatches] });
  }

  function confirmDeleteMatch(matchId: string) {
    const pwd = window.prompt("Admin Password Required:");
    if (pwd === "Shahzad@99") deleteMatch(matchId);
  }

  function deleteMatch(matchId: string) {
    updateTournament({
      matches: tournament.matches.filter((m) => m.id !== matchId),
    });
  }

  function updateMatchTeam(
    matchId: string,
    field: "homeTeamId" | "awayTeamId",
    teamId: string,
  ) {
    updateTournament({
      matches: tournament.matches.map((m) =>
        m.id === matchId ? { ...m, [field]: teamId } : m,
      ),
    });
  }

  function openScoreDialog(m: PoolMatch) {
    setScoreDialog({
      open: true,
      matchId: m.id,
      homeRuns: m.homeRuns?.toString() ?? "",
      homeBalls: m.homeBalls?.toString() ?? "",
      awayRuns: m.awayRuns?.toString() ?? "",
      awayBalls: m.awayBalls?.toString() ?? "",
      totalOvers: m.totalOvers?.toString() ?? "6",
    });
  }

  function saveScore() {
    const { matchId, homeRuns, homeBalls, awayRuns, awayBalls, totalOvers } =
      scoreDialog;
    const hr = Number.parseInt(homeRuns) || 0;
    const hb = Number.parseInt(homeBalls) || Number.parseInt(totalOvers) * 6;
    const ar = Number.parseInt(awayRuns) || 0;
    const ab = Number.parseInt(awayBalls) || Number.parseInt(totalOvers) * 6;
    const ov = Number.parseInt(totalOvers) || 6;
    const status: PoolMatch["status"] = hr === ar ? "tied" : "completed";
    updateTournament({
      matches: tournament.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              homeRuns: hr,
              homeBalls: hb,
              awayRuns: ar,
              awayBalls: ab,
              totalOvers: ov,
              status,
            }
          : m,
      ),
    });
    setScoreDialog((prev) => ({ ...prev, open: false }));
  }

  const teamsInAnyPool = tournament.pools.flatMap((p) => p.teamIds);

  return (
    <Page>
      <header className="pt-8 pb-4 px-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            data-ocid="tournament.back.button"
            onClick={onBack}
            className="h-10 w-10 rounded-lg border border-white/20 bg-transparent text-white/80 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
          >
            <Home size={18} />
          </button>
          <div className="flex-1">
            <h1
              className="font-display font-bold text-primary text-xl tracking-widest uppercase"
              style={{ textShadow: "0 0 20px rgba(250,255,0,0.4)" }}
            >
              TOURNAMENT
            </h1>
            <p className="text-white/50 text-xs font-body">
              Tournament Management
            </p>
          </div>
          <button
            type="button"
            data-ocid="tournament.admin_lock.toggle"
            onClick={() => {
              if (adminUnlocked) {
                setAdminUnlocked(false);
              } else {
                setAdminPwdDialog(true);
              }
            }}
            className={`h-10 w-10 rounded-lg border flex items-center justify-center cursor-pointer transition-colors text-base ${adminUnlocked ? "border-green-400/50 bg-green-400/10 text-green-400 hover:bg-green-400/20" : "border-white/20 bg-transparent text-white/60 hover:bg-white/10"}`}
            title={
              adminUnlocked
                ? "Admin unlocked — click to lock"
                : "Click to unlock admin"
            }
          >
            {adminUnlocked ? "🔓" : "🔒"}
          </button>
        </div>

        {/* Tournament Name */}
        {adminUnlocked ? (
          <input
            type="text"
            data-ocid="tournament.name.input"
            value={tournament.name}
            onChange={(e) => updateTournament({ name: e.target.value })}
            className="w-full bg-transparent border border-primary/40 rounded-xl px-4 py-3 text-white font-body font-semibold text-lg focus:outline-none focus:border-primary"
            placeholder="Tournament Name"
          />
        ) : (
          <button
            type="button"
            data-ocid="tournament.name.button"
            onClick={() => setAdminPwdDialog(true)}
            className="w-full border border-white/10 rounded-xl px-4 py-3 text-white font-body font-semibold text-lg bg-white/5 cursor-pointer hover:border-primary/40 hover:bg-white/10 transition-colors flex items-center justify-between group text-left"
          >
            <span>{tournament.name || "Tournament Name"}</span>
            <span className="text-xs text-white/30 group-hover:text-primary/70 transition-colors flex items-center gap-1">
              ✏️{" "}
              <span className="hidden sm:inline text-white/40">
                tap to edit
              </span>
            </span>
          </button>
        )}
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-white/10 px-4">
        {(["setup", "schedule", "standings"] as const).map((tab) => {
          const labels: Record<string, string> = {
            setup: "Setup",
            schedule: "Schedule",
            standings: "Standings",
          };
          return (
            <button
              key={tab}
              type="button"
              data-ocid={`tournament.${tab}.tab`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-body font-semibold transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-auto px-4 py-4">
        {/* ── SETUP TAB ── */}
        {activeTab === "setup" && (
          <div className="space-y-4">
            {tournament.pools.length === 0 && (
              <p className="text-white/40 text-center py-8 font-body text-sm">
                No pools yet. Click Add Pool below.
              </p>
            )}
            {tournament.pools.map((pool) => {
              const availableTeams = teams.filter(
                (t) =>
                  !teamsInAnyPool.includes(t.id) || pool.teamIds.includes(t.id),
              );
              return (
                <div
                  key={pool.id}
                  data-ocid="tournament.pool.card"
                  className="border border-primary/30 rounded-xl p-4 bg-primary/5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-primary font-display font-bold text-sm">
                      POOL
                    </span>
                    <input
                      type="text"
                      data-ocid="tournament.pool_name.input"
                      value={pool.name}
                      onChange={(e) =>
                        adminUnlocked && updatePoolName(pool.id, e.target.value)
                      }
                      readOnly={!adminUnlocked}
                      className={`w-16 bg-transparent border rounded-lg px-2 py-1 text-primary font-display font-bold text-lg text-center focus:outline-none ${adminUnlocked ? "border-primary/40 focus:border-primary" : "border-white/10 cursor-default"}`}
                      maxLength={3}
                    />
                    <div className="flex-1" />
                    {adminUnlocked && (
                      <button
                        type="button"
                        data-ocid="tournament.pool.delete_button"
                        onClick={() => deletePool(pool.id)}
                        className="h-8 w-8 rounded-lg border border-red-500/40 text-red-400 flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Team list */}
                  <div className="space-y-2 mb-3">
                    {pool.teamIds.map((tid) => {
                      const t = teams.find((x) => x.id === tid);
                      return (
                        <div
                          key={tid}
                          className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                        >
                          <Shield size={14} className="text-primary/60" />
                          <span className="flex-1 text-white font-body text-sm">
                            {t?.name ?? tid}
                          </span>
                          {adminUnlocked && (
                            <button
                              type="button"
                              data-ocid="tournament.team.delete_button"
                              onClick={() => removeTeamFromPool(pool.id, tid)}
                              className="text-red-400 hover:text-red-300 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {pool.teamIds.length === 0 && (
                      <p className="text-white/30 text-xs font-body text-center py-2">
                        No teams — select from below
                      </p>
                    )}
                  </div>

                  {/* Add team dropdown */}
                  {pool.teamIds.length < 5 && adminUnlocked && (
                    <select
                      data-ocid="tournament.team.select"
                      className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white/80 font-body text-sm focus:outline-none focus:border-primary"
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          addTeamToPool(pool.id, e.target.value);
                      }}
                    >
                      <option value="">+ Add Team</option>
                      {availableTeams
                        .filter((t) => !pool.teamIds.includes(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  )}
                  {pool.teamIds.length >= 5 && (
                    <p className="text-white/30 text-xs font-body text-center">
                      Maximum 5 teams per pool
                    </p>
                  )}
                  {pool.teamIds.length >= 2 && (
                    <p className="text-green-400/50 text-xs font-body text-center">
                      ⚡ Go to Schedule tab to auto-generate matches
                    </p>
                  )}
                </div>
              );
            })}

            {tournament.pools.length < 4 && adminUnlocked && (
              <button
                type="button"
                data-ocid="tournament.add_pool.button"
                onClick={addPool}
                className="w-full h-12 rounded-xl border-2 border-dashed border-primary/40 text-primary font-body font-semibold text-sm cursor-pointer hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Pool
              </button>
            )}
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {tournament.pools.length === 0 && (
              <p className="text-white/40 text-center py-8 font-body text-sm">
                Create pools in Setup tab first
              </p>
            )}
            {tournament.pools.map((pool) => {
              const poolMatches = tournament.matches.filter(
                (m) =>
                  pool.teamIds.includes(m.homeTeamId) &&
                  pool.teamIds.includes(m.awayTeamId),
              );
              return (
                <div key={pool.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-primary font-display font-bold text-base tracking-wider">
                      POOL {pool.name}
                    </h2>
                    {pool.teamIds.length >= 2 && adminUnlocked && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-ocid="tournament.auto_schedule.button"
                          onClick={() => generateScheduleForPool(pool.id)}
                          className="h-8 px-3 rounded-lg border border-green-400/60 text-green-400 text-xs font-body font-semibold cursor-pointer hover:bg-green-400/10 transition-colors flex items-center gap-1"
                        >
                          ⚡ Auto Schedule
                        </button>
                        <button
                          type="button"
                          data-ocid="tournament.add_match.button"
                          onClick={() => addMatch(pool.id)}
                          className="h-8 px-3 rounded-lg border border-primary/50 text-primary text-xs font-body font-semibold cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Add Match
                        </button>
                      </div>
                    )}
                  </div>
                  {poolMatches.length === 0 && (
                    <div className="py-4 text-center border border-dashed border-white/10 rounded-lg space-y-1">
                      <p className="text-white/30 text-xs font-body">
                        No matches yet
                      </p>
                      {pool.teamIds.length >= 2 && adminUnlocked && (
                        <p className="text-green-400/60 text-xs font-body">
                          Click ⚡ Auto Schedule to generate round-robin matches
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-3">
                    {poolMatches.map((m, idx) => {
                      const homeTeam = teams.find((t) => t.id === m.homeTeamId);
                      const awayTeam = teams.find((t) => t.id === m.awayTeamId);
                      return (
                        <div
                          key={m.id}
                          data-ocid={`tournament.match.item.${idx + 1}`}
                          className="border border-white/10 rounded-xl p-3 bg-white/3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-primary/80 text-xs font-body font-bold">
                              Match #{idx + 1}
                            </span>
                            <span
                              className={`text-xs font-body font-semibold px-2 py-0.5 rounded-full border ${
                                m.status === "completed"
                                  ? "border-green-400/40 bg-green-400/10 text-green-400"
                                  : m.status === "tied"
                                    ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                                    : "border-white/20 bg-white/5 text-white/50"
                              }`}
                            >
                              {m.status === "completed"
                                ? "✓ Completed"
                                : m.status === "tied"
                                  ? "= Tied"
                                  : "⏰ Upcoming"}
                            </span>
                            <div className="flex-1" />
                            {(m.date || m.time) && (
                              <span className="text-primary/70 text-xs font-body font-semibold">
                                {m.date
                                  ? new Date(m.date).toLocaleDateString(
                                      "en-GB",
                                      { day: "2-digit", month: "short" },
                                    )
                                  : ""}
                                {m.date && m.time ? " · " : ""}
                                {m.time ?? ""}
                              </span>
                            )}
                            {adminUnlocked && (
                              <button
                                type="button"
                                data-ocid={`tournament.match.delete_button.${idx + 1}`}
                                onClick={() => confirmDeleteMatch(m.id)}
                                className="text-red-400/60 hover:text-red-400 cursor-pointer ml-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          {/* Team selectors */}
                          <div className="flex items-center gap-2">
                            {adminUnlocked ? (
                              <>
                                <select
                                  data-ocid="tournament.match_home.select"
                                  className="flex-1 bg-black border border-white/20 rounded-lg px-2 py-1.5 text-white font-body text-xs focus:outline-none focus:border-primary"
                                  value={m.homeTeamId}
                                  onChange={(e) =>
                                    updateMatchTeam(
                                      m.id,
                                      "homeTeamId",
                                      e.target.value,
                                    )
                                  }
                                >
                                  {pool.teamIds.map((tid) => {
                                    const t = teams.find((x) => x.id === tid);
                                    return (
                                      <option key={tid} value={tid}>
                                        {t?.name ?? tid}
                                      </option>
                                    );
                                  })}
                                </select>
                                <span className="text-white/40 font-body text-xs">
                                  vs
                                </span>
                                <select
                                  data-ocid="tournament.match_away.select"
                                  className="flex-1 bg-black border border-white/20 rounded-lg px-2 py-1.5 text-white font-body text-xs focus:outline-none focus:border-primary"
                                  value={m.awayTeamId}
                                  onChange={(e) =>
                                    updateMatchTeam(
                                      m.id,
                                      "awayTeamId",
                                      e.target.value,
                                    )
                                  }
                                >
                                  {pool.teamIds.map((tid) => {
                                    const t = teams.find((x) => x.id === tid);
                                    return (
                                      <option key={tid} value={tid}>
                                        {t?.name ?? tid}
                                      </option>
                                    );
                                  })}
                                </select>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-white font-body text-xs text-center py-1.5">
                                  {teams.find((x) => x.id === m.homeTeamId)
                                    ?.name ?? m.homeTeamId}
                                </span>
                                <span className="text-white/40 font-body text-xs">
                                  vs
                                </span>
                                <span className="flex-1 text-white font-body text-xs text-center py-1.5">
                                  {teams.find((x) => x.id === m.awayTeamId)
                                    ?.name ?? m.awayTeamId}
                                </span>
                              </>
                            )}
                          </div>
                          {/* Score display */}
                          {m.status !== "scheduled" && (
                            <div className="text-white/70 font-body text-xs text-center">
                              {homeTeam?.name}: {m.homeRuns ?? 0}/
                              {Math.floor(
                                (m.homeBalls ?? m.totalOvers * 6) / 6,
                              )}
                              .{(m.homeBalls ?? m.totalOvers * 6) % 6} ov
                              {" · "}
                              {awayTeam?.name}: {m.awayRuns ?? 0}/
                              {Math.floor(
                                (m.awayBalls ?? m.totalOvers * 6) / 6,
                              )}
                              .{(m.awayBalls ?? m.totalOvers * 6) % 6} ov
                            </div>
                          )}
                          {adminUnlocked && (
                            <button
                              type="button"
                              data-ocid="tournament.enter_score.button"
                              onClick={() => openScoreDialog(m)}
                              className="w-full h-9 rounded-lg border border-primary/40 text-primary text-xs font-body font-semibold cursor-pointer hover:bg-primary/10 transition-colors"
                            >
                              {m.status === "scheduled"
                                ? "Enter Score"
                                : "Edit Score"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── STANDINGS TAB ── */}
        {activeTab === "standings" && (
          <div className="space-y-6">
            {tournament.pools.length === 0 && (
              <p className="text-white/40 text-center py-8 font-body text-sm">
                Create pools in Setup tab first
              </p>
            )}
            {tournament.pools.map((pool) => {
              const standings = calcPoolStandings(
                pool,
                tournament.matches,
                teams,
              );
              return (
                <div key={pool.id}>
                  <h2 className="text-primary font-display font-bold text-base tracking-wider mb-3">
                    POOL {pool.name} — Standings
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="text-left text-white/50 font-semibold px-3 py-2">
                            #
                          </th>
                          <th className="text-left text-white/50 font-semibold px-3 py-2">
                            Team
                          </th>
                          <th className="text-center text-white/50 font-semibold px-2 py-2">
                            P
                          </th>
                          <th className="text-center text-green-400/70 font-semibold px-2 py-2">
                            W
                          </th>
                          <th className="text-center text-red-400/70 font-semibold px-2 py-2">
                            L
                          </th>
                          <th className="text-center text-yellow-400/70 font-semibold px-2 py-2">
                            T
                          </th>
                          <th className="text-center text-primary/80 font-semibold px-2 py-2">
                            Pts
                          </th>
                          <th className="text-center text-white/50 font-semibold px-2 py-2">
                            NRR
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => (
                          <tr
                            key={s.teamId}
                            data-ocid={`tournament.standings.item.${i + 1}`}
                            className={`border-b border-white/5 ${i === 0 ? "bg-primary/5" : ""}`}
                          >
                            <td className="px-3 py-2 text-white/40">{i + 1}</td>
                            <td className="px-3 py-2 text-white font-semibold max-w-24 truncate">
                              {s.teamName}
                            </td>
                            <td className="px-2 py-2 text-center text-white/60">
                              {s.played}
                            </td>
                            <td className="px-2 py-2 text-center text-green-400">
                              {s.won}
                            </td>
                            <td className="px-2 py-2 text-center text-red-400">
                              {s.lost}
                            </td>
                            <td className="px-2 py-2 text-center text-yellow-400">
                              {s.tied}
                            </td>
                            <td className="px-2 py-2 text-center text-primary font-bold">
                              {s.points}
                            </td>
                            <td
                              className={`px-2 py-2 text-center font-mono ${s.nrr >= 0 ? "text-green-400" : "text-red-400"}`}
                            >
                              {s.nrr >= 0 ? "+" : ""}
                              {s.nrr.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                        {standings.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="text-center text-white/30 py-4"
                            >
                              No teams
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-white/25 text-xs font-body mt-2 text-center">
                    NRR = (Runs Scored/Overs Faced) - (Runs Conceded/Overs
                    Bowled)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Admin Password Dialog */}
      {adminPwdDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-primary/30 rounded-2xl p-6 w-80 space-y-4">
            <h3 className="text-primary font-display font-bold text-lg tracking-wider text-center">
              ADMIN ACCESS
            </h3>
            <p className="text-white/60 text-xs font-body text-center">
              Enter admin password to unlock editing
            </p>
            <input
              type="password"
              data-ocid="tournament.admin_pwd.input"
              value={adminPwdInput}
              onChange={(e) => setAdminPwdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (adminPwdInput === "Shahzad@99") {
                    setAdminUnlocked(true);
                    setAdminPwdDialog(false);
                    setAdminPwdInput("");
                    setAdminPwdError(false);
                  } else {
                    setAdminPwdError(true);
                  }
                }
              }}
              placeholder="Enter Admin Password"
              className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
            />
            {adminPwdError && (
              <p
                className="text-red-400 text-xs font-body text-center"
                data-ocid="tournament.admin_pwd.error_state"
              >
                Wrong password
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="tournament.admin_pwd.cancel_button"
                onClick={() => {
                  setAdminPwdDialog(false);
                  setAdminPwdInput("");
                  setAdminPwdError(false);
                }}
                className="flex-1 h-10 rounded-lg border border-white/20 text-white/60 font-body text-sm cursor-pointer hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="tournament.admin_pwd.confirm_button"
                onClick={() => {
                  if (adminPwdInput === "Shahzad@99") {
                    setAdminUnlocked(true);
                    setAdminPwdDialog(false);
                    setAdminPwdInput("");
                    setAdminPwdError(false);
                  } else {
                    setAdminPwdError(true);
                  }
                }}
                className="flex-1 h-10 rounded-xl bg-primary text-black font-display font-bold text-sm tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
              >
                UNLOCK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Dialog */}
      <Dialog
        open={addMatchDialog.open}
        onOpenChange={(open) =>
          setAddMatchDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="bg-black border border-primary/30 text-white max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-primary font-display tracking-wider">
              ADD POOL MATCH
            </DialogTitle>
          </DialogHeader>
          {!addMatchDialog.pwdVerified ? (
            <div className="space-y-4 py-2">
              <p className="text-white/60 text-xs font-body">
                Admin password required to add a match.
              </p>
              <input
                type="password"
                data-ocid="tournament.add_match_dialog.password.input"
                value={addMatchDialog.pwdInput}
                onChange={(e) =>
                  setAddMatchDialog((prev) => ({
                    ...prev,
                    pwdInput: e.target.value,
                  }))
                }
                onKeyDown={(e) => e.key === "Enter" && saveAddMatch()}
                placeholder="Enter Admin Password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
              />
              {addMatchDialog.pwdError && (
                <p
                  className="text-red-400 text-xs font-body"
                  data-ocid="tournament.add_match_dialog.error_state"
                >
                  Wrong password
                </p>
              )}
              <button
                type="button"
                data-ocid="tournament.add_match_dialog.confirm_button"
                onClick={saveAddMatch}
                className="w-full h-10 rounded-xl bg-primary text-black font-display font-bold text-sm tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
              >
                VERIFY
              </button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div>
                <label
                  htmlFor="amd-pool"
                  className="text-white/60 text-xs font-body block mb-1"
                >
                  Pool
                </label>
                <select
                  id="amd-pool"
                  data-ocid="tournament.add_match_dialog.pool.select"
                  value={addMatchDialog.poolId}
                  onChange={(e) => {
                    const pool = tournament.pools.find(
                      (p) => p.id === e.target.value,
                    );
                    setAddMatchDialog((prev) => ({
                      ...prev,
                      poolId: e.target.value,
                      teamAId: pool?.teamIds[0] ?? "",
                      teamBId: pool?.teamIds[1] ?? "",
                    }));
                  }}
                  className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                >
                  {tournament.pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      Pool {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {(() => {
                const pool = tournament.pools.find(
                  (p) => p.id === addMatchDialog.poolId,
                );
                const poolTeams = (pool?.teamIds ?? [])
                  .map((tid) => teams.find((t) => t.id === tid))
                  .filter(Boolean);
                return (
                  <>
                    <div>
                      <label
                        htmlFor="amd-team-a"
                        className="text-white/60 text-xs font-body block mb-1"
                      >
                        Team A
                      </label>
                      <select
                        id="amd-team-a"
                        data-ocid="tournament.add_match_dialog.team_a.select"
                        value={addMatchDialog.teamAId}
                        onChange={(e) =>
                          setAddMatchDialog((prev) => ({
                            ...prev,
                            teamAId: e.target.value,
                          }))
                        }
                        className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                      >
                        {poolTeams.map((t) => (
                          <option key={t!.id} value={t!.id}>
                            {t!.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="amd-team-b"
                        className="text-white/60 text-xs font-body block mb-1"
                      >
                        Team B
                      </label>
                      <select
                        id="amd-team-b"
                        data-ocid="tournament.add_match_dialog.team_b.select"
                        value={addMatchDialog.teamBId}
                        onChange={(e) =>
                          setAddMatchDialog((prev) => ({
                            ...prev,
                            teamBId: e.target.value,
                          }))
                        }
                        className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                      >
                        {poolTeams
                          .filter((t) => t!.id !== addMatchDialog.teamAId)
                          .map((t) => (
                            <option key={t!.id} value={t!.id}>
                              {t!.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                );
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="amd-date"
                    className="text-white/60 text-xs font-body block mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="amd-date"
                    type="date"
                    data-ocid="tournament.add_match_dialog.date.input"
                    value={addMatchDialog.date}
                    onChange={(e) =>
                      setAddMatchDialog((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="amd-time"
                    className="text-white/60 text-xs font-body block mb-1"
                  >
                    Time
                  </label>
                  <input
                    id="amd-time"
                    type="time"
                    data-ocid="tournament.add_match_dialog.time.input"
                    value={addMatchDialog.time}
                    onChange={(e) =>
                      setAddMatchDialog((prev) => ({
                        ...prev,
                        time: e.target.value,
                      }))
                    }
                    className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="amd-status"
                  className="text-white/60 text-xs font-body block mb-1"
                >
                  Status
                </label>
                <select
                  id="amd-status"
                  data-ocid="tournament.add_match_dialog.status.select"
                  value={addMatchDialog.status}
                  onChange={(e) =>
                    setAddMatchDialog((prev) => ({
                      ...prev,
                      status: e.target.value as
                        | "scheduled"
                        | "completed"
                        | "tied",
                    }))
                  }
                  className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                >
                  <option value="scheduled">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="tied">Tied</option>
                </select>
              </div>
              <button
                type="button"
                data-ocid="tournament.add_match_dialog.submit_button"
                onClick={saveAddMatch}
                className="w-full h-10 rounded-xl bg-primary text-black font-display font-bold text-sm tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
              >
                ADD MATCH
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Score Entry Dialog */}
      <Dialog
        open={scoreDialog.open}
        onOpenChange={(open) => setScoreDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="bg-black border border-primary/30 text-white max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-primary font-display tracking-wider">
              Enter Score
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(() => {
              const m = tournament.matches.find(
                (x) => x.id === scoreDialog.matchId,
              );
              const homeTeam = teams.find((t) => t.id === m?.homeTeamId);
              const awayTeam = teams.find((t) => t.id === m?.awayTeamId);
              return (
                <>
                  <div>
                    <label
                      htmlFor="sd-total-overs"
                      className="text-white/60 text-xs font-body block mb-1"
                    >
                      Total Overs
                    </label>
                    <input
                      id="sd-total-overs"
                      type="number"
                      data-ocid="tournament.score_dialog.total_overs.input"
                      value={scoreDialog.totalOvers}
                      onChange={(e) =>
                        setScoreDialog((prev) => ({
                          ...prev,
                          totalOvers: e.target.value,
                        }))
                      }
                      className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
                      min={1}
                      max={50}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="sd-home-runs"
                        className="text-white/60 text-xs font-body block mb-1"
                      >
                        {homeTeam?.name ?? "Home"} — Runs
                      </label>
                      <input
                        id="sd-home-runs"
                        type="number"
                        data-ocid="tournament.score_dialog.home_runs.input"
                        value={scoreDialog.homeRuns}
                        onChange={(e) =>
                          setScoreDialog((prev) => ({
                            ...prev,
                            homeRuns: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
                        min={0}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sd-home-balls"
                        className="text-white/60 text-xs font-body block mb-1"
                      >
                        {homeTeam?.name ?? "Home"} — Balls
                      </label>
                      <input
                        id="sd-home-balls"
                        type="number"
                        data-ocid="tournament.score_dialog.home_balls.input"
                        value={scoreDialog.homeBalls}
                        onChange={(e) =>
                          setScoreDialog((prev) => ({
                            ...prev,
                            homeBalls: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
                        placeholder={`${Number.parseInt(scoreDialog.totalOvers || "6") * 6}`}
                        min={1}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sd-away-runs"
                        className="text-white/60 text-xs font-body block mb-1"
                      >
                        {awayTeam?.name ?? "Away"} — Runs
                      </label>
                      <input
                        id="sd-away-runs"
                        type="number"
                        data-ocid="tournament.score_dialog.away_runs.input"
                        value={scoreDialog.awayRuns}
                        onChange={(e) =>
                          setScoreDialog((prev) => ({
                            ...prev,
                            awayRuns: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
                        min={0}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sd-away-balls"
                        className="text-white/60 text-xs font-body block mb-1"
                      >
                        {awayTeam?.name ?? "Away"} — Balls
                      </label>
                      <input
                        id="sd-away-balls"
                        type="number"
                        data-ocid="tournament.score_dialog.away_balls.input"
                        value={scoreDialog.awayBalls}
                        onChange={(e) =>
                          setScoreDialog((prev) => ({
                            ...prev,
                            awayBalls: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-white font-body focus:outline-none focus:border-primary"
                        placeholder={`${Number.parseInt(scoreDialog.totalOvers || "6") * 6}`}
                        min={1}
                      />
                    </div>
                  </div>
                  <p className="text-white/30 text-xs font-body text-center">
                    {Number.parseInt(scoreDialog.homeRuns || "0") ===
                      Number.parseInt(scoreDialog.awayRuns || "0") &&
                    scoreDialog.homeRuns !== ""
                      ? "⚠️ Tied match"
                      : ""}
                  </p>
                </>
              );
            })()}
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              data-ocid="tournament.score_dialog.cancel_button"
              onClick={() =>
                setScoreDialog((prev) => ({ ...prev, open: false }))
              }
              className="flex-1 h-10 rounded-lg border border-white/20 text-white/60 font-body text-sm cursor-pointer hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="tournament.score_dialog.save_button"
              onClick={saveScore}
              className="flex-1 h-10 rounded-lg bg-primary text-black font-body font-bold text-sm cursor-pointer hover:bg-primary/80 transition-colors"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// APP ROOT
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// SPLASH SCREEN
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// MATCH INFO VIEW
// ──────────────────────────────────────────────────────────────

interface MatchInfoViewProps {
  externalAdminUnlocked?: boolean;
  onBack: () => void;
  cards: MatchInfoCard[];
  onUpdate: (cards: MatchInfoCard[]) => void;
  lastMotm?: string;
}

function MatchInfoView({
  onBack,
  cards,
  onUpdate,
  lastMotm,
  externalAdminUnlocked = false,
}: MatchInfoViewProps) {
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => externalAdminUnlocked,
  );
  useEffect(() => {
    if (externalAdminUnlocked) setAdminUnlocked(true);
  }, [externalAdminUnlocked]);
  const [pwdDialog, setPwdDialog] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<MatchInfoCard, "id">>({
    tournamentName: "",
    matchTitle: "",
    coverPhoto: null,
    matchSummary: "",
    topPerformer: lastMotm ?? "",
    location: "",
    status: "Upcoming",
    date: new Date().toISOString().split("T")[0],
  });

  function openAddForm() {
    setEditingId(null);
    setForm({
      tournamentName: "",
      matchTitle: "",
      coverPhoto: null,
      matchSummary: "",
      topPerformer: lastMotm ?? "",
      location: "",
      status: "Upcoming",
      date: new Date().toISOString().split("T")[0],
    });
    setShowForm(true);
  }

  function openEditForm(card: MatchInfoCard) {
    setEditingId(card.id);
    setForm({
      tournamentName: card.tournamentName,
      matchTitle: card.matchTitle,
      coverPhoto: card.coverPhoto,
      matchSummary: card.matchSummary,
      topPerformer: card.topPerformer,
      location: card.location,
      status: card.status,
      date: card.date,
    });
    setShowForm(true);
  }

  function handleSave() {
    if (editingId) {
      onUpdate(
        cards.map((c) => (c.id === editingId ? { id: editingId, ...form } : c)),
      );
    } else {
      const newCard: MatchInfoCard = { id: Date.now().toString(), ...form };
      const updated = [newCard, ...cards].slice(0, 10);
      onUpdate(updated);
    }
    setShowForm(false);
  }

  function handleDelete(id: string) {
    onUpdate(cards.filter((c) => c.id !== id));
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, coverPhoto: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function submitPassword() {
    if (pwdInput === "Shahzad@99") {
      setAdminUnlocked(true);
      setPwdDialog(false);
      setPwdError(false);
    } else {
      setPwdError(true);
    }
  }

  const statusColor = (s: MatchInfoCard["status"]) => {
    if (s === "Upcoming")
      return {
        bg: "rgba(250,255,0,0.15)",
        text: "oklch(var(--p))",
        border: "oklch(var(--p) / 0.5)",
      };
    if (s === "Live")
      return {
        bg: "rgba(0,220,100,0.15)",
        text: "#00dc64",
        border: "rgba(0,220,100,0.5)",
      };
    return {
      bg: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.5)",
      border: "rgba(255,255,255,0.2)",
    };
  };

  return (
    <Page>
      <header className="pt-8 pb-4 px-4 flex items-center justify-between">
        <button
          type="button"
          data-ocid="match_info.back.button"
          onClick={onBack}
          className="h-10 px-4 rounded-lg font-body font-semibold text-sm text-white/80 border border-white/20 bg-transparent cursor-pointer hover:bg-white/5 transition-colors"
        >
          ← BACK
        </button>
        <h2 className="font-display font-bold text-primary text-lg tracking-widest uppercase">
          MATCH INFO
        </h2>
        <button
          type="button"
          data-ocid="match_info.admin_lock.toggle"
          onClick={() => {
            if (adminUnlocked) {
              setAdminUnlocked(false);
            } else {
              setPwdInput("");
              setPwdError(false);
              setPwdDialog(true);
            }
          }}
          className="h-10 px-4 rounded-lg font-body font-semibold text-sm cursor-pointer transition-colors border"
          style={
            adminUnlocked
              ? {
                  background: "oklch(var(--p) / 0.15)",
                  color: "oklch(var(--p))",
                  borderColor: "oklch(var(--p) / 0.5)",
                }
              : {
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  borderColor: "rgba(255,255,255,0.2)",
                }
          }
        >
          {adminUnlocked ? "🔓 ADMIN" : "🔒 ADMIN"}
        </button>
      </header>

      <main className="flex-1 px-4 pb-8 space-y-4">
        {adminUnlocked && !showForm && (
          <button
            type="button"
            data-ocid="match_info.add.primary_button"
            onClick={openAddForm}
            className="w-full h-12 rounded-xl font-display font-bold text-sm tracking-wider text-black bg-primary cursor-pointer"
            style={{ boxShadow: "0 0 20px rgba(250,255,0,0.3)" }}
          >
            + ADD MATCH INFO CARD
          </button>
        )}

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: "#0a0a0a",
              border: "1.5px solid oklch(var(--p) / 0.4)",
            }}
          >
            <p className="font-display font-bold text-primary text-sm tracking-widest uppercase">
              {editingId ? "EDIT MATCH INFO" : "NEW MATCH INFO CARD"}
            </p>

            <div className="space-y-2">
              <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                Tournament Name
              </p>
              <input
                data-ocid="match_info.tournament_name.input"
                type="text"
                placeholder="e.g. City Champions Trophy"
                value={form.tournamentName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tournamentName: e.target.value }))
                }
                className="w-full h-11 rounded-lg px-3 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60"
              />
            </div>

            <div className="space-y-2">
              <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                Match Title
              </p>
              <input
                data-ocid="match_info.match_title.input"
                type="text"
                placeholder="e.g. Semi-Final: Lions vs Tigers"
                value={form.matchTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, matchTitle: e.target.value }))
                }
                className="w-full h-11 rounded-lg px-3 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60"
              />
            </div>

            <div className="space-y-2">
              <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                Cover Photo
              </p>
              <label
                data-ocid="match_info.cover_photo.upload_button"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-lg font-body text-sm cursor-pointer transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px dashed rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                📷 {form.coverPhoto ? "CHANGE PHOTO" : "UPLOAD COVER PHOTO"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              {form.coverPhoto && (
                <img
                  src={form.coverPhoto}
                  alt="Cover"
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: "160px" }}
                />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                Match Summary
              </p>
              <textarea
                data-ocid="match_info.match_summary.textarea"
                rows={3}
                placeholder="Brief highlights, e.g. Ali's 50 led the way..."
                value={form.matchSummary}
                onChange={(e) =>
                  setForm((p) => ({ ...p, matchSummary: e.target.value }))
                }
                className="w-full rounded-lg px-3 py-2 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60 resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                Top Performer
              </p>
              <input
                data-ocid="match_info.top_performer.input"
                type="text"
                placeholder="Auto-filled from last match MOTM"
                value={form.topPerformer}
                onChange={(e) =>
                  setForm((p) => ({ ...p, topPerformer: e.target.value }))
                }
                className="w-full h-11 rounded-lg px-3 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60"
              />
            </div>

            <div className="space-y-2">
              <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                Location / Ground
              </p>
              <input
                data-ocid="match_info.location.input"
                type="text"
                placeholder="Name of the cricket ground"
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                className="w-full h-11 rounded-lg px-3 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                  Status
                </p>
                <select
                  data-ocid="match_info.status.select"
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value as MatchInfoCard["status"],
                    }))
                  }
                  className="w-full h-11 rounded-lg px-3 font-body text-sm text-white border border-white/20 outline-none cursor-pointer"
                  style={{ background: "#0d0d0d" }}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-white/50 font-body text-xs uppercase tracking-wider">
                  Date
                </p>
                <input
                  data-ocid="match_info.date.input"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  className="w-full h-11 rounded-lg px-3 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                data-ocid="match_info.save.submit_button"
                onClick={handleSave}
                className="flex-1 h-11 rounded-xl font-display font-bold text-sm text-black cursor-pointer"
                style={{
                  background: "oklch(var(--p))",
                  boxShadow: "0 0 16px rgba(250,255,0,0.3)",
                }}
              >
                SAVE CARD
              </button>
              <button
                type="button"
                data-ocid="match_info.cancel.cancel_button"
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl font-body font-semibold text-sm text-white/70 cursor-pointer border border-white/20 bg-transparent"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}

        {cards.length === 0 && !showForm && (
          <div
            data-ocid="match_info.empty_state"
            className="text-center py-16 text-white/30 font-body text-sm"
          >
            <p className="text-4xl mb-4">🏏</p>
            <p className="uppercase tracking-widest">No match info cards yet</p>
            {adminUnlocked && (
              <p className="mt-2 text-xs">Tap "+ ADD MATCH INFO CARD" above</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {cards.map((card, i) => {
            const sc = statusColor(card.status);
            return (
              <motion.div
                key={card.id}
                id={`match-card-${card.id}`}
                data-ocid={`match_info.item.${i + 1}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "#0a0a0a",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                }}
              >
                {card.coverPhoto && (
                  <img
                    src={card.coverPhoto}
                    alt={card.matchTitle}
                    className="w-full object-cover"
                    style={{ maxHeight: "200px" }}
                  />
                )}
                <div className="p-4 space-y-3">
                  {/* Status + Date row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      className="text-xs font-display font-bold tracking-widest px-3 py-1 rounded-full"
                      style={{
                        background: sc.bg,
                        color: sc.text,
                        border: `1px solid ${sc.border}`,
                      }}
                    >
                      {card.status === "Live"
                        ? "🔴 LIVE"
                        : card.status.toUpperCase()}
                    </span>
                    {card.date && (
                      <span className="text-xs font-body text-white/40">
                        📅 {card.date}
                      </span>
                    )}
                  </div>

                  {card.tournamentName && (
                    <p className="text-primary/70 font-display text-xs tracking-[0.2em] uppercase">
                      {card.tournamentName}
                    </p>
                  )}

                  <h3 className="font-display font-bold text-white text-lg leading-tight">
                    {card.matchTitle || "Untitled Match"}
                  </h3>

                  {card.location && (
                    <p className="text-white/50 font-body text-sm flex items-center gap-1">
                      📍 {card.location}
                    </p>
                  )}

                  {card.topPerformer && (
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(250,255,0,0.06)",
                        border: "1px solid rgba(250,255,0,0.15)",
                      }}
                    >
                      <span className="text-base">🏆</span>
                      <div>
                        <p className="text-white/40 font-body text-[10px] uppercase tracking-widest">
                          Top Performer
                        </p>
                        <p className="text-primary font-body font-semibold text-sm">
                          {card.topPerformer}
                        </p>
                      </div>
                    </div>
                  )}

                  {card.matchSummary && (
                    <p className="text-white/60 font-body text-sm leading-relaxed border-t border-white/10 pt-3">
                      {card.matchSummary}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      data-ocid="match_info.print.button"
                      onClick={() =>
                        saveAsPdf(`match-card-${card.id}`, "match-card.pdf")
                      }
                      className="flex-1 h-9 rounded-lg font-body font-semibold text-xs text-white/60 cursor-pointer border border-white/20 bg-transparent hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
                    >
                      <Printer size={13} /> PDF
                    </button>
                    <button
                      type="button"
                      data-ocid="match_info.save_png.button"
                      onClick={() =>
                        saveAsPng(`match-card-${card.id}`, "match-card.png")
                      }
                      className="flex-1 h-9 rounded-lg font-body font-semibold text-xs text-primary/80 cursor-pointer border border-primary/30 bg-transparent hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Download size={13} /> PNG
                    </button>
                  </div>

                  {adminUnlocked && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        data-ocid={`match_info.edit_button.${i + 1}`}
                        onClick={() => openEditForm(card)}
                        className="flex-1 h-9 rounded-lg font-body font-semibold text-xs text-primary cursor-pointer border border-primary/30 bg-transparent hover:bg-primary/10 transition-colors"
                      >
                        ✏️ EDIT
                      </button>
                      <button
                        type="button"
                        data-ocid={`match_info.delete_button.${i + 1}`}
                        onClick={() => handleDelete(card.id)}
                        className="flex-1 h-9 rounded-lg font-body font-semibold text-xs text-red-400 cursor-pointer border border-red-400/30 bg-transparent hover:bg-red-400/10 transition-colors"
                      >
                        🗑️ DELETE
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Password Dialog */}
      <Dialog
        open={pwdDialog}
        onOpenChange={(o) => {
          if (!o) setPwdDialog(false);
        }}
      >
        <DialogContent
          className="max-w-sm"
          style={{
            background: "#0d0d0d",
            border: "1.5px solid oklch(var(--p) / 0.4)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-primary tracking-widest uppercase text-sm">
              Admin Access
            </DialogTitle>
          </DialogHeader>
          <input
            data-ocid="match_info.admin_password.input"
            type="password"
            placeholder="Enter admin password"
            value={pwdInput}
            onChange={(e) => {
              setPwdInput(e.target.value);
              setPwdError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitPassword();
            }}
            className="w-full h-11 rounded-lg px-3 font-body text-sm text-white bg-transparent border border-white/20 outline-none focus:border-primary/60"
          />
          {pwdError && (
            <p
              data-ocid="match_info.admin_password.error_state"
              className="text-red-400 font-body text-xs"
            >
              Incorrect password
            </p>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              data-ocid="match_info.admin_password.cancel_button"
              onClick={() => setPwdDialog(false)}
              className="flex-1 h-10 rounded-lg font-body font-semibold text-sm text-white/60 cursor-pointer border border-white/20 bg-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="match_info.admin_password.confirm_button"
              onClick={submitPassword}
              className="flex-1 h-10 rounded-lg font-display font-bold text-sm text-black cursor-pointer"
              style={{ background: "oklch(var(--p))" }}
            >
              UNLOCK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

// ─── IMAGE EXPORT UTILITIES ──────────────────────────────────
// Uses html-to-image (npm) with dom-to-image-more CDN fallback

const _CAPTURE_OPTIONS = {
  cacheBust: true,
  backgroundColor: "#ffffff",
  pixelRatio: 2,
  filter: (node: Node) => (node as HTMLElement).tagName !== "IFRAME",
} as const;

// Convert dataURL to Blob reliably
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Primary: html-to-image (npm), Fallback: dom-to-image-more (CDN)
async function captureElementToPng(el: HTMLElement): Promise<string | null> {
  // Wait for full render
  await new Promise((r) => setTimeout(r, 400));

  // Attempt 1: html-to-image (not bundled, skip to CDN fallback)

  // Attempt 2: dom-to-image-more via CDN
  try {
    if (!(window as any).domtoimage) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/dom-to-image-more/3.1.6/dom-to-image-more.min.js";
        s.onload = () => resolve();
        s.onerror = () =>
          reject(new Error("dom-to-image-more CDN load failed"));
        document.head.appendChild(s);
      });
    }
    const dti = (window as any).domtoimage;
    const dataUrl = await dti.toPng(el, {
      bgcolor: "#ffffff",
      scale: 2,
    });
    if (dataUrl && dataUrl.length > 1000) return dataUrl;
  } catch (e2) {
    console.warn("dom-to-image-more failed:", e2);
  }

  return null;
}

// Generate PNG dataUrl without downloading (for share/modal)
async function generateScorecardImage(
  elementId: string,
): Promise<string | null> {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error("generateScorecardImage: element not found:", elementId);
    return null;
  }
  try {
    return await captureElementToPng(el);
  } catch (e) {
    console.error("generateScorecardImage failed:", e);
    return null;
  }
}

async function saveAsPng(
  elementId: string,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<string | null> {
  onStart?.();
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      alert(
        "Scorecard not found. Please scroll to the scorecard and try again.",
      );
      onEnd?.();
      return null;
    }

    let dataUrl: string | null = null;

    // First attempt
    try {
      dataUrl = await captureElementToPng(el);
    } catch (e) {
      console.warn("PNG capture attempt 1 failed:", e);
    }

    // Retry once after 500ms if first failed
    if (!dataUrl) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        dataUrl = await captureElementToPng(el);
      } catch (e) {
        console.warn("PNG capture attempt 2 failed:", e);
      }
    }

    if (!dataUrl) {
      // Final fallback: window.print()
      console.error("PNG generation failed, triggering print fallback");
      window.print();
      onEnd?.();
      return null;
    }

    // Use Blob + createObjectURL for reliable mobile download
    const blob = dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    onEnd?.();
    return dataUrl;
  } catch (e) {
    console.error("PNG save failed:", e);
    window.print();
    onEnd?.();
    return null;
  }
}

async function saveAsPdf(
  elementId: string,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void,
) {
  onStart?.();
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      alert(
        "Scorecard not found. Please scroll to the scorecard and try again.",
      );
      onEnd?.();
      return;
    }

    // Step 1: Generate PNG first
    let dataUrl: string | null = null;
    try {
      dataUrl = await captureElementToPng(el);
    } catch (e) {
      console.warn("PDF PNG capture attempt 1 failed:", e);
    }

    // Retry once
    if (!dataUrl) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        dataUrl = await captureElementToPng(el);
      } catch (e) {
        console.warn("PDF PNG capture attempt 2 failed:", e);
      }
    }

    if (!dataUrl) {
      console.error("PDF: PNG generation failed, triggering print fallback");
      window.print();
      onEnd?.();
      return;
    }

    // Step 2: Convert PNG to PDF using jsPDF
    if (!(window as any).jspdf) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("jsPDF load failed"));
        document.head.appendChild(s);
      });
    }
    const { jsPDF: JSPDF } = (window as any).jspdf;
    const pdf = new JSPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Calculate image dimensions to fit A4 without cropping
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = dataUrl as string;
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const imgW = img.width * ratio;
    const imgH = img.height * ratio;
    const xOffset = (pageW - imgW) / 2;
    const yOffset = (pageH - imgH) / 2;

    pdf.addImage(dataUrl, "PNG", xOffset, yOffset, imgW, imgH);

    // Save using Blob for reliable mobile download
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.download = `${filename}.pdf`;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    onEnd?.();
  } catch (e) {
    console.error("PDF save failed:", e);
    window.print();
    onEnd?.();
  }
}

// ──────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: CcbUser) => void }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState("");

  function handleSubmit() {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!phone.trim() || !/^[0-9+\-\s]{7,15}$/.test(phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    const user: CcbUser = { name: name.trim(), phone: phone.trim() };
    try {
      localStorage.setItem("ccb_user", JSON.stringify(user));
    } catch {}
    onLogin(user);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
      style={{
        background:
          "linear-gradient(160deg,#000000 0%,#001a0a 60%,#000d1a 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/uploads/file_000000003a687208b1003ca9aabc1805-Picsart-BackgroundRemover-1.png"
            alt="CCB"
            className="w-20 h-20 object-contain mb-4"
            style={{ filter: "drop-shadow(0 0 16px #00ff88)" }}
          />
          <h1 className="font-display font-bold text-primary text-2xl tracking-widest uppercase">
            CCB SCORING PRO
          </h1>
          <p className="text-white/50 font-body text-sm mt-1">
            Welcome — please sign in to continue
          </p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(0,255,136,0.05)",
            border: "1px solid rgba(0,255,136,0.2)",
          }}
        >
          <div>
            <label
              htmlFor="login-name"
              className="block text-white/70 text-xs font-body font-semibold mb-1.5 uppercase tracking-wider"
            >
              Your Name
            </label>
            <input
              id="login-name"
              data-ocid="login.name.input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your full name"
              className="w-full bg-black/40 border border-primary/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/60 font-body"
            />
          </div>
          <div>
            <label
              htmlFor="login-phone"
              className="block text-white/70 text-xs font-body font-semibold mb-1.5 uppercase tracking-wider"
            >
              Phone Number
            </label>
            <input
              id="login-phone"
              data-ocid="login.phone.input"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="03XX-XXXXXXX"
              className="w-full bg-black/40 border border-primary/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/60 font-body"
            />
          </div>
          {error && (
            <p data-ocid="login.error_state" className="text-red-400 text-xs">
              {error}
            </p>
          )}
          <motion.button
            type="button"
            data-ocid="login.submit_button"
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl font-display font-bold text-black text-base tracking-wider cursor-pointer border-0"
            style={{
              background: "linear-gradient(135deg,#00e676,#00b248)",
              boxShadow: "0 4px 20px rgba(0,230,118,0.4)",
            }}
          >
            ENTER APP 🏏
          </motion.button>
        </div>
        <p className="text-white/30 text-xs text-center mt-4 font-body">
          Your data is stored on this device only
        </p>
      </div>
    </motion.div>
  );
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <img
        src="/assets/uploads/file_000000003a687208b1003ca9aabc1805-Picsart-BackgroundRemover-1.png"
        alt="CCB SCORING PRO"
        className="w-28 h-28 object-contain select-none"
        style={{ filter: "drop-shadow(0 0 20px #FACC15)" }}
      />
      <h1 className="font-display font-bold text-white text-3xl tracking-[0.25em] uppercase text-center">
        CCB SCORING PRO
      </h1>
      <p className="text-white/70 font-body text-base tracking-widest text-center">
        Cholistan Cricket Board
      </p>
      <div className="mt-4 w-10 h-10 rounded-full border-4 border-yellow-400/30 border-t-yellow-400 animate-spin" />
      <p className="absolute bottom-6 text-white/40 font-body text-xs tracking-wider">
        Powered by Shehzad Graphics
      </p>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// FIXED SCHEDULE VIEW
// ──────────────────────────────────────────────────────────────

interface FixedScheduleViewProps {
  teams: Team[];
  myTeams?: MyTeam[];
  isAdmin?: boolean;
  onHome: () => void;
}

// ─── FIXED SCHEDULE MATCH TYPE ───────────────────────────────
interface FixedScheduleMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  time?: string;
  date?: string;
  isManual?: boolean;
}

const FIXED_5_PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
  [4, 0],
  [1, 2],
  [3, 4],
  [0, 2],
  [1, 4],
  [3, 0],
  [2, 4],
  [1, 3],
];

const DEFAULT_TIMES = [
  "8:30 PM",
  "9:15 PM",
  "10:00 PM",
  "10:45 PM",
  "11:30 PM",
  "12:10 AM",
  "12:50 AM",
  "1:30 AM",
  "2:10 AM",
  "2:50 AM",
];

const FS_STORAGE_KEY = "ccb_fixed_schedule_v2";
const FS_TEAM_ORDER_KEY = "ccb_fixed_schedule_team_order";

function loadFixedSchedule(defaultTeamIds: string[]): {
  matches: FixedScheduleMatch[];
  teamOrder: string[];
} {
  try {
    const raw = localStorage.getItem(FS_STORAGE_KEY);
    const orderRaw = localStorage.getItem(FS_TEAM_ORDER_KEY);
    const teamOrder: string[] = orderRaw
      ? JSON.parse(orderRaw)
      : defaultTeamIds.slice(0, 5);
    if (raw) {
      const matches = JSON.parse(raw) as FixedScheduleMatch[];
      if (Array.isArray(matches) && matches.length > 0) {
        return { matches, teamOrder };
      }
    }
    // Generate default from team order
    const matches: FixedScheduleMatch[] = FIXED_5_PAIRS.map(([a, b], idx) => ({
      id: `fs_${Date.now()}_${idx}`,
      homeTeamId: teamOrder[a] ?? "",
      awayTeamId: teamOrder[b] ?? "",
      time: DEFAULT_TIMES[idx],
      isManual: false,
    }));
    return { matches, teamOrder };
  } catch {
    return { matches: [], teamOrder: defaultTeamIds.slice(0, 5) };
  }
}

function saveFixedSchedule(matches: FixedScheduleMatch[], teamOrder: string[]) {
  try {
    localStorage.setItem(FS_STORAGE_KEY, JSON.stringify(matches));
    localStorage.setItem(FS_TEAM_ORDER_KEY, JSON.stringify(teamOrder));
    // Backup
    const backup = localStorage.getItem("ccb_backup");
    let backupObj: Record<string, unknown> = {};
    try {
      backupObj = backup ? JSON.parse(backup) : {};
    } catch {}
    backupObj[FS_STORAGE_KEY] = matches;
    localStorage.setItem("ccb_backup", JSON.stringify(backupObj));
  } catch {}
}

function FixedScheduleView({
  teams,
  myTeams = [],
  isAdmin = false,
  onHome,
}: FixedScheduleViewProps) {
  const allTeams = React.useMemo(
    () => [
      ...teams,
      ...myTeams.map((mt) => ({
        id: mt.id,
        name: mt.name,
        players: mt.players,
      })),
    ],
    [teams, myTeams],
  );

  const defaultTeamIds = React.useMemo(
    () => teams.slice(0, 5).map((t) => t.id),
    [teams],
  );

  const [{ matches, teamOrder }, setState] = useState(() =>
    loadFixedSchedule(defaultTeamIds),
  );
  const [editMode, setEditMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addHome, setAddHome] = useState("");
  const [addAway, setAddAway] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addDate, setAddDate] = useState("");
  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const [editHome, setEditHome] = useState("");
  const [editAway, setEditAway] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDate, setEditDate] = useState("");

  function persist(newMatches: FixedScheduleMatch[], newOrder: string[]) {
    setState({ matches: newMatches, teamOrder: newOrder });
    saveFixedSchedule(newMatches, newOrder);
  }

  function teamName(id: string) {
    return allTeams.find((t) => t.id === id)?.name ?? id ?? "TBD";
  }

  function moveMatch(idx: number, dir: "up" | "down") {
    const m = [...matches];
    if (dir === "up" && idx > 0) {
      [m[idx - 1], m[idx]] = [
        { ...m[idx], isManual: true },
        { ...m[idx - 1], isManual: true },
      ];
    } else if (dir === "down" && idx < m.length - 1) {
      [m[idx], m[idx + 1]] = [
        { ...m[idx + 1], isManual: true },
        { ...m[idx], isManual: true },
      ];
    }
    persist(m, teamOrder);
  }

  function swapTeams(matchId: string) {
    persist(
      matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              homeTeamId: m.awayTeamId,
              awayTeamId: m.homeTeamId,
              isManual: true,
            }
          : m,
      ),
      teamOrder,
    );
  }

  function deleteMatch(matchId: string) {
    persist(
      matches.filter((m) => m.id !== matchId),
      teamOrder,
    );
  }

  function openEdit(m: FixedScheduleMatch) {
    setEditMatchId(m.id);
    setEditHome(m.homeTeamId);
    setEditAway(m.awayTeamId);
    setEditTime(m.time ?? "");
    setEditDate(m.date ?? "");
  }

  function saveEdit() {
    if (!editMatchId) return;
    persist(
      matches.map((m) =>
        m.id === editMatchId
          ? {
              ...m,
              homeTeamId: editHome,
              awayTeamId: editAway,
              time: editTime,
              date: editDate,
              isManual: true,
            }
          : m,
      ),
      teamOrder,
    );
    setEditMatchId(null);
  }

  function addMatch() {
    if (!addHome || !addAway || addHome === addAway) return;
    const newMatch: FixedScheduleMatch = {
      id: `fs_add_${Date.now()}`,
      homeTeamId: addHome,
      awayTeamId: addAway,
      time: addTime || undefined,
      date: addDate || undefined,
      isManual: true,
    };
    persist([...matches, newMatch], teamOrder);
    setAddHome("");
    setAddAway("");
    setAddTime("");
    setAddDate("");
    setShowAddDialog(false);
  }

  function regenerateSchedule() {
    // Only regenerate non-manual matches; keep manual ones
    const manualMatches = matches.filter((m) => m.isManual);
    const newAuto: FixedScheduleMatch[] = FIXED_5_PAIRS.map(([a, b], idx) => ({
      id: `fs_regen_${Date.now()}_${idx}`,
      homeTeamId: teamOrder[a] ?? "",
      awayTeamId: teamOrder[b] ?? "",
      time: DEFAULT_TIMES[idx],
      isManual: false,
    }));
    // Merge: keep manual, replace auto
    const merged = newAuto.map((autoM) => {
      const existing = manualMatches.find(
        (mm) =>
          mm.homeTeamId === autoM.homeTeamId &&
          mm.awayTeamId === autoM.awayTeamId,
      );
      return existing ?? autoM;
    });
    persist(merged, teamOrder);
  }

  return (
    <motion.div
      key="fixed-schedule"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #0d1f0d 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 text-yellow-300 font-bold"
        >
          <Home className="w-5 h-5" /> HOME
        </button>
        <span className="text-white font-bold text-lg tracking-wide">
          FIXED SCHEDULE
        </span>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition-all"
              style={{
                background: editMode ? "rgba(0,230,118,0.15)" : "transparent",
                borderColor: editMode ? "#00e676" : "rgba(255,255,255,0.2)",
                color: editMode ? "#00e676" : "rgba(255,255,255,0.6)",
              }}
            >
              ⚙️ {editMode ? "Exit Edit" : "Edit Mode"}
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode Banner */}
      {editMode && isAdmin && (
        <div
          className="mx-4 mt-3 rounded-xl px-4 py-2 flex items-center justify-between gap-2"
          style={{
            background: "rgba(0,230,118,0.08)",
            border: "1px solid rgba(0,230,118,0.3)",
          }}
        >
          <span className="text-xs font-semibold" style={{ color: "#00e676" }}>
            ✏️ Edit Mode Active — tap controls on each match
          </span>
          <button
            type="button"
            onClick={regenerateSchedule}
            className="text-xs px-2 py-1 rounded border cursor-pointer"
            style={{
              borderColor: "rgba(255,200,0,0.4)",
              color: "#ffd700",
              background: "rgba(255,200,0,0.08)",
            }}
            title="Regenerate auto matches (keeps manual)"
          >
            🔄 Regenerate
          </button>
        </div>
      )}

      {/* Schedule List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20">
        <div className="text-center mb-4">
          <p className="text-yellow-300 text-sm font-semibold">
            CCB Tournament · Night Matches
          </p>
          <p className="text-white/50 text-xs mt-1">
            First 5 matches: 45 min gap · Last 5 matches: 40 min gap
          </p>
        </div>

        {matches.length === 0 && (
          <div className="text-center py-10">
            <p className="text-white/40 text-sm">
              No matches. {isAdmin ? "Add a match or regenerate." : ""}
            </p>
          </div>
        )}

        {matches.map((match, idx) => (
          <div
            key={match.id}
            data-ocid={`fixed_schedule.item.${idx + 1}`}
            className="rounded-2xl border p-4"
            style={{
              background:
                idx < 5
                  ? "linear-gradient(135deg, rgba(250,255,0,0.06) 0%, rgba(0,0,0,0.3) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%)",
              borderColor: match.isManual
                ? "rgba(255,165,0,0.4)"
                : "rgba(255,255,255,0.1)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-yellow-400 font-black text-lg leading-none">
                  #{idx + 1}
                </span>
                {match.isManual && (
                  <span className="text-xs mt-0.5" style={{ color: "#ffa500" }}>
                    Manual
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm truncate">
                  {teamName(match.homeTeamId)}
                </div>
                <div className="text-yellow-400 text-xs font-semibold my-0.5">
                  VS
                </div>
                <div className="text-white font-bold text-sm truncate">
                  {teamName(match.awayTeamId)}
                </div>
              </div>
              <div className="text-right shrink-0">
                {match.date && (
                  <div className="text-white/50 text-xs">{match.date}</div>
                )}
                <span className="text-yellow-300 font-bold text-sm">
                  {match.time || "TBD"}
                </span>
                <div className="text-white/40 text-xs mt-1">
                  {idx < 5 ? "+45 min" : "+40 min"}
                </div>
              </div>
            </div>

            {/* Admin Edit Controls */}
            {editMode && isAdmin && (
              <div
                className="flex flex-wrap gap-2 mt-3 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  type="button"
                  onClick={() => openEdit(match)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border cursor-pointer"
                  style={{
                    borderColor: "rgba(0,200,255,0.4)",
                    color: "#00cfff",
                    background: "rgba(0,200,255,0.07)",
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => swapTeams(match.id)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border cursor-pointer"
                  style={{
                    borderColor: "rgba(100,100,255,0.4)",
                    color: "#aaa8ff",
                    background: "rgba(100,100,255,0.07)",
                  }}
                >
                  ⇄ Swap
                </button>
                <button
                  type="button"
                  onClick={() => moveMatch(idx, "up")}
                  disabled={idx === 0}
                  className="text-xs px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-30"
                  style={{
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)",
                    background: "transparent",
                  }}
                >
                  ⬆
                </button>
                <button
                  type="button"
                  onClick={() => moveMatch(idx, "down")}
                  disabled={idx === matches.length - 1}
                  className="text-xs px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-30"
                  style={{
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)",
                    background: "transparent",
                  }}
                >
                  ⬇
                </button>
                <button
                  type="button"
                  onClick={() => deleteMatch(match.id)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border cursor-pointer"
                  style={{
                    borderColor: "rgba(239,68,68,0.4)",
                    color: "#f87171",
                    background: "rgba(239,68,68,0.07)",
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Match Button */}
        {editMode && isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="w-full py-3 rounded-xl border font-bold text-sm cursor-pointer transition-all"
            style={{
              borderColor: "rgba(0,230,118,0.4)",
              color: "#00e676",
              background: "rgba(0,230,118,0.06)",
              borderStyle: "dashed",
            }}
          >
            + Add Match
          </button>
        )}
      </div>

      {/* Edit Match Dialog */}
      {editMatchId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 space-y-4"
            style={{
              background: "#0d1a0e",
              border: "1px solid rgba(0,230,118,0.2)",
            }}
          >
            <h3 className="text-white font-bold text-lg">✏️ Edit Match</h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="edit-home-team"
                  className="text-xs text-white/60 block mb-1"
                >
                  Home Team
                </label>
                <select
                  id="edit-home-team"
                  value={editHome}
                  onChange={(e) => setEditHome(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                  style={{
                    background: "#0a1a0f",
                    borderColor: "rgba(0,230,118,0.25)",
                  }}
                >
                  <option value="">Select team...</option>
                  <optgroup label="Default Teams">
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  {myTeams.length > 0 && (
                    <optgroup label="My Teams">
                      {myTeams.map((mt) => (
                        <option key={mt.id} value={mt.id}>
                          {mt.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label
                  htmlFor="edit-away-team"
                  className="text-xs text-white/60 block mb-1"
                >
                  Away Team
                </label>
                <select
                  id="edit-away-team"
                  value={editAway}
                  onChange={(e) => setEditAway(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                  style={{
                    background: "#0a1a0f",
                    borderColor: "rgba(0,230,118,0.25)",
                  }}
                >
                  <option value="">Select team...</option>
                  <optgroup label="Default Teams">
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  {myTeams.length > 0 && (
                    <optgroup label="My Teams">
                      {myTeams.map((mt) => (
                        <option key={mt.id} value={mt.id}>
                          {mt.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-date"
                    className="text-xs text-white/60 block mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                    style={{
                      background: "#0a1a0f",
                      borderColor: "rgba(0,230,118,0.25)",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-time"
                    className="text-xs text-white/60 block mb-1"
                  >
                    Time
                  </label>
                  <input
                    id="edit-time"
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="e.g. 8:30 PM"
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                    style={{
                      background: "#0a1a0f",
                      borderColor: "rgba(0,230,118,0.25)",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditMatchId(null)}
                className="flex-1 py-2.5 rounded-xl border font-semibold text-sm cursor-pointer"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.6)",
                  background: "transparent",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer text-black"
                style={{
                  background: "linear-gradient(135deg, #00e676, #00b248)",
                }}
              >
                Save Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Dialog */}
      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 space-y-4"
            style={{
              background: "#0d1a0e",
              border: "1px solid rgba(0,230,118,0.2)",
            }}
          >
            <h3 className="text-white font-bold text-lg">+ Add Match</h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="add-home-team"
                  className="text-xs text-white/60 block mb-1"
                >
                  Team A (Home)
                </label>
                <select
                  id="add-home-team"
                  value={addHome}
                  onChange={(e) => setAddHome(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                  style={{
                    background: "#0a1a0f",
                    borderColor: "rgba(0,230,118,0.25)",
                  }}
                >
                  <option value="">Select team...</option>
                  <optgroup label="Default Teams">
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  {myTeams.length > 0 && (
                    <optgroup label="My Teams">
                      {myTeams.map((mt) => (
                        <option key={mt.id} value={mt.id}>
                          {mt.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label
                  htmlFor="add-away-team"
                  className="text-xs text-white/60 block mb-1"
                >
                  Team B (Away)
                </label>
                <select
                  id="add-away-team"
                  value={addAway}
                  onChange={(e) => setAddAway(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                  style={{
                    background: "#0a1a0f",
                    borderColor: "rgba(0,230,118,0.25)",
                  }}
                >
                  <option value="">Select team...</option>
                  <optgroup label="Default Teams">
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  {myTeams.length > 0 && (
                    <optgroup label="My Teams">
                      {myTeams.map((mt) => (
                        <option key={mt.id} value={mt.id}>
                          {mt.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="add-date"
                    className="text-xs text-white/60 block mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="add-date"
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                    style={{
                      background: "#0a1a0f",
                      borderColor: "rgba(0,230,118,0.25)",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-time"
                    className="text-xs text-white/60 block mb-1"
                  >
                    Time
                  </label>
                  <input
                    id="add-time"
                    type="text"
                    value={addTime}
                    onChange={(e) => setAddTime(e.target.value)}
                    placeholder="e.g. 8:30 PM"
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm border outline-none"
                    style={{
                      background: "#0a1a0f",
                      borderColor: "rgba(0,230,118,0.25)",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="flex-1 py-2.5 rounded-xl border font-semibold text-sm cursor-pointer"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.6)",
                  background: "transparent",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addMatch}
                disabled={!addHome || !addAway || addHome === addAway}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer text-black disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #00e676, #00b248)",
                }}
              >
                Add Match
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// ANNOUNCEMENTS VIEW
// ──────────────────────────────────────────────────────────────

interface AnnouncementsViewProps {
  onHome: () => void;
}

function AnnouncementsView({ onHome }: AnnouncementsViewProps) {
  return (
    <motion.div
      key="announcements"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #0d1f0d 100%)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 text-yellow-300 font-bold"
        >
          <Home className="w-5 h-5" /> HOME
        </button>
        <span className="text-white font-bold text-lg tracking-wide">
          ANNOUNCEMENTS
        </span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <AnnouncementSection />
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// LIVE MATCH VIEW
// ──────────────────────────────────────────────────────────────
interface LiveMatchData {
  teamA: string;
  teamB: string;
  totalRuns: number;
  wickets: number;
  balls: number;
  totalOvers: number;
  strikerName: string;
  strikerRuns: number;
  strikerBalls: number;
  nonStrikerName: string;
  nonStrikerRuns: number;
  bowlerName: string;
  target?: number;
  isComplete: boolean;
  inningsNum: number;
  timestamp: number;
}

function LiveMatchView({ onBack }: { onBack: () => void }) {
  const [liveData, setLiveData] = useState<LiveMatchData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    function readLiveData() {
      try {
        const raw = localStorage.getItem("ccb_live_match");
        if (raw) {
          const parsed = JSON.parse(raw) as LiveMatchData;
          setLiveData(parsed);
          setLastUpdated(new Date());
        }
      } catch {}
    }
    readLiveData();
    const interval = setInterval(readLiveData, 1000);
    return () => clearInterval(interval);
  }, []);

  function formatOversDisplay(balls: number, totalOvers: number) {
    const ov = Math.floor(balls / 6);
    const b = balls % 6;
    return `${ov}.${b} / ${totalOvers}`;
  }

  const isStale = liveData ? Date.now() - liveData.timestamp > 30000 : false;

  return (
    <Page
      key="live-match"
      style={{
        background:
          "linear-gradient(160deg, #000000 0%, #1a0000 60%, #0d0000 100%)",
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-8 pb-4">
        <button
          type="button"
          data-ocid="live_match.back.button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/20 text-white/70 hover:text-white cursor-pointer transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <Home size={18} />
        </button>
        <div className="flex-1 text-center">
          <h2
            className="font-display font-bold text-white text-xl tracking-widest uppercase"
            style={{ textShadow: "0 0 20px rgba(239,68,68,0.5)" }}
          >
            LIVE MATCH
          </h2>
        </div>
        {/* Pulse indicator */}
        {liveData && !liveData.isComplete && !isStale && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center gap-5 px-4 pb-8">
        {!liveData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-ocid="live_match.empty_state"
            className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "2px dashed rgba(239,68,68,0.3)",
              }}
            >
              <Wifi size={36} className="text-red-400/50" />
            </div>
            <p className="text-white/50 font-body text-base font-semibold tracking-wide">
              No Active Match
            </p>
            <p className="text-white/30 font-body text-sm max-w-xs">
              Start a match from the home screen to see live scores here.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm flex flex-col gap-4"
          >
            {/* Status Badge */}
            <div className="flex justify-center">
              {liveData.isComplete ? (
                <span
                  data-ocid="live_match.success_state"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase"
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.4)",
                    color: "#4ade80",
                  }}
                >
                  ✓ COMPLETED
                </span>
              ) : isStale ? (
                <span
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase"
                  style={{
                    background: "rgba(156,163,175,0.15)",
                    border: "1px solid rgba(156,163,175,0.3)",
                    color: "#9ca3af",
                  }}
                >
                  ⏸ PAUSED
                </span>
              ) : (
                <span
                  data-ocid="live_match.loading_state"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase animate-pulse"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    color: "#f87171",
                  }}
                >
                  ● LIVE
                </span>
              )}
            </div>

            {/* Match Title / Teams */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(0,0,0,0.5) 100%)",
                border: "1px solid rgba(239,68,68,0.25)",
                boxShadow: "0 0 24px rgba(239,68,68,0.15)",
              }}
            >
              <p className="text-xs font-body tracking-widest uppercase text-white/40 mb-2">
                {liveData.inningsNum === 1 ? "1st Innings" : "2nd Innings"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-display font-bold text-white text-lg tracking-wide">
                  {liveData.teamA}
                </span>
                <span className="text-white/40 font-body font-semibold text-sm">
                  vs
                </span>
                <span className="font-display font-bold text-white/60 text-lg tracking-wide">
                  {liveData.teamB}
                </span>
              </div>
            </div>

            {/* Main Scoreboard */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #0a0a0a 0%, #1a0500 100%)",
                border: "1.5px solid rgba(239,68,68,0.3)",
                boxShadow:
                  "0 0 30px rgba(239,68,68,0.2), 0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {/* Big Score */}
              <div
                className="font-display font-black text-6xl tracking-tight leading-none"
                style={{
                  color: "#faff00",
                  textShadow: "0 0 40px rgba(250,255,0,0.4)",
                }}
              >
                {liveData.totalRuns}
                <span
                  className="text-red-400"
                  style={{ textShadow: "0 0 20px rgba(239,68,68,0.5)" }}
                >
                  /{liveData.wickets}
                </span>
              </div>

              {/* Overs */}
              <p className="text-white/60 font-body text-base tracking-wide">
                {formatOversDisplay(liveData.balls, liveData.totalOvers)} overs
              </p>

              {/* Target (2nd innings) */}
              {liveData.target !== undefined && (
                <div
                  className="mt-1 px-4 py-2 rounded-lg text-center"
                  style={{
                    background: "rgba(250,255,0,0.08)",
                    border: "1px solid rgba(250,255,0,0.2)",
                  }}
                >
                  {liveData.totalRuns >= liveData.target ? (
                    <p className="text-green-400 font-body font-bold text-sm">
                      🎯 Target Reached!
                    </p>
                  ) : (
                    <p className="text-yellow-300 font-body font-semibold text-sm">
                      🎯 Target: {liveData.target} | Need:{" "}
                      <strong>{liveData.target - liveData.totalRuns}</strong>{" "}
                      runs
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Batsmen & Bowler */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {/* Batsmen */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-xs tracking-widest uppercase text-white/40 font-body mb-2">
                  Batting
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-300 text-xs font-bold">
                        ★
                      </span>
                      <span className="text-white font-body font-semibold text-sm">
                        {liveData.strikerName || "—"}
                      </span>
                    </div>
                    <span className="font-display font-bold text-yellow-300 text-sm">
                      {liveData.strikerRuns}
                      <span className="text-white/40 font-body font-normal text-xs">
                        {" "}
                        ({liveData.strikerBalls})
                      </span>
                    </span>
                  </div>
                  {liveData.nonStrikerName && (
                    <div className="flex items-center justify-between">
                      <span className="text-lime-400 font-body text-sm pl-4">
                        {liveData.nonStrikerName}
                      </span>
                      <span className="font-display font-semibold text-lime-300 text-sm">
                        {liveData.nonStrikerRuns}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bowler */}
              <div className="px-4 py-3">
                <p className="text-xs tracking-widest uppercase text-white/40 font-body mb-1.5">
                  Bowling
                </p>
                <p className="text-white/80 font-body font-semibold text-sm">
                  {liveData.bowlerName || "—"}
                </p>
              </div>
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <p className="text-center text-white/25 font-body text-xs">
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-PK", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
          </motion.div>
        )}
      </main>
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────
// POST & VOTE VIEW
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// POST & VOTE VIEW
// ──────────────────────────────────────────────────────────────

function PostVoteView({
  onHome,
  teams,
}: { onHome: () => void; teams: Team[] }) {
  const [predTeamA, setPredTeamA] = React.useState<string>(
    () => localStorage.getItem("ccb_pred_teamA") || "Team A",
  );
  const [predTeamB, setPredTeamB] = React.useState<string>(
    () => localStorage.getItem("ccb_pred_teamB") || "Team B",
  );
  const [votesA, setVotesA] = React.useState<number>(() =>
    Number(localStorage.getItem("ccb_votes_a") || "0"),
  );
  const [votesB, setVotesB] = React.useState<number>(() =>
    Number(localStorage.getItem("ccb_votes_b") || "0"),
  );
  const [hasVoted, setHasVoted] = React.useState<boolean>(
    () => localStorage.getItem("ccb_has_voted") === "true",
  );
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showAdminLogin, setShowAdminLogin] = React.useState(false);
  const [adminPwdInput, setAdminPwdInput] = React.useState("");
  const [adminPwdError, setAdminPwdError] = React.useState(false);
  const [showTeamSelect, setShowTeamSelect] = React.useState<"A" | "B" | null>(
    null,
  );
  const [editingTeam, setEditingTeam] = React.useState<"A" | "B" | null>(null);
  const [editNameA, setEditNameA] = React.useState(predTeamA);
  const [editNameB, setEditNameB] = React.useState(predTeamB);
  const [postText, setPostText] = React.useState("");
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const totalVotes = votesA + votesB;
  const pctA = totalVotes === 0 ? 50 : Math.round((votesA / totalVotes) * 100);
  const pctB = 100 - pctA;

  function handleVote(team: "A" | "B") {
    if (hasVoted) return;
    const newA = team === "A" ? votesA + 1 : votesA;
    const newB = team === "B" ? votesB + 1 : votesB;
    setVotesA(newA);
    setVotesB(newB);
    setHasVoted(true);
    localStorage.setItem("ccb_votes_a", String(newA));
    localStorage.setItem("ccb_votes_b", String(newB));
    localStorage.setItem("ccb_has_voted", "true");
  }

  function handleAdminLogin() {
    if (adminPwdInput === "Shahzad@99") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPwdInput("");
      setAdminPwdError(false);
    } else {
      setAdminPwdError(true);
    }
  }

  function saveTeamName(team: "A" | "B", name: string) {
    if (team === "A") {
      setPredTeamA(name);
      localStorage.setItem("ccb_pred_teamA", name);
    } else {
      setPredTeamB(name);
      localStorage.setItem("ccb_pred_teamB", name);
    }
    setEditingTeam(null);
    setShowTeamSelect(null);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#1D1E33",
    borderRadius: "25px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
    border: "1px solid rgba(0,230,118,0.3)",
    overflow: "hidden",
    padding: "20px",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: "100dvh",
        background: "#0A0E21",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* AppBar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px",
          background: "transparent",
        }}
      >
        <button
          type="button"
          onClick={onHome}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#00E676",
            padding: "8px",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1
          style={{
            flex: 1,
            textAlign: "center",
            color: "#FFD600",
            fontWeight: "bold",
            fontSize: "18px",
            letterSpacing: "1px",
          }}
        >
          MATCH PREDICTION
        </h1>
        <button
          type="button"
          data-ocid="post_vote.admin_lock.button"
          onClick={() => {
            if (isAdmin) {
              setIsAdmin(false);
            } else {
              setShowAdminLogin(true);
            }
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            fontSize: "22px",
          }}
        >
          {isAdmin ? (
            <span style={{ color: "#00E676" }}>🔓</span>
          ) : (
            <span style={{ color: "#FFD600" }}>🔒</span>
          )}
        </button>
      </div>

      {/* Admin Login Dialog */}
      {showAdminLogin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            data-ocid="post_vote.admin_login.dialog"
            style={{
              background: "#1D1E33",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "320px",
              border: "1px solid rgba(0,230,118,0.3)",
            }}
          >
            <h2
              style={{
                color: "#FFD600",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "20px",
                fontSize: "16px",
              }}
            >
              ADMIN LOGIN
            </h2>
            <input
              type="password"
              value={adminPwdInput}
              onChange={(e) => {
                setAdminPwdInput(e.target.value);
                setAdminPwdError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              placeholder="Enter admin password"
              data-ocid="post_vote.admin_password.input"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.07)",
                border: adminPwdError
                  ? "1.5px solid #ff4444"
                  : "1.5px solid rgba(255,255,255,0.2)",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "white",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "8px",
              }}
            />
            {adminPwdError && (
              <p
                style={{
                  color: "#ff4444",
                  fontSize: "12px",
                  marginBottom: "12px",
                }}
              >
                Wrong password. Try again.
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                data-ocid="post_vote.admin_cancel.button"
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPwdInput("");
                  setAdminPwdError(false);
                }}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "12px",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="post_vote.admin_confirm.button"
                onClick={handleAdminLogin}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "12px",
                  background: "#FFD600",
                  border: "none",
                  color: "black",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                LOGIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Select Modal */}
      {showTeamSelect && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#1D1E33",
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "320px",
              border: "1px solid rgba(255,214,0,0.3)",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2
              style={{
                color: "#FFD600",
                fontWeight: "bold",
                marginBottom: "16px",
                fontSize: "15px",
              }}
            >
              SELECT TEAM {showTeamSelect}
            </h2>
            <div
              style={{
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {teams.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  data-ocid={`post_vote.team_select.item.${i + 1}`}
                  onClick={() => saveTeamName(showTeamSelect!, t.name)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-ocid="post_vote.team_select_cancel.button"
              onClick={() => setShowTeamSelect(null)}
              style={{
                marginTop: "14px",
                padding: "10px",
                borderRadius: "12px",
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Voting Card */}
        <div style={cardStyle}>
          <p
            style={{
              textAlign: "center",
              color: "#FFD600",
              fontWeight: "bold",
              fontSize: "16px",
              marginBottom: "20px",
              letterSpacing: "0.1em",
            }}
          >
            WHO WILL WIN? 🏆
          </p>

          {/* Teams Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {/* Team A */}
            <div style={{ flex: 1, textAlign: "center" }}>
              {editingTeam === "A" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <input
                    type="text"
                    value={editNameA}
                    onChange={(e) => setEditNameA(e.target.value)}
                    onBlur={() => saveTeamName("A", editNameA)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && saveTeamName("A", editNameA)
                    }
                    data-ocid="post_vote.team_a_name.input"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1.5px solid #FFD600",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      color: "white",
                      fontSize: "13px",
                      outline: "none",
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    data-ocid="post_vote.team_a_select.button"
                    onClick={() => setShowTeamSelect("A")}
                    style={{
                      fontSize: "11px",
                      color: "#00E676",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    📋 Select from list
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {predTeamA}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      data-ocid="post_vote.team_a_edit.button"
                      onClick={() => {
                        setEditNameA(predTeamA);
                        setEditingTeam("A");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <Pencil size={14} color="#FFD600" />
                    </button>
                  )}
                </div>
              )}
              <div
                style={{
                  color: "#00E676",
                  fontWeight: "bold",
                  fontSize: "22px",
                  marginTop: "10px",
                }}
              >
                {pctA}%
              </div>
              <button
                type="button"
                data-ocid="post_vote.vote_a.button"
                disabled={hasVoted}
                onClick={() => handleVote("A")}
                style={{
                  marginTop: "10px",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  background: hasVoted ? "rgba(255,214,0,0.25)" : "#FFD600",
                  border: "none",
                  color: "black",
                  fontWeight: "bold",
                  fontSize: "13px",
                  cursor: hasVoted ? "default" : "pointer",
                  opacity: hasVoted ? 0.7 : 1,
                }}
              >
                {hasVoted ? "VOTED ✓" : "VOTE"}
              </button>
            </div>

            {/* VS */}
            <div
              style={{
                color: "white",
                fontWeight: "bold",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              VS
            </div>

            {/* Team B */}
            <div style={{ flex: 1, textAlign: "center" }}>
              {editingTeam === "B" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <input
                    type="text"
                    value={editNameB}
                    onChange={(e) => setEditNameB(e.target.value)}
                    onBlur={() => saveTeamName("B", editNameB)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && saveTeamName("B", editNameB)
                    }
                    data-ocid="post_vote.team_b_name.input"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1.5px solid #FFD600",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      color: "white",
                      fontSize: "13px",
                      outline: "none",
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    data-ocid="post_vote.team_b_select.button"
                    onClick={() => setShowTeamSelect("B")}
                    style={{
                      fontSize: "11px",
                      color: "#00E676",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    📋 Select from list
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {predTeamB}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      data-ocid="post_vote.team_b_edit.button"
                      onClick={() => {
                        setEditNameB(predTeamB);
                        setEditingTeam("B");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <Pencil size={14} color="#FFD600" />
                    </button>
                  )}
                </div>
              )}
              <div
                style={{
                  color: "#00E676",
                  fontWeight: "bold",
                  fontSize: "22px",
                  marginTop: "10px",
                }}
              >
                {pctB}%
              </div>
              <button
                type="button"
                data-ocid="post_vote.vote_b.button"
                disabled={hasVoted}
                onClick={() => handleVote("B")}
                style={{
                  marginTop: "10px",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  background: hasVoted ? "rgba(255,214,0,0.25)" : "#FFD600",
                  border: "none",
                  color: "black",
                  fontWeight: "bold",
                  fontSize: "13px",
                  cursor: hasVoted ? "default" : "pointer",
                  opacity: hasVoted ? 0.7 : 1,
                }}
              >
                {hasVoted ? "VOTED ✓" : "VOTE"}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: "8px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.1)",
              marginBottom: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pctA}%`,
                background: "linear-gradient(90deg, #00E676, #FFD600)",
                borderRadius: "4px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
              marginBottom: "4px",
            }}
          >
            <span>{predTeamA}</span>
            <span>Total Votes: {totalVotes}</span>
            <span>{predTeamB}</span>
          </div>

          {isAdmin && (
            <p
              style={{
                textAlign: "center",
                color: "#00E676",
                fontSize: "11px",
                marginTop: "8px",
                background: "rgba(0,230,118,0.1)",
                padding: "5px 10px",
                borderRadius: "8px",
              }}
            >
              🔓 Admin Mode — tap ✏️ to select teams
            </p>
          )}
        </div>

        {/* Post Card */}
        <div style={cardStyle}>
          <p
            style={{
              color: "#FFD600",
              fontWeight: "bold",
              fontSize: "13px",
              marginBottom: "12px",
              letterSpacing: "0.1em",
            }}
          >
            📢 POST UPDATE
          </p>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "14px",
                color: "#FFD600",
              }}
            >
              <Pencil size={16} />
            </span>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Write your post..."
              rows={3}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: "15px",
                padding: "12px 12px 12px 38px",
                color: "white",
                fontSize: "14px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {imagePreview && (
            <div style={{ marginTop: "8px", position: "relative" }}>
              <img
                src={imagePreview}
                alt="preview"
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  maxHeight: "200px",
                  objectFit: "cover",
                }}
              />
              <button
                onClick={() => setImagePreview(null)}
                type="button"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "50%",
                  color: "white",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
            <button
              type="button"
              data-ocid="post_vote.add_photo.button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#00E676",
                padding: "4px",
              }}
            >
              <Camera size={26} />
            </button>
            <button
              type="button"
              data-ocid="post_vote.post.button"
              onClick={() => {
                setPostText("");
                setImagePreview(null);
              }}
              style={{
                background: "#00E676",
                border: "none",
                borderRadius: "12px",
                padding: "10px 28px",
                color: "black",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              POST
            </button>
          </div>
        </div>

        {/* Download & Share */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <button
            type="button"
            data-ocid="post_vote.download_button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            style={{
              flex: 1,
              height: "56px",
              background:
                "linear-gradient(135deg, #448AFF, rgba(68,138,255,0.7))",
              borderRadius: "20px",
              boxShadow: "0 4px 12px rgba(68,138,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Download size={18} />
            DOWNLOAD
          </button>
          <button
            type="button"
            data-ocid="post_vote.share.button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "CCB SCORING PRO",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            style={{
              flex: 1,
              height: "56px",
              background:
                "linear-gradient(135deg, #FF9100, rgba(255,145,0,0.7))",
              borderRadius: "20px",
              boxShadow: "0 4px 12px rgba(255,145,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Share2 size={18} />
            SHARE
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// BOTTOM NAV
// ──────────────────────────────────────────────────────────────

type Tab = "home" | "teams" | "matches" | "community";

function BottomNav({
  activeTab,
  onTab,
}: {
  activeTab: Tab;
  onTab: (tab: Tab) => void;
}) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "home",
      label: "Home",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5"
          role="img"
          aria-label="Home"
        >
          <title>Home</title>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: "teams",
      label: "Teams",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5"
          role="img"
          aria-label="Teams"
        >
          <title>Teams</title>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "matches",
      label: "Matches",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5"
          role="img"
          aria-label="Matches"
        >
          <title>Matches</title>
          <circle cx="12" cy="12" r="10" />
          <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
        </svg>
      ),
    },
    {
      id: "community",
      label: "Community",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5"
          role="img"
          aria-label="Community"
        >
          <title>Community</title>
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "rgba(8, 14, 8, 0.97)",
        borderTop: "1px solid rgba(0,255,136,0.15)",
        backdropFilter: "blur(10px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "64px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-ocid={`nav.${tab.id}.tab`}
            onClick={() => onTab(tab.id)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer border-0 bg-transparent transition-all duration-200"
            style={{
              color: isActive ? "#00ff88" : "rgba(255,255,255,0.4)",
            }}
          >
            <span
              style={{
                transform: isActive ? "scale(1.15)" : "scale(1)",
                transition: "transform 0.2s",
                filter: isActive ? "drop-shadow(0 0 6px #00ff88)" : "none",
              }}
            >
              {tab.icon}
            </span>
            <span
              className="text-xs font-bold tracking-wide"
              style={{ fontSize: "10px" }}
            >
              {tab.label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// TEAMS TAB VIEW (upgraded player management)
// ──────────────────────────────────────────────────────────────

function TeamsTabView({
  teams,
  myTeams = [],
  isAdminUnlocked,
  onUnlockAdmin,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onAddMyTeamPlayer,
  onEditMyTeamPlayer: _onEditMyTeamPlayer,
  onDeleteMyTeamPlayer,
  onDeleteMyTeam,
  onEditMyTeamName,
  onCreateTeam,
}: {
  teams: Team[];
  myTeams?: MyTeam[];
  isAdminUnlocked: boolean;
  onUnlockAdmin: () => void;
  onAddPlayer: (teamId: string, player: Player) => void;
  onEditPlayer: (teamId: string, player: Player) => void;
  onDeletePlayer: (teamId: string, playerId: string) => void;
  onAddMyTeamPlayer?: (teamId: string, player: Player) => void;
  onEditMyTeamPlayer?: (teamId: string, player: Player) => void;
  onDeleteMyTeamPlayer?: (teamId: string, playerId: string) => void;
  onDeleteMyTeam?: (teamId: string) => void;
  onEditMyTeamName?: (teamId: string, name: string) => void;
  onCreateTeam?: () => void;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<"default" | "mine">(
    "default",
  );
  const [myTeamExpanded, setMyTeamExpanded] = React.useState<string | null>(
    null,
  );
  const [editingTeamName, setEditingTeamName] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [myAddDialog, setMyAddDialog] = React.useState<{
    teamId: string;
  } | null>(null);
  const [myPlayerName, setMyPlayerName] = React.useState("");
  const [myPlayerRole, setMyPlayerRole] =
    React.useState<Player["role"]>("batsman");
  const [bulkPasteText, setBulkPasteText] = React.useState("");
  const [addTab, setAddTab] = React.useState<"single" | "bulk">("single");
  const [defaultBulkText, setDefaultBulkText] = React.useState("");
  const [defaultAddTab, setDefaultAddTab] = React.useState<"single" | "bulk">(
    "single",
  );
  const [bulkSuccessMsg, setBulkSuccessMsg] = React.useState("");
  const [addDialog, setAddDialog] = React.useState<{ teamId: string } | null>(
    null,
  );
  const [editDialog, setEditDialog] = React.useState<{
    teamId: string;
    player: Player;
  } | null>(null);
  const [playerName, setPlayerName] = React.useState("");
  const [playerRole, setPlayerRole] = React.useState<Player["role"]>("batsman");

  const roleColors: Record<string, string> = {
    batsman: "#3b82f6",
    bowler: "#ef4444",
    allrounder: "#a855f7",
  };
  const roleLabels: Record<string, string> = {
    batsman: "BAT",
    bowler: "BOWL",
    allrounder: "ALL",
  };

  function openAdd(teamId: string) {
    if (!isAdminUnlocked) {
      onUnlockAdmin();
      return;
    }
    setPlayerName("");
    setPlayerRole("batsman");
    setAddDialog({ teamId });
  }

  function openEdit(teamId: string, player: Player) {
    if (!isAdminUnlocked) {
      onUnlockAdmin();
      return;
    }
    setPlayerName(player.name);
    setPlayerRole(player.role ?? "batsman");
    setEditDialog({ teamId, player });
  }

  function handleSaveAdd() {
    if (!addDialog || !playerName.trim()) return;
    const newPlayer: Player = {
      id: `p_${Date.now()}`,
      name: playerName.trim(),
      role: playerRole,
    };
    onAddPlayer(addDialog.teamId, newPlayer);
    setAddDialog(null);
  }

  function handleSaveEdit() {
    if (!editDialog || !playerName.trim()) return;
    onEditPlayer(editDialog.teamId, {
      ...editDialog.player,
      name: playerName.trim(),
      role: playerRole,
    });
    setEditDialog(null);
  }

  function handleDelete(teamId: string, playerId: string) {
    if (!isAdminUnlocked) {
      onUnlockAdmin();
      return;
    }
    if (confirm("Delete this player?")) onDeletePlayer(teamId, playerId);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #000000 0%, #001a0a 60%, #000d1a 100%)",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-10 pb-4 border-b border-primary/20">
        <div>
          <h2 className="text-primary font-display font-bold text-xl tracking-wide">
            TEAMS
          </h2>
          <p className="text-white/50 text-xs font-body">
            {teams.length} Default • {myTeams.length} My Teams
          </p>
        </div>
        <button
          type="button"
          data-ocid="teams.admin.toggle"
          onClick={onUnlockAdmin}
          className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer"
          style={{
            borderColor: isAdminUnlocked ? "#00ff88" : "rgba(255,255,255,0.2)",
            color: isAdminUnlocked ? "#00ff88" : "rgba(255,255,255,0.5)",
            background: isAdminUnlocked ? "rgba(0,255,136,0.1)" : "transparent",
          }}
        >
          {isAdminUnlocked ? "🔓 ADMIN" : "🔒 ADMIN"}
        </button>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        {(["default", "mine"] as const).map((sec) => (
          <button
            key={sec}
            type="button"
            data-ocid={`teams.${sec}.tab`}
            onClick={() => setActiveSection(sec)}
            className="flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer border-0 transition-all"
            style={{
              background:
                activeSection === sec
                  ? "rgba(0,255,136,0.18)"
                  : "rgba(255,255,255,0.05)",
              color:
                activeSection === sec ? "#00ff88" : "rgba(255,255,255,0.45)",
              border:
                activeSection === sec
                  ? "1px solid rgba(0,255,136,0.4)"
                  : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {sec === "default"
              ? `🏏 Default (${teams.length})`
              : `⭐ My Teams (${myTeams.length})`}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pb-24">
        {/* MY TEAMS SECTION */}
        {activeSection === "mine" && (
          <div className="space-y-2">
            <button
              type="button"
              data-ocid="teams.create_team.button"
              onClick={onCreateTeam}
              className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer border-0 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg,#00e676,#00b248)",
                color: "#000",
                boxShadow: "0 4px 15px rgba(0,230,118,0.3)",
              }}
            >
              <span>➕</span> Create New Team
            </button>
            {myTeams.length === 0 ? (
              <div
                data-ocid="teams.my.empty_state"
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  border: "1px dashed rgba(255,255,255,0.15)",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏏</div>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "1rem",
                    marginBottom: 8,
                  }}
                >
                  No Teams Yet
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "0.82rem",
                  }}
                >
                  Create your first team to get started
                </p>
              </div>
            ) : (
              myTeams.map((team) => (
                <div
                  key={team.id}
                  data-ocid={"teams.my.card"}
                  style={{
                    background: "rgba(255,215,0,0.05)",
                    border: "1px solid rgba(255,215,0,0.2)",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-3 p-3 cursor-pointer w-full text-left border-0 bg-transparent"
                    onClick={() =>
                      setMyTeamExpanded(
                        myTeamExpanded === team.id ? null : team.id,
                      )
                    }
                  >
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="w-10 h-10 rounded-full object-cover border border-yellow-400/30"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black text-sm flex-shrink-0"
                        style={{
                          background: "linear-gradient(135deg,#ffd600,#ff8c00)",
                        }}
                      >
                        {team.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {editingTeamName?.id === team.id ? (
                        <input
                          type="text"
                          value={editingTeamName.name}
                          onChange={(e) =>
                            setEditingTeamName({
                              ...editingTeamName,
                              name: e.target.value,
                            })
                          }
                          onBlur={() => {
                            onEditMyTeamName?.(team.id, editingTeamName.name);
                            setEditingTeamName(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onEditMyTeamName?.(team.id, editingTeamName.name);
                              setEditingTeamName(null);
                            }
                          }}
                          className="bg-black/50 border border-yellow-400/40 rounded px-2 py-1 text-white text-sm w-full outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p className="text-white font-bold text-sm truncate">
                          {team.name}
                        </p>
                      )}
                      <p
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "0.75rem",
                        }}
                      >
                        {team.players.length} players
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        data-ocid="teams.my.edit_button"
                        onClick={() =>
                          setEditingTeamName({ id: team.id, name: team.name })
                        }
                        className="p-1.5 rounded-lg cursor-pointer border-0 bg-transparent"
                        style={{ color: "#ffd600" }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        data-ocid="teams.my.delete_button"
                        onClick={() => {
                          if (confirm(`Delete "${team.name}"?`))
                            onDeleteMyTeam?.(team.id);
                        }}
                        className="p-1.5 rounded-lg cursor-pointer border-0 bg-transparent"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={14} />
                      </button>
                      {myTeamExpanded === team.id ? (
                        <ChevronUp size={16} style={{ color: "#ffd600" }} />
                      ) : (
                        <ChevronDown
                          size={16}
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        />
                      )}
                    </div>
                  </button>
                  {myTeamExpanded === team.id && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(255,215,0,0.15)",
                        padding: "10px 12px",
                      }}
                    >
                      {team.players.map((pl) => (
                        <div
                          key={pl.id}
                          className="flex items-center gap-2 py-1.5"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background:
                                pl.role === "bowler"
                                  ? "rgba(239,68,68,0.3)"
                                  : pl.role === "allrounder"
                                    ? "rgba(168,85,247,0.3)"
                                    : "rgba(59,130,246,0.3)",
                              color:
                                pl.role === "bowler"
                                  ? "#ef4444"
                                  : pl.role === "allrounder"
                                    ? "#a855f7"
                                    : "#60a5fa",
                            }}
                          >
                            {pl.name.charAt(0)}
                          </div>
                          <span className="text-white/80 text-sm flex-1">
                            {pl.name}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{
                              background:
                                pl.role === "bowler"
                                  ? "rgba(239,68,68,0.2)"
                                  : pl.role === "allrounder"
                                    ? "rgba(168,85,247,0.2)"
                                    : "rgba(59,130,246,0.2)",
                              color:
                                pl.role === "bowler"
                                  ? "#ef4444"
                                  : pl.role === "allrounder"
                                    ? "#a855f7"
                                    : "#60a5fa",
                            }}
                          >
                            {pl.role === "allrounder"
                              ? "ALL"
                              : pl.role === "bowler"
                                ? "BOWL"
                                : "BAT"}
                          </span>
                          <button
                            type="button"
                            data-ocid="teams.my.player.delete_button"
                            onClick={() =>
                              onDeleteMyTeamPlayer?.(team.id, pl.id)
                            }
                            className="p-1 rounded cursor-pointer border-0 bg-transparent"
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        data-ocid="teams.my.add_player.button"
                        onClick={() => {
                          setMyPlayerName("");
                          setMyPlayerRole("batsman");
                          setMyAddDialog({ teamId: team.id });
                        }}
                        className="mt-2 w-full py-2 rounded-lg text-xs font-bold cursor-pointer border-0 flex items-center justify-center gap-1"
                        style={{
                          background: "rgba(255,215,0,0.12)",
                          color: "#ffd600",
                          border: "1px dashed rgba(255,215,0,0.3)",
                        }}
                      >
                        <Plus size={12} /> Add Player
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* DEFAULT TEAMS SECTION */}
        {activeSection === "default" && teams.length === 0 && (
          <div
            data-ocid="teams.empty_state"
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              border: "1px dashed rgba(255,255,255,0.15)",
              margin: "12px 0",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏏</div>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "1rem",
                marginBottom: 16,
                fontFamily: "sans-serif",
              }}
            >
              No Teams Added Yet
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
              Ask admin to add teams from the directory
            </p>
          </div>
        )}
        {teams.map((team, tidx) => (
          <div
            key={team.id}
            data-ocid={`teams.item.${tidx + 1}`}
            className="border border-primary/30 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === team.id ? null : team.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-card hover:bg-primary/5 transition-colors cursor-pointer border-0 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Shield size={14} className="text-primary" />
                </div>
                <span className="text-white font-body font-semibold text-sm">
                  {team.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs font-body">
                  {team.players.length} players
                </span>
                {expanded === team.id ? (
                  <ChevronUp size={16} className="text-primary" />
                ) : (
                  <ChevronDown size={16} className="text-primary" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {expanded === team.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-background border-t border-primary/20 px-3 py-3 space-y-1.5">
                    {team.players.length === 0 ? (
                      <div
                        data-ocid="teams.empty_state"
                        className="text-center py-6"
                      >
                        <p className="text-white/40 text-sm font-body mb-3">
                          No players added yet
                        </p>
                        {isAdminUnlocked && (
                          <button
                            type="button"
                            data-ocid="teams.add_player.button"
                            onClick={() => openAdd(team.id)}
                            className="text-xs px-4 py-2 rounded-lg border border-primary/50 text-primary cursor-pointer bg-primary/10"
                          >
                            + Add First Player
                          </button>
                        )}
                      </div>
                    ) : (
                      team.players.map((p, pidx) => (
                        <div
                          key={p.id}
                          data-ocid={`teams.player.item.${pidx + 1}`}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Avatar */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{
                                background: "rgba(0,255,136,0.15)",
                                color: "#00ff88",
                                border: "1px solid rgba(0,255,136,0.3)",
                              }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white text-sm font-body">
                                  {p.name}
                                </span>
                                {p.isCaptain && (
                                  <span
                                    className="text-xs font-bold px-1 rounded"
                                    style={{
                                      background: "rgba(255,215,0,0.2)",
                                      color: "#ffd700",
                                    }}
                                  >
                                    C
                                  </span>
                                )}
                                {p.isViceCaptain && (
                                  <span
                                    className="text-xs font-bold px-1 rounded"
                                    style={{
                                      background: "rgba(192,192,192,0.2)",
                                      color: "#c0c0c0",
                                    }}
                                  >
                                    VC
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {p.role && (
                                  <span
                                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                                    style={{
                                      background: `${roleColors[p.role]}25`,
                                      color: roleColors[p.role],
                                      fontSize: "10px",
                                    }}
                                  >
                                    {roleLabels[p.role]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isAdminUnlocked && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                data-ocid={`teams.player.edit_button.${pidx + 1}`}
                                onClick={() => openEdit(team.id, p)}
                                className="p-1.5 rounded cursor-pointer border-0 bg-transparent text-white/40 hover:text-primary"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                data-ocid={`teams.player.delete_button.${pidx + 1}`}
                                onClick={() => handleDelete(team.id, p.id)}
                                className="p-1.5 rounded cursor-pointer border-0 bg-transparent text-white/40 hover:text-red-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isAdminUnlocked && team.players.length > 0 && (
                      <button
                        type="button"
                        data-ocid="teams.add_player.button"
                        onClick={() => openAdd(team.id)}
                        className="w-full mt-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 text-xs font-bold cursor-pointer bg-transparent hover:bg-primary/5"
                      >
                        + ADD PLAYER
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </main>

      {/* Add Player Dialog */}
      <Dialog
        open={!!addDialog}
        onOpenChange={() => {
          setAddDialog(null);
          setDefaultAddTab("single");
          setDefaultBulkText("");
          setBulkSuccessMsg("");
        }}
      >
        <DialogContent className="bg-card border-primary/30 mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-primary font-display text-center">
              ADD PLAYER
            </DialogTitle>
          </DialogHeader>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-2">
            <button
              type="button"
              onClick={() => setDefaultAddTab("single")}
              className="flex-1 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all"
              style={{
                background:
                  defaultAddTab === "single"
                    ? "rgba(0,255,136,0.2)"
                    : "transparent",
                color:
                  defaultAddTab === "single"
                    ? "#00ff88"
                    : "rgba(255,255,255,0.4)",
              }}
            >
              Single Player
            </button>
            <button
              type="button"
              onClick={() => setDefaultAddTab("bulk")}
              className="flex-1 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all"
              style={{
                background:
                  defaultAddTab === "bulk"
                    ? "rgba(0,255,136,0.2)"
                    : "transparent",
                color:
                  defaultAddTab === "bulk"
                    ? "#00ff88"
                    : "rgba(255,255,255,0.4)",
              }}
            >
              Bulk Paste
            </button>
          </div>

          {bulkSuccessMsg ? (
            <div
              className="py-2 text-center text-sm font-bold"
              style={{ color: "#00ff88" }}
            >
              ✅ {bulkSuccessMsg}
            </div>
          ) : null}

          {defaultAddTab === "single" ? (
            <>
              <div className="space-y-3 pt-2">
                <input
                  data-ocid="teams.add_player.input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary/60"
                />
                <div className="flex gap-2">
                  {(["batsman", "bowler", "allrounder"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPlayerRole(r)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer border transition-all"
                      style={{
                        background:
                          playerRole === r
                            ? `${roleColors[r]}20`
                            : "transparent",
                        borderColor:
                          playerRole === r
                            ? roleColors[r]
                            : "rgba(255,255,255,0.2)",
                        color:
                          playerRole === r
                            ? roleColors[r]
                            : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {roleLabels[r]}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddDialog(null)}
                  className="flex-1 py-2 rounded-lg border border-white/20 text-white/60 text-sm cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-ocid="teams.add_player.submit_button"
                  onClick={handleSaveAdd}
                  className="flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer"
                  style={{
                    background: "rgba(0,255,136,0.2)",
                    color: "#00ff88",
                    border: "1px solid rgba(0,255,136,0.4)",
                  }}
                >
                  ADD
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-2 space-y-3">
                <textarea
                  data-ocid="teams.default.bulk_paste.textarea"
                  value={defaultBulkText}
                  onChange={(e) => setDefaultBulkText(e.target.value)}
                  placeholder={
                    "Paste player names (one per line)\nExample:\n\nIrfan Malik\nFakhar Khan\nRashid Malik\nSajjad Khan"
                  }
                  rows={7}
                  className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-primary/60 resize-none"
                  style={{ width: "100%" }}
                />
                <p className="text-xs text-white/40">
                  Each line = one player. Duplicates are skipped automatically.
                </p>
              </div>
              <DialogFooter className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddDialog(null);
                    setDefaultBulkText("");
                    setDefaultAddTab("single");
                    setBulkSuccessMsg("");
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm border border-white/20 text-white/60 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-ocid="teams.default.bulk_paste.submit_button"
                  onClick={() => {
                    if (!addDialog) return;
                    const currentTeam = teams.find(
                      (t) => t.id === addDialog.teamId,
                    );
                    const existingNames = new Set(
                      (currentTeam?.players ?? []).map((p) =>
                        p.name.toLowerCase().trim(),
                      ),
                    );
                    const lines = defaultBulkText
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    let added = 0;
                    lines.forEach((name, index) => {
                      if (!existingNames.has(name.toLowerCase())) {
                        onAddPlayer(addDialog.teamId, {
                          id: `p_${Date.now()}_${index}`,
                          name,
                          role: "batsman",
                        });
                        existingNames.add(name.toLowerCase());
                        added++;
                      }
                    });
                    setDefaultBulkText("");
                    if (added > 0) {
                      setBulkSuccessMsg(
                        `${added} player${added > 1 ? "s" : ""} added successfully`,
                      );
                      setTimeout(() => {
                        setAddDialog(null);
                        setDefaultAddTab("single");
                        setBulkSuccessMsg("");
                      }, 1500);
                    } else {
                      setBulkSuccessMsg(
                        "No new players to add (all already exist)",
                      );
                      setTimeout(() => setBulkSuccessMsg(""), 2000);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg font-bold text-sm cursor-pointer text-black border-0"
                  style={{
                    background: "linear-gradient(135deg,#00e676,#00b248)",
                  }}
                >
                  Add Players
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="bg-card border-primary/30 mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-primary font-display">
              EDIT PLAYER
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              data-ocid="teams.edit_player.input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Player name"
              className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary/60"
            />
            <div className="flex gap-2">
              {(["batsman", "bowler", "allrounder"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPlayerRole(r)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer border transition-all"
                  style={{
                    background:
                      playerRole === r ? `${roleColors[r]}20` : "transparent",
                    borderColor:
                      playerRole === r
                        ? roleColors[r]
                        : "rgba(255,255,255,0.2)",
                    color:
                      playerRole === r
                        ? roleColors[r]
                        : "rgba(255,255,255,0.5)",
                  }}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditDialog(null)}
              className="flex-1 py-2 rounded-lg border border-white/20 text-white/60 text-sm cursor-pointer bg-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="teams.edit_player.save_button"
              onClick={handleSaveEdit}
              className="flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer"
              style={{
                background: "rgba(0,255,136,0.2)",
                color: "#00ff88",
                border: "1px solid rgba(0,255,136,0.4)",
              }}
            >
              SAVE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* My Team Add Player Dialog */}
      <Dialog
        open={!!myAddDialog}
        onOpenChange={() => {
          setMyAddDialog(null);
          setAddTab("single");
          setBulkPasteText("");
        }}
      >
        <DialogContent className="bg-card border-primary/30 mx-4 max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-primary font-display text-center">
              ADD PLAYER
            </DialogTitle>
          </DialogHeader>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-2">
            <button
              type="button"
              data-ocid="teams.my.add_single.tab"
              onClick={() => setAddTab("single")}
              className="flex-1 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all"
              style={{
                background:
                  addTab === "single" ? "rgba(0,255,136,0.2)" : "transparent",
                color:
                  addTab === "single" ? "#00ff88" : "rgba(255,255,255,0.4)",
              }}
            >
              Single Player
            </button>
            <button
              type="button"
              data-ocid="teams.my.paste_list.tab"
              onClick={() => setAddTab("bulk")}
              className="flex-1 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all"
              style={{
                background:
                  addTab === "bulk" ? "rgba(0,255,136,0.2)" : "transparent",
                color: addTab === "bulk" ? "#00ff88" : "rgba(255,255,255,0.4)",
              }}
            >
              Bulk Paste
            </button>
          </div>

          {bulkSuccessMsg ? (
            <div
              className="py-2 text-center text-sm font-bold"
              style={{ color: "#00ff88" }}
            >
              ✅ {bulkSuccessMsg}
            </div>
          ) : null}

          {addTab === "single" ? (
            <>
              <div className="py-2 space-y-3">
                <input
                  data-ocid="teams.my.player_name.input"
                  type="text"
                  value={myPlayerName}
                  onChange={(e) => setMyPlayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      myAddDialog &&
                      myPlayerName.trim()
                    ) {
                      onAddMyTeamPlayer?.(myAddDialog.teamId, {
                        id: `mp_${Date.now()}`,
                        name: myPlayerName.trim(),
                        role: myPlayerRole,
                      });
                      setMyPlayerName("");
                      setMyAddDialog(null);
                    }
                  }}
                  placeholder="Player name"
                  className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-primary/60"
                />
                <select
                  data-ocid="teams.my.player_role.select"
                  value={myPlayerRole}
                  onChange={(e) =>
                    setMyPlayerRole(e.target.value as Player["role"])
                  }
                  className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-primary/60 cursor-pointer"
                >
                  <option value="batsman" style={{ background: "#111" }}>
                    Batsman
                  </option>
                  <option value="bowler" style={{ background: "#111" }}>
                    Bowler
                  </option>
                  <option value="allrounder" style={{ background: "#111" }}>
                    All-Rounder
                  </option>
                </select>
              </div>
              <DialogFooter className="flex gap-2">
                <button
                  type="button"
                  data-ocid="teams.my.add_player.cancel_button"
                  onClick={() => setMyAddDialog(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm border border-white/20 text-white/60 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-ocid="teams.my.add_player.confirm_button"
                  onClick={() => {
                    if (!myAddDialog || !myPlayerName.trim()) return;
                    onAddMyTeamPlayer?.(myAddDialog.teamId, {
                      id: `mp_${Date.now()}`,
                      name: myPlayerName.trim(),
                      role: myPlayerRole,
                    });
                    setMyPlayerName("");
                    setMyAddDialog(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg font-bold text-sm cursor-pointer text-black border-0"
                  style={{
                    background: "linear-gradient(135deg,#00e676,#00b248)",
                  }}
                >
                  Add
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-2 space-y-3">
                <textarea
                  data-ocid="teams.my.bulk_paste.textarea"
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={
                    "Paste player names (one per line)\nExample:\n\nIrfan Malik\nFakhar Khan\nRashid Malik\nSajjad Khan"
                  }
                  rows={6}
                  className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-primary/60 resize-none"
                />
                <p className="text-xs text-white/40">
                  Each line = one player. Empty lines are skipped.
                </p>
              </div>
              <DialogFooter className="flex gap-2">
                <button
                  type="button"
                  data-ocid="teams.my.bulk_paste.cancel_button"
                  onClick={() => {
                    setMyAddDialog(null);
                    setBulkPasteText("");
                    setAddTab("single");
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm border border-white/20 text-white/60 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-ocid="teams.my.bulk_paste.submit_button"
                  onClick={() => {
                    if (!myAddDialog) return;
                    const currentTeam = myTeams.find(
                      (t) => t.id === myAddDialog.teamId,
                    );
                    const existingNames = new Set(
                      (currentTeam?.players ?? []).map((p) =>
                        p.name.toLowerCase().trim(),
                      ),
                    );
                    const lines = bulkPasteText
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    let added = 0;
                    lines.forEach((name, index) => {
                      if (!existingNames.has(name.toLowerCase())) {
                        onAddMyTeamPlayer?.(myAddDialog.teamId, {
                          id: `p_${Date.now()}_${index}`,
                          name,
                          role: "batsman",
                        });
                        existingNames.add(name.toLowerCase());
                        added++;
                      }
                    });
                    setBulkPasteText("");
                    if (added > 0) {
                      setBulkSuccessMsg(
                        `${added} player${added > 1 ? "s" : ""} added successfully`,
                      );
                      setTimeout(() => {
                        setAddTab("single");
                        setMyAddDialog(null);
                        setBulkSuccessMsg("");
                      }, 1500);
                    } else {
                      setBulkSuccessMsg(
                        "No new players to add (all already exist)",
                      );
                      setTimeout(() => setBulkSuccessMsg(""), 2000);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg font-bold text-sm cursor-pointer text-black border-0"
                  style={{
                    background: "linear-gradient(135deg,#00e676,#00b248)",
                  }}
                >
                  Add Players
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MATCHES TAB VIEW
// ──────────────────────────────────────────────────────────────

function MatchesTabView({
  pastMatches,
  onStartMatch,
  onTournament,
  isAdminUnlocked,
  onUnlockAdmin,
  onDeleteMatch,
}: {
  pastMatches: MatchRecord[];
  onStartMatch: () => void;
  onTournament: () => void;
  isAdminUnlocked: boolean;
  onUnlockAdmin: () => void;
  onDeleteMatch: (id: string) => void;
}) {
  // Build leaderboard
  const leaderboard = React.useMemo(() => {
    const stats: Record<string, { played: number; won: number; lost: number }> =
      {};
    for (const m of pastMatches) {
      const teamA = m.teamA.name;
      const teamB = m.teamB.name;
      if (!stats[teamA]) stats[teamA] = { played: 0, won: 0, lost: 0 };
      if (!stats[teamB]) stats[teamB] = { played: 0, won: 0, lost: 0 };
      stats[teamA].played++;
      stats[teamB].played++;
      if (m.resultText) {
        if (
          m.resultText.includes(`${teamA} won`) ||
          m.resultText.includes(`${teamA} Won`)
        ) {
          stats[teamA].won++;
          stats[teamB].lost++;
        } else if (
          m.resultText.includes(`${teamB} won`) ||
          m.resultText.includes(`${teamB} Won`)
        ) {
          stats[teamB].won++;
          stats[teamA].lost++;
        }
      }
    }
    return Object.entries(stats)
      .map(([team, s]) => ({ team, ...s, pts: s.won * 2 }))
      .sort((a, b) => b.pts - a.pts || b.won - a.won);
  }, [pastMatches]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #000000 0%, #001a0a 60%, #000d1a 100%)",
      }}
    >
      <header className="flex items-center justify-between px-4 pt-10 pb-4 border-b border-primary/20">
        <h2 className="text-primary font-display font-bold text-xl tracking-wide">
          MATCHES
        </h2>
        <button
          type="button"
          data-ocid="matches.admin.toggle"
          onClick={onUnlockAdmin}
          className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer"
          style={{
            borderColor: isAdminUnlocked ? "#00ff88" : "rgba(255,255,255,0.2)",
            color: isAdminUnlocked ? "#00ff88" : "rgba(255,255,255,0.5)",
            background: isAdminUnlocked ? "rgba(0,255,136,0.1)" : "transparent",
          }}
        >
          {isAdminUnlocked ? "🔓 ADMIN" : "🔒 ADMIN"}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Start Match CTA */}
        <motion.button
          type="button"
          data-ocid="matches.start_match.primary_button"
          whileTap={{ scale: 0.97 }}
          onClick={onStartMatch}
          className="w-full py-5 rounded-2xl font-display font-bold text-lg tracking-widest cursor-pointer"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,204,102,0.1) 100%)",
            border: "2px solid rgba(0,255,136,0.5)",
            color: "#00ff88",
            boxShadow: "0 0 20px rgba(0,255,136,0.2)",
          }}
        >
          🏏 START NEW MATCH
        </motion.button>

        {/* Tournament button */}
        <button
          type="button"
          data-ocid="matches.tournament.button"
          onClick={onTournament}
          className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide cursor-pointer"
          style={{
            background: "rgba(255,215,0,0.08)",
            border: "1px solid rgba(255,215,0,0.3)",
            color: "#ffd700",
          }}
        >
          🏆 TOURNAMENT &amp; POOLS
        </button>

        {/* Match History */}
        <div>
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">
            Match History
          </h3>
          {pastMatches.length === 0 ? (
            <div
              data-ocid="matches.history.empty_state"
              className="text-center py-10"
            >
              <div className="text-4xl mb-3">🏏</div>
              <p className="text-white/40 font-body text-sm">
                No match history yet
              </p>
              <p className="text-white/25 font-body text-xs mt-1">
                Start your first match!
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-20">
              {pastMatches.map((m, i) => (
                <div
                  key={m.id}
                  data-ocid={`matches.history.item.${i + 1}`}
                  className="border border-primary/20 rounded-xl p-3.5"
                  style={{
                    background: "rgba(0,255,136,0.03)",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    marginBottom: "4px",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      style={{
                        background: "rgba(0,255,136,0.15)",
                        color: "#00ff88",
                        borderRadius: "6px",
                        padding: "2px 6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      #{pastMatches.length - i}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="text-white font-semibold text-sm font-body"
                        style={{ wordBreak: "break-word", lineHeight: "1.4" }}
                      >
                        {m.teamA.name} vs {m.teamB.name}
                      </p>
                      <p
                        className="text-primary text-xs font-body mt-0.5 leading-relaxed"
                        style={{ wordBreak: "break-word" }}
                      >
                        {m.resultText}
                      </p>
                      <p className="text-white/30 text-xs font-body mt-1">
                        {m.date}
                        {m.time ? ` • ${m.time}` : ""}
                      </p>
                    </div>
                    {isAdminUnlocked && (
                      <button
                        type="button"
                        data-ocid={`matches.history.delete_button.${i + 1}`}
                        onClick={() => {
                          if (confirm("Delete this match record?"))
                            onDeleteMatch(m.id);
                        }}
                        className="p-1.5 ml-1 text-red-400/50 hover:text-red-400 cursor-pointer border-0 bg-transparent"
                        style={{ flexShrink: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">
            Leaderboard
          </h3>
          {leaderboard.length === 0 ? (
            <div
              data-ocid="matches.leaderboard.empty_state"
              className="text-center py-8 text-white/30 text-sm font-body"
            >
              Play matches to see the leaderboard
            </div>
          ) : (
            <div className="border border-primary/20 rounded-xl overflow-hidden">
              <div
                className="grid grid-cols-5 px-3 py-2 text-xs font-bold tracking-wide text-white/40 border-b border-primary/15"
                style={{ fontSize: "10px" }}
              >
                <span className="col-span-2">TEAM</span>
                <span className="text-center">P</span>
                <span className="text-center">W</span>
                <span className="text-center" style={{ color: "#00ff88" }}>
                  PTS
                </span>
              </div>
              {leaderboard.map((row, i) => (
                <div
                  key={row.team}
                  data-ocid={`matches.leaderboard.item.${i + 1}`}
                  className="grid grid-cols-5 px-3 py-2.5 text-sm font-body border-b border-primary/10 last:border-0"
                  style={{
                    background:
                      i === 0 ? "rgba(255,215,0,0.05)" : "transparent",
                  }}
                >
                  <div className="col-span-2 flex items-center gap-1.5">
                    {i === 0 && <span className="text-xs">🥇</span>}
                    {i === 1 && <span className="text-xs">🥈</span>}
                    {i === 2 && <span className="text-xs">🥉</span>}
                    {i > 2 && (
                      <span className="text-white/30 text-xs mr-0.5">
                        {i + 1}
                      </span>
                    )}
                    <span className="text-white text-xs font-semibold truncate">
                      {row.team}
                    </span>
                  </div>
                  <span className="text-center text-white/60 text-xs">
                    {row.played}
                  </span>
                  <span className="text-center text-white/60 text-xs">
                    {row.won}
                  </span>
                  <span
                    className="text-center text-xs font-bold"
                    style={{ color: "#00ff88" }}
                  >
                    {row.pts}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// COMMUNITY TAB VIEW
// ──────────────────────────────────────────────────────────────

function CommunityTabView({ teams }: { teams: Team[] }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #000000 0%, #001a0a 60%, #000d1a 100%)",
      }}
    >
      <header className="px-4 pt-10 pb-4 border-b border-primary/20">
        <h2 className="text-primary font-display font-bold text-xl tracking-wide">
          COMMUNITY
        </h2>
        <p className="text-white/50 text-xs font-body mt-0.5">
          Announcements &amp; Predictions
        </p>
      </header>
      <div className="flex-1 overflow-y-auto pb-24">
        <AnnouncementSection />
        <PostVoteView onHome={() => {}} teams={teams} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PLAYER LEADERBOARD VIEW
// ──────────────────────────────────────────────────────────────

function PlayerLeaderboardView({ onBack }: { onBack: () => void }) {
  const stats = loadPlayerStats();
  const orangeCap =
    stats.length > 0
      ? [...stats].sort((a, b) => b.totalRuns - a.totalRuns)[0]
      : null;
  const purpleCap =
    stats.length > 0
      ? [...stats].sort((a, b) => b.totalWickets - a.totalWickets)[0]
      : null;
  const mvp =
    stats.length > 0
      ? [...stats].sort(
          (a, b) =>
            b.totalRuns +
            b.totalWickets * 20 -
            (a.totalRuns + a.totalWickets * 20),
        )[0]
      : null;
  const topBatsmen = [...stats]
    .sort((a, b) => b.totalRuns - a.totalRuns)
    .slice(0, 10);
  const topBowlers = [...stats]
    .sort((a, b) => b.totalWickets - a.totalWickets)
    .slice(0, 10);

  return (
    <Page>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          data-ocid="leaderboard.close_button"
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: "4px 8px",
            marginRight: "12px",
            fontSize: "18px",
          }}
        >
          ←
        </button>
        <h1
          style={{
            color: "#ffd700",
            fontWeight: 800,
            fontSize: "18px",
            margin: 0,
          }}
        >
          🏆 Tournament Leaderboard
        </h1>
      </header>
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingBottom: "100px",
        }}
      >
        {stats.length === 0 ? (
          <div
            data-ocid="leaderboard.empty_state"
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.4)",
              padding: "60px 20px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
            <p style={{ fontSize: "16px" }}>No stats available yet</p>
            <p style={{ fontSize: "13px", marginTop: "6px" }}>
              Complete matches to see player rankings
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {orangeCap && orangeCap.totalRuns > 0 && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    border: "2px solid rgba(255,165,0,0.5)",
                    background: "rgba(255,165,0,0.08)",
                    boxShadow: "0 0 20px rgba(255,165,0,0.15)",
                  }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>
                    🧢
                  </div>
                  <p
                    style={{
                      color: "#ffa500",
                      fontWeight: 700,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 6px",
                    }}
                  >
                    Orange Cap
                  </p>
                  <p
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "16px",
                      margin: 0,
                    }}
                  >
                    {orangeCap.name}
                  </p>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "11px",
                      margin: "3px 0",
                    }}
                  >
                    {orangeCap.teamName}
                  </p>
                  <p
                    style={{
                      color: "#ffa500",
                      fontWeight: 800,
                      fontSize: "22px",
                      margin: "6px 0 0",
                    }}
                  >
                    {orangeCap.totalRuns}{" "}
                    <span style={{ fontSize: "12px", fontWeight: 400 }}>
                      runs
                    </span>
                  </p>
                </div>
              )}
              {purpleCap && purpleCap.totalWickets > 0 && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    border: "2px solid rgba(180,0,255,0.5)",
                    background: "rgba(180,0,255,0.08)",
                    boxShadow: "0 0 20px rgba(180,0,255,0.15)",
                  }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>
                    🎯
                  </div>
                  <p
                    style={{
                      color: "#cc44ff",
                      fontWeight: 700,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 6px",
                    }}
                  >
                    Purple Cap
                  </p>
                  <p
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "16px",
                      margin: 0,
                    }}
                  >
                    {purpleCap.name}
                  </p>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "11px",
                      margin: "3px 0",
                    }}
                  >
                    {purpleCap.teamName}
                  </p>
                  <p
                    style={{
                      color: "#cc44ff",
                      fontWeight: 800,
                      fontSize: "22px",
                      margin: "6px 0 0",
                    }}
                  >
                    {purpleCap.totalWickets}{" "}
                    <span style={{ fontSize: "12px", fontWeight: 400 }}>
                      wickets
                    </span>
                  </p>
                </div>
              )}
            </div>

            {mvp && (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "16px",
                  border: "2px solid rgba(255,215,0,0.5)",
                  background: "rgba(255,215,0,0.07)",
                  boxShadow: "0 0 24px rgba(255,215,0,0.15)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div style={{ fontSize: "36px" }}>⭐</div>
                  <div>
                    <p
                      style={{
                        color: "#ffd700",
                        fontWeight: 700,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        margin: 0,
                      }}
                    >
                      MVP Player
                    </p>
                    <p
                      style={{
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "20px",
                        margin: "4px 0 2px",
                      }}
                    >
                      {mvp.name}
                    </p>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "12px",
                        margin: 0,
                      }}
                    >
                      {mvp.teamName} · {mvp.totalRuns}R / {mvp.totalWickets}W
                    </p>
                  </div>
                </div>
              </div>
            )}

            {topBatsmen.filter((p) => p.totalRuns > 0).length > 0 && (
              <div>
                <h3
                  style={{
                    color: "#ffa500",
                    fontWeight: 700,
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                  }}
                >
                  🏏 Top Batsmen
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {topBatsmen
                    .filter((p) => p.totalRuns > 0)
                    .map((p, i) => (
                      <div
                        key={p.key}
                        data-ocid={`leaderboard.item.${i + 1}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background:
                            i === 0
                              ? "rgba(255,165,0,0.1)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            i === 0
                              ? "1px solid rgba(255,165,0,0.3)"
                              : "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <span
                          style={{
                            color:
                              i < 3
                                ? (
                                    [
                                      "#ffd700",
                                      "#c0c0c0",
                                      "#cd7f32",
                                    ] as string[]
                                  )[i]
                                : "rgba(255,255,255,0.3)",
                            fontWeight: 700,
                            fontSize: "13px",
                            width: "20px",
                          }}
                        >
                          #{i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: "14px",
                              margin: 0,
                            }}
                          >
                            {p.name}
                          </p>
                          <p
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: "11px",
                              margin: "2px 0 0",
                            }}
                          >
                            {p.teamName}
                          </p>
                        </div>
                        <span
                          style={{
                            color: "#ffa500",
                            fontWeight: 800,
                            fontSize: "16px",
                          }}
                        >
                          {p.totalRuns}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {topBowlers.filter((p) => p.totalWickets > 0).length > 0 && (
              <div>
                <h3
                  style={{
                    color: "#cc44ff",
                    fontWeight: 700,
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                  }}
                >
                  🎯 Top Bowlers
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {topBowlers
                    .filter((p) => p.totalWickets > 0)
                    .map((p, i) => (
                      <div
                        key={p.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background:
                            i === 0
                              ? "rgba(180,0,255,0.1)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            i === 0
                              ? "1px solid rgba(180,0,255,0.3)"
                              : "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <span
                          style={{
                            color:
                              i < 3
                                ? (
                                    [
                                      "#ffd700",
                                      "#c0c0c0",
                                      "#cd7f32",
                                    ] as string[]
                                  )[i]
                                : "rgba(255,255,255,0.3)",
                            fontWeight: 700,
                            fontSize: "13px",
                            width: "20px",
                          }}
                        >
                          #{i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: "14px",
                              margin: 0,
                            }}
                          >
                            {p.name}
                          </p>
                          <p
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: "11px",
                              margin: "2px 0 0",
                            }}
                          >
                            {p.teamName}
                          </p>
                        </div>
                        <span
                          style={{
                            color: "#cc44ff",
                            fontWeight: 800,
                            fontSize: "16px",
                          }}
                        >
                          {p.totalWickets}W
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </Page>
  );
}

function smartBackup() {
  try {
    const backupObj: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("ccb_") && !k.startsWith("ccb_backup_")) {
        const val = localStorage.getItem(k);
        if (val !== null) backupObj[k] = val;
      }
    }
    localStorage.setItem("ccb_backup", JSON.stringify(backupObj));
  } catch {}
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<CcbUser | null>(() => {
    try {
      const saved = localStorage.getItem("ccb_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [myTeams, setMyTeams] = useState<MyTeam[]>(() => {
    try {
      const u = localStorage.getItem("ccb_user");
      if (!u) return [];
      const user = JSON.parse(u) as CcbUser;
      const saved = localStorage.getItem(`ccb_myteams_${user.phone}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState<string | undefined>(undefined);
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined" && window.location.hash === "#live")
      return "live-match";
    return "home";
  });
  const [teams, setTeams] = useState<Team[]>(() => {
    // Safety: initialise ccb_players if missing (NEVER overwrite existing)
    if (!localStorage.getItem("ccb_players")) {
      localStorage.setItem("ccb_players", JSON.stringify({}));
    }
    try {
      const saved = localStorage.getItem("ccb_teams");
      let base: Team[] = TEAMS;
      if (saved) {
        const parsed = JSON.parse(saved) as Team[];
        if (Array.isArray(parsed) && parsed.length > 0) base = parsed;
      }
      // Also merge from ccb_players {teamId: [name1, name2, ...]} format
      try {
        const playersRaw = localStorage.getItem("ccb_players");
        if (playersRaw) {
          const playersData = JSON.parse(playersRaw) as Record<
            string,
            string[]
          >;
          base = base.map((team) => {
            const names: string[] = Array.isArray(playersData[team.id])
              ? playersData[team.id]
              : [];
            if (names.length === 0) return team;
            // Merge: keep existing Player objects, add new names from ccb_players
            const existingNames = new Set(team.players.map((p) => p.name));
            const newPlayers = names
              .filter((n) => n && !existingNames.has(n))
              .map((name, idx) => ({
                id: `ccbp_${team.id}_${idx}_${Date.now()}`,
                name,
              }));
            return newPlayers.length > 0
              ? { ...team, players: [...team.players, ...newPlayers] }
              : team;
          });
        }
      } catch {}
      return base;
    } catch {}
    return TEAMS;
  });
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [setupTeamA, setSetupTeamA] = useState<Team | null>(null);
  const [setupTeamB, setSetupTeamB] = useState<Team | null>(null);
  const [setupOvers, setSetupOvers] = useState(6);
  const [innings1, setInnings1] = useState<InningsState | null>(null);
  const [innings2, setInnings2] = useState<InningsState | null>(null);
  const [currentInningsNum, setCurrentInningsNum] = useState<1 | 2>(1);
  const [currentMatch, setCurrentMatch] = useState<MatchRecord | null>(null);
  const [pastMatches, setPastMatches] = useState<MatchRecord[]>([]);
  // biome-ignore lint/correctness/noUnusedVariables: legacy tournament state kept for data compatibility
  const [tournament, setTournament] = useState<Tournament>(EMPTY_TOURNAMENT);
  const [pendingMatchSetup, setPendingMatchSetup] = useState<{
    teamA: Team;
    teamB: Team;
    overs: number;
    isSecondInnings?: boolean;
  } | null>(null);
  const [pendingInitialBowler, setPendingInitialBowler] = useState<string>("");

  const [matchInfoCards, setMatchInfoCards] = useState<MatchInfoCard[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const {
    isAdmin: isAdminUnlocked,
    login: adminLogin,
    logout: adminLogout,
  } = useAdminSession();
  const { actor } = useActor();
  const [adminPwdDialog, setAdminPwdDialog] = useState(false);

  useEffect(() => {
    // Sync activeTab when view changes via other means
    if (view === "home") setActiveTab("home");
    else if (view === "teams" || view === "teams-tab") setActiveTab("teams");
    else if (
      view === "setup" ||
      view === "scoring" ||
      view === "innings-switch" ||
      view === "result" ||
      view === "tournament" ||
      view === "matches-tab"
    )
      setActiveTab("matches");
    else if (
      view === "community-tab" ||
      view === "announcements" ||
      view === "post-vote"
    )
      setActiveTab("community");
  }, [view]);

  useEffect(() => {
    // One-time backup of all ccb_ data
    const BACKUP_VERSION = "v66";
    if (!localStorage.getItem(`ccb_backup_${BACKUP_VERSION}_done`)) {
      try {
        const keysToBackup: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith("ccb_") && !k.startsWith("ccb_backup_")) {
            keysToBackup.push(k);
          }
        }
        for (const k of keysToBackup) {
          const val = localStorage.getItem(k);
          if (val !== null) {
            localStorage.setItem(`ccb_backup_${BACKUP_VERSION}_${k}`, val);
          }
        }
        localStorage.setItem(`ccb_backup_${BACKUP_VERSION}_done`, "true");
      } catch {}
    }
    try {
      const saved = localStorage.getItem("ccb_past_matches");
      if (saved) setPastMatches(JSON.parse(saved));
      const savedT = localStorage.getItem("ccb_tournament");
      if (savedT) setTournament(JSON.parse(savedT));
      const savedMIC = localStorage.getItem("ccb_match_info_cards");
      if (savedMIC) setMatchInfoCards(JSON.parse(savedMIC));
    } catch {}
  }, []);

  // Sync myTeams to backend whenever they change
  useEffect(() => {
    if (!actor || !currentUser) return;
    actor.syncTeam(currentUser.phone, JSON.stringify(myTeams)).catch(() => {});
  }, [myTeams, actor, currentUser]);

  function handleUpdateMatchInfoCards(cards: MatchInfoCard[]) {
    setMatchInfoCards(cards);
    try {
      localStorage.setItem("ccb_match_info_cards", JSON.stringify(cards));
    } catch {}
  }

  // biome-ignore lint/correctness/noUnusedVariables: kept for legacy TournamentView compatibility
  function handleUpdateTournament(t: Tournament) {
    setTournament(t);
    try {
      localStorage.setItem("ccb_tournament", JSON.stringify(t));
    } catch {}
  }

  function handleTournamentStartMatch(params: {
    teamAId: string;
    teamBId: string;
    overs: number;
    tournamentMatchId: string;
    matchTag: string;
  }) {
    const teamA = teams.find((t) => t.id === params.teamAId) ?? null;
    const teamB = teams.find((t) => t.id === params.teamBId) ?? null;
    if (!teamA || !teamB) return;
    setSetupTeamA(teamA);
    setSetupTeamB(teamB);
    setSetupOvers(params.overs);
    setView("setup");
  }

  function saveTeams(updated: Team[]) {
    try {
      const backup = localStorage.getItem("ccb_teams");
      if (backup) localStorage.setItem("ccb_backup_teams", backup);
      smartBackup();
      localStorage.setItem("ccb_teams", JSON.stringify(updated));
      // Also persist to ccb_players {teamId: [name1, name2]} for compatibility
      try {
        const playersData: Record<string, string[]> = {};
        for (const team of updated) {
          playersData[team.id] = team.players.map((p) => p.name);
        }
        localStorage.setItem("ccb_players", JSON.stringify(playersData));
      } catch {}
    } catch {}
  }

  function handleAddPlayer(teamId: string, player: Player) {
    setTeams((prev) => {
      const updated = prev.map((t) =>
        t.id === teamId ? { ...t, players: [...t.players, player] } : t,
      );
      saveTeams(updated);
      return updated;
    });
  }

  function handleEditPlayer(teamId: string, updatedPlayer: Player) {
    setTeams((prev) => {
      const updated = prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              players: t.players.map((p) =>
                p.id === updatedPlayer.id ? updatedPlayer : p,
              ),
            }
          : t,
      );
      saveTeams(updated);
      return updated;
    });
  }

  function handleDeletePlayer(teamId: string, playerId: string) {
    setTeams((prev) => {
      const updated = prev.map((t) =>
        t.id === teamId
          ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
          : t,
      );
      saveTeams(updated);
      return updated;
    });
  }

  function handleDeleteMatch(matchId: string) {
    const updated = pastMatches.filter((m) => m.id !== matchId);
    setPastMatches(updated);
    try {
      smartBackup();
      localStorage.setItem("ccb_past_matches", JSON.stringify(updated));
    } catch {}
  }

  function saveMyTeams(teams: MyTeam[]) {
    setMyTeams(teams);
    if (currentUser) {
      try {
        localStorage.setItem(
          `ccb_myteams_${currentUser.phone}`,
          JSON.stringify(teams),
        );
      } catch {}
    }
    // Also sync to ccb_players for compatibility (merge with default teams)
    try {
      const existingRaw = localStorage.getItem("ccb_players");
      const existing: Record<string, string[]> = existingRaw
        ? JSON.parse(existingRaw)
        : {};
      for (const mt of teams) {
        existing[mt.id] = mt.players.map((p) => p.name);
      }
      localStorage.setItem("ccb_players", JSON.stringify(existing));
    } catch {}
  }

  function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    const newTeam: MyTeam = {
      id: `mt_${Date.now()}`,
      name: newTeamName.trim(),
      logo: newTeamLogo,
      players: [],
    };
    saveMyTeams([...myTeams, newTeam]);
    setNewTeamName("");
    setNewTeamLogo(undefined);
    setShowCreateTeam(false);
  }

  function handleAddMyTeamPlayer(teamId: string, player: Player) {
    const updated = myTeams.map((t) =>
      t.id === teamId ? { ...t, players: [...t.players, player] } : t,
    );
    saveMyTeams(updated);
  }

  function handleEditMyTeamPlayer(teamId: string, player: Player) {
    const updated = myTeams.map((t) =>
      t.id === teamId
        ? {
            ...t,
            players: t.players.map((p) => (p.id === player.id ? player : p)),
          }
        : t,
    );
    saveMyTeams(updated);
  }

  function handleDeleteMyTeamPlayer(teamId: string, playerId: string) {
    const updated = myTeams.map((t) =>
      t.id === teamId
        ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
        : t,
    );
    saveMyTeams(updated);
  }

  function handleDeleteMyTeam(teamId: string) {
    saveMyTeams(myTeams.filter((t) => t.id !== teamId));
  }

  function handleEditMyTeamName(teamId: string, name: string) {
    const updated = myTeams.map((t) => (t.id === teamId ? { ...t, name } : t));
    saveMyTeams(updated);
  }

  function handleLogin(user: CcbUser) {
    setCurrentUser(user);
    // Load this user's teams from localStorage
    try {
      const saved = localStorage.getItem(`ccb_myteams_${user.phone}`);
      setMyTeams(saved ? JSON.parse(saved) : []);
    } catch {
      setMyTeams([]);
    }
    // Backend: register user + pull synced teams (fire and forget)
    if (actor) {
      actor.registerUser(user.phone, user.name).catch(() => {});
      actor
        .getTeamByPhone(user.phone)
        .then((json) => {
          if (json && json !== "[]") {
            try {
              const synced: MyTeam[] = JSON.parse(json);
              setMyTeams((prev) => {
                const existingIds = new Set(prev.map((t) => t.id));
                const newTeams = synced.filter((t) => !existingIds.has(t.id));
                if (newTeams.length === 0) return prev;
                const merged = [...prev, ...newTeams];
                try {
                  localStorage.setItem(
                    `ccb_myteams_${user.phone}`,
                    JSON.stringify(merged),
                  );
                } catch {}
                return merged;
              });
            } catch {}
          }
        })
        .catch(() => {});
      // Pull synced rules on login
      actor
        .getRulesByPhone(user.phone)
        .then((json) => {
          if (json && json !== "[]") {
            try {
              const synced = JSON.parse(json);
              const existing = localStorage.getItem("ccb_rules");
              if (!existing) {
                localStorage.setItem("ccb_rules", json);
              } else {
                const localRules = JSON.parse(existing) as Array<{
                  id: string;
                }>;
                const existingIds = new Set(
                  localRules.map((r: { id: string }) => r.id),
                );
                const newRules = synced.filter(
                  (r: { id: string }) => !existingIds.has(r.id),
                );
                if (newRules.length > 0) {
                  localStorage.setItem(
                    "ccb_rules",
                    JSON.stringify([...localRules, ...newRules]),
                  );
                }
              }
            } catch {}
          }
        })
        .catch(() => {});
    }
  }

  function handleUnlockAdmin() {
    if (isAdminUnlocked) {
      adminLogout();
      return;
    }
    setAdminPwdDialog(true);
  }

  function handleTab(tab: Tab) {
    setActiveTab(tab);
    if (tab === "home") setView("home");
    else if (tab === "teams") setView("teams-tab");
    else if (tab === "matches") setView("matches-tab");
    else if (tab === "community") setView("community-tab");
  }

  function handleStartMatch(teamA: Team, teamB: Team, overs: number) {
    setSetupTeamA(teamA);
    setSetupTeamB(teamB);
    setSetupOvers(overs);
    setPendingMatchSetup({ teamA, teamB, overs, isSecondInnings: false });
    setView("player-selection");
  }

  function handleInnings1End(finalInnings: InningsState) {
    setInnings1(finalInnings);
    setView("innings-switch");
  }

  function handleStart2nd() {
    if (!innings1) return;
    const battingTeam = innings1.bowlingTeam;
    const bowlingTeam = innings1.battingTeam;
    setPendingMatchSetup({
      teamA: battingTeam,
      teamB: bowlingTeam,
      overs: setupOvers,
      isSecondInnings: true,
    });
    setView("player-selection");
  }

  function handlePlayerSelectionConfirm(
    strikerName: string,
    nonStrikerName: string,
    bowlerName: string,
  ) {
    if (!pendingMatchSetup) return;
    const { teamA, teamB, overs: _overs, isSecondInnings } = pendingMatchSetup;

    const strikerPlayer: Player = {
      id: `p_sel_${Date.now()}_1`,
      name: strikerName,
    };
    const nonStrikerPlayer: Player = {
      id: `p_sel_${Date.now()}_2`,
      name: nonStrikerName,
    };

    const innings = initInnings(teamA, teamB);
    const updatedInnings: InningsState = {
      ...innings,
      activeBatsmen: [
        { ...innings.activeBatsmen[0], player: strikerPlayer },
        { ...innings.activeBatsmen[1], player: nonStrikerPlayer },
      ],
    };

    if (!isSecondInnings) {
      setInnings1(updatedInnings);
      setInnings2(null);
      setCurrentInningsNum(1);
    } else {
      setInnings2(updatedInnings);
      setCurrentInningsNum(2);
    }

    setPendingInitialBowler(bowlerName);
    setPendingMatchSetup(null);
    smartBackup();
    setView("scoring");
  }

  function handleInnings2End(finalInnings: InningsState) {
    setInnings2(finalInnings);
    const i1 = innings1!;
    const result = calcResult(i1, finalInnings);
    const record: MatchRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-PK"),
      time: new Date().toLocaleTimeString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      teamA: setupTeamA!,
      teamB: setupTeamB!,
      totalOvers: setupOvers,
      innings1: i1,
      innings2: finalInnings,
      resultText: result,
    };
    const updated = [record, ...pastMatches].slice(0, 10);
    setPastMatches(updated);
    try {
      smartBackup();
      localStorage.setItem("ccb_past_matches", JSON.stringify(updated));
    } catch {}
    // Backend sync match (fire and forget)
    if (actor) {
      actor
        .syncMatch(currentUser?.phone ?? "anon", JSON.stringify(record))
        .catch(() => {});
    }
    // Auto-sync to tournament engine v2
    try {
      const savedT2 = localStorage.getItem("ccb_tournament_v2");
      if (savedT2) {
        const t2Data = JSON.parse(savedT2);
        const syncedT2 = syncMatchToTournament(t2Data, record);
        if (syncedT2 !== t2Data) {
          localStorage.setItem("ccb_tournament_v2", JSON.stringify(syncedT2));
        }
      }
    } catch {}
    updatePlayerStatsAfterMatch(record);
    setCurrentMatch(record);
    setView("result");
  }

  const activeInnings = currentInningsNum === 1 ? innings1 : innings2;
  const setActiveInnings = currentInningsNum === 1 ? setInnings1 : setInnings2;

  const target =
    currentInningsNum === 2 && innings1 ? innings1.totalRuns + 1 : undefined;

  const lastMotm =
    pastMatches.length > 0
      ? (pastMatches[0].resultText?.match(
          /🏆 Man of the Match: (.+?)(?:\n|$)/,
        )?.[1] ?? "")
      : "";

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen onDone={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="bg-card border-primary/30 mx-4 max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-primary font-display text-center">
              CREATE TEAM
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="create-team-name"
                className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider"
              >
                Team Name *
              </label>
              <input
                id="create-team-name"
                data-ocid="create_team.name.input"
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                placeholder="e.g. Desert Hawks"
                className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <p className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Team Logo (optional)
              </p>
              <label
                data-ocid="create_team.logo.upload_button"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/20 text-white/60 text-sm cursor-pointer hover:border-primary/40 transition-colors"
              >
                <span>📷</span>
                <span>
                  {newTeamLogo ? "Logo selected ✓" : "Upload logo from gallery"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      setNewTeamLogo(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button
              type="button"
              data-ocid="create_team.cancel_button"
              onClick={() => {
                setShowCreateTeam(false);
                setNewTeamName("");
                setNewTeamLogo(undefined);
              }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-white/20 text-white/60 cursor-pointer bg-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="create_team.submit_button"
              onClick={handleCreateTeam}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm cursor-pointer text-black border-0"
              style={{ background: "linear-gradient(135deg,#00e676,#00b248)" }}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Admin Password Dialog */}
      <AdminLoginModal
        open={adminPwdDialog}
        onClose={() => setAdminPwdDialog(false)}
        onLogin={(pwd) => {
          const ok = adminLogin(pwd);
          if (ok) setAdminPwdDialog(false);
          return ok;
        }}
      />

      <AnimatePresence mode="wait">
        {view === "home" && (
          <HomeView
            key="home"
            onSetup={() => setView("setup")}
            onTeams={() => setView("teams")}
            onEditTeams={() => setShowEditTeams(true)}
            onTournament={() => setView("tournament")}
            onFixedSchedule={() => setView("fixed-schedule")}
            onLiveMatch={() => setView("live-match")}
            onScoreBoard={() => setView("scoreboard")}
            pastMatches={pastMatches}
            currentUser={currentUser}
            myTeamsCount={myTeams.length}
            onCreateTeam={() => setShowCreateTeam(true)}
            onLogout={() => {
              try {
                localStorage.removeItem("ccb_user");
              } catch {}
              setCurrentUser(null);
              setMyTeams([]);
            }}
            isAdmin={isAdminUnlocked}
            onAdminLogin={handleUnlockAdmin}
            onAdminLogout={adminLogout}
            myTeams={myTeams}
            onAddPlayer={(_team) => {
              setView("teams-tab");
            }}
            onRules={() => setView("rules")}
            onAnalytics={() => setView("analytics")}
            onPlayerLeaderboard={() => setView("player-leaderboard")}
          />
        )}

        {view === "teams" && (
          <TeamsView key="teams" onBack={() => setView("home")} teams={teams} />
        )}

        {view === "setup" && (
          <SetupView
            key="setup"
            onBack={() => setView("home")}
            onStart={handleStartMatch}
            teams={teams}
            myTeams={myTeams}
          />
        )}

        {view === "player-selection" && pendingMatchSetup && (
          <PlayerSelectionView
            key="player-selection"
            battingTeam={pendingMatchSetup.teamA}
            bowlingTeam={pendingMatchSetup.teamB}
            inningsNum={pendingMatchSetup.isSecondInnings ? 2 : 1}
            onBack={() => {
              setPendingMatchSetup(null);
              setView(
                pendingMatchSetup?.isSecondInnings ? "innings-switch" : "setup",
              );
            }}
            onConfirm={handlePlayerSelectionConfirm}
          />
        )}

        {view === "scoring" && activeInnings && (
          <ScoringView
            key={`scoring-${currentInningsNum}`}
            innings={activeInnings}
            inningsNum={currentInningsNum}
            totalOvers={setupOvers}
            target={target}
            onUpdate={(next) => setActiveInnings(next)}
            onHome={() => setView("home")}
            initialBowlerName={pendingInitialBowler || undefined}
            onInningsEnd={
              currentInningsNum === 1 ? handleInnings1End : handleInnings2End
            }
          />
        )}

        {view === "innings-switch" && innings1 && (
          <InningsSwitchView
            key="innings-switch"
            innings1={innings1}
            onStart2nd={handleStart2nd}
          />
        )}

        {view === "result" && currentMatch && (
          <ResultView
            key="result"
            match={currentMatch}
            onNewMatch={() => {
              setView("home");
              setCurrentMatch(null);
            }}
          />
        )}

        {view === "tournament" && (
          <TournamentEngine
            key="tournament"
            onBack={() => setView("home")}
            teams={teams}
            myTeams={myTeams}
            completedMatches={pastMatches}
            isAdmin={isAdminUnlocked}
            onStartMatch={handleTournamentStartMatch}
          />
        )}

        {view === "match-info" && (
          <MatchInfoView
            key="match-info"
            onBack={() => setView("home")}
            cards={matchInfoCards}
            onUpdate={handleUpdateMatchInfoCards}
            lastMotm={lastMotm}
            externalAdminUnlocked={isAdminUnlocked}
          />
        )}

        {view === "fixed-schedule" && (
          <FixedScheduleView
            key="fixed-schedule"
            teams={teams}
            myTeams={myTeams}
            isAdmin={isAdminUnlocked}
            onHome={() => setView("home")}
          />
        )}

        {view === "announcements" && (
          <AnnouncementsView
            key="announcements"
            onHome={() => setView("home")}
          />
        )}

        {view === "live-match" && (
          <LiveMatchView key="live-match" onBack={() => setView("home")} />
        )}

        {view === "scoreboard" && (
          <ScoreBoardTemplate key="scoreboard" onBack={() => setView("home")} />
        )}

        {view === "post-vote" && (
          <PostVoteView
            key="post-vote"
            onHome={() => setView("home")}
            teams={teams}
          />
        )}
        {view === "teams-tab" && (
          <TeamsTabView
            key="teams-tab"
            teams={teams}
            myTeams={myTeams}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockAdmin={handleUnlockAdmin}
            onAddPlayer={handleAddPlayer}
            onEditPlayer={handleEditPlayer}
            onDeletePlayer={handleDeletePlayer}
            onAddMyTeamPlayer={handleAddMyTeamPlayer}
            onEditMyTeamPlayer={handleEditMyTeamPlayer}
            onDeleteMyTeamPlayer={handleDeleteMyTeamPlayer}
            onDeleteMyTeam={handleDeleteMyTeam}
            onEditMyTeamName={handleEditMyTeamName}
            onCreateTeam={() => setShowCreateTeam(true)}
          />
        )}

        {view === "matches-tab" && (
          <MatchesTabView
            key="matches-tab"
            pastMatches={pastMatches}
            onStartMatch={() => setView("setup")}
            onTournament={() => setView("tournament")}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockAdmin={handleUnlockAdmin}
            onDeleteMatch={handleDeleteMatch}
          />
        )}

        {view === "community-tab" && (
          <CommunityTabView key="community-tab" teams={teams} />
        )}

        {view === "rules" && (
          <RulesPage
            key="rules"
            isAdmin={isAdminUnlocked}
            onBack={() => setView("home")}
            onAdminLogin={handleUnlockAdmin}
            actor={actor}
            userPhone={currentUser?.phone}
          />
        )}

        {view === "player-leaderboard" && (
          <PlayerLeaderboardView
            key="player-leaderboard"
            onBack={() => setView("home")}
          />
        )}

        {view === "analytics" && (
          <AnalyticsDashboard
            key="analytics"
            isAdmin={isAdminUnlocked}
            onAdminLogin={handleUnlockAdmin}
            onBack={() => setView("home")}
            pastMatchesCount={pastMatches.length}
          />
        )}
      </AnimatePresence>

      {/* Fixed Bottom Navigation — hidden during scoring */}
      {!["scoring", "innings-switch"].includes(view) && (
        <BottomNav activeTab={activeTab} onTab={handleTab} />
      )}

      <EditTeamsDialog
        open={showEditTeams}
        teams={teams}
        onSave={(updated) => {
          setTeams(updated);
          saveTeams(updated);
          setShowEditTeams(false);
        }}
        onClose={() => setShowEditTeams(false)}
      />
      {/* Creator Branding Footer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          textAlign: "center",
          fontSize: "11px",
          opacity: 0.6,
          color: "#ffffff",
          paddingBottom: "calc(56px + 4px)",
          paddingTop: "4px",
          paddingLeft: "12px",
          paddingRight: "12px",
          pointerEvents: "none",
          letterSpacing: "0.02em",
        }}
      >
        Created by Shahzad Sultan | 0341 889 0677
      </div>
    </div>
  );
}
