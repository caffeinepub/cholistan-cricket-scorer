/**
 * TournamentEngine.tsx
 * Full Auto Tournament Engine for CCB SCORING PRO
 * Pools → Points Table → Qualification → Knockout → Final
 */
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
}

interface Pool {
  id: string;
  name: string; // A, B, C, D
  teamIds: string[];
  poolTeamOrder: string[]; // ordered teamIds as admin placed them
}

interface TPoolMatch {
  id: string;
  poolId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeRuns?: number;
  awayRuns?: number;
  homeBalls?: number;
  awayBalls?: number;
  totalOvers: number;
  status: "scheduled" | "completed" | "tied";
  isNightMatch?: boolean;
  isManual?: boolean;
  linkedMatchId?: string;
  time?: string;
  date?: string;
  matchNumber?: number;
  matchTime?: string;
  matchDate?: string;
}

type KRound = "qf" | "sf" | "final";

interface KnockoutMatch {
  id: string;
  round: KRound;
  slot: number;
  label: string; // "QF 1", "Semi Final 1", "FINAL"
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  homeRuns?: number;
  awayRuns?: number;
  isNightMatch?: boolean;
  isManual?: boolean;
  linkedMatchId?: string;
  time?: string;
  status: "pending" | "completed" | "tied";
}

type TournamentStage = "setup" | "pool" | "knockout" | "complete";

interface EngineData {
  name: string;
  tournamentId?: string;
  tournamentName?: string;
  selectedTeamIds: string[];
  pools: Pool[];
  poolMatches: TPoolMatch[];
  knockoutMatches: KnockoutMatch[];
  stage: TournamentStage;
  createdAt: string;
  manualPoolRankings: Record<string, string[]>;
}

const EMPTY_ENGINE: EngineData = {
  name: "CCB Tournament 2025",
  tournamentId: "main_event",
  tournamentName: "Main Tournament",
  selectedTeamIds: [],
  pools: [],
  poolMatches: [],
  knockoutMatches: [],
  stage: "setup",
  createdAt: "",
  manualPoolRankings: {},
};

const STORAGE_KEY = "ccb_tournament_v2";

// Fixed 5-team pool schedule (0-indexed positions in poolTeamOrder)
const FIXED_5_TEAM_SCHEDULE: [number, number][] = [
  [0, 1], // Match 1: Team1 vs Team2
  [2, 3], // Match 2: Team3 vs Team4
  [4, 0], // Match 3: Team5 vs Team1
  [1, 2], // Match 4: Team2 vs Team3
  [3, 4], // Match 5: Team4 vs Team5
  [0, 2], // Match 6: Team1 vs Team3
  [1, 4], // Match 7: Team2 vs Team5
  [3, 0], // Match 8: Team4 vs Team1
  [2, 4], // Match 9: Team3 vs Team5
  [1, 3], // Match 10: Team2 vs Team4
];

// Converts "4.3" (4 overs 3 balls) → 27 balls. Pure integer input like "27" is returned as-is.
function parseOvers(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    const overs = Math.floor(Math.abs(Number(parts[0]))) || 0;
    const balls = Math.min(Math.abs(Number(parts[1] || "0")), 5);
    return overs * 6 + balls;
  }
  return Math.abs(Number.parseInt(trimmed)) || 0;
}

// Converts balls back to "X.Y" overs notation for display
function ballsToOversStr(balls: number): string {
  const ov = Math.floor(balls / 6);
  const b = balls % 6;
  return b === 0 ? `${ov}.0` : `${ov}.${b}`;
}

interface CompletedMatch {
  id: string;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  innings1?: { battingTeam: { id: string }; totalRuns: number; balls: number };
  innings2?: { battingTeam: { id: string }; totalRuns: number; balls: number };
  resultText?: string;
}

export interface StartMatchParams {
  teamAId: string;
  teamBId: string;
  overs: number;
  tournamentMatchId: string;
  matchTag: string;
}

export interface TournamentEngineProps {
  onBack: () => void;
  teams: Team[];
  myTeams?: {
    id: string;
    name: string;
    players: { id: string; name: string }[];
  }[];
  completedMatches: CompletedMatch[];
  isAdmin: boolean;
  onStartMatch?: (params: StartMatchParams) => void;
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

// generatePools kept for legacy compat
function _generatePools(): Pool[] {
  return ["A", "B", "C", "D"].map((name) => ({
    id: `pool_${name}`,
    name,
    teamIds: [],
    poolTeamOrder: [],
  }));
}

function generateFixedSchedule(pools: Pool[]): TPoolMatch[] {
  const matches: TPoolMatch[] = [];
  let baseId = Date.now();
  for (const pool of pools) {
    const order =
      pool.poolTeamOrder.length === pool.teamIds.length
        ? pool.poolTeamOrder
        : pool.teamIds;
    if (order.length === 5) {
      FIXED_5_TEAM_SCHEDULE.forEach(([i, j], idx) => {
        matches.push({
          id: String(baseId++),
          poolId: pool.id,
          homeTeamId: order[i],
          awayTeamId: order[j],
          totalOvers: 6,
          status: "scheduled",
          matchNumber: idx + 1,
          isManual: false,
        });
      });
    } else {
      // Fallback round-robin for non-5-team pools
      let matchNum = 1;
      for (let i = 0; i < order.length; i++) {
        for (let j = i + 1; j < order.length; j++) {
          matches.push({
            id: String(baseId++),
            poolId: pool.id,
            homeTeamId: order[i],
            awayTeamId: order[j],
            totalOvers: 6,
            status: "scheduled",
            matchNumber: matchNum++,
            isManual: false,
          });
        }
      }
    }
  }
  return matches;
}

interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
}

function calcStandings(
  pool: Pool,
  matches: TPoolMatch[],
  teams: Team[],
): Standing[] {
  const map = new Map<string, Standing>();
  for (const tid of pool.teamIds) {
    map.set(tid, {
      teamId: tid,
      teamName: teams.find((t) => t.id === tid)?.name ?? tid,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0,
    });
  }
  const runsFor = new Map<string, number>();
  const ballsFor = new Map<string, number>();
  const runsAgainst = new Map<string, number>();
  const ballsAgainst = new Map<string, number>();
  for (const tid of pool.teamIds) {
    runsFor.set(tid, 0);
    ballsFor.set(tid, 0);
    runsAgainst.set(tid, 0);
    ballsAgainst.set(tid, 0);
  }

  const poolMatches = matches.filter(
    (m) =>
      m.poolId === pool.id && (m.status === "completed" || m.status === "tied"),
  );

  for (const m of poolMatches) {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    const hr = m.homeRuns ?? 0;
    const ar = m.awayRuns ?? 0;
    const hb = m.homeBalls ?? m.totalOvers * 6;
    const ab = m.awayBalls ?? m.totalOvers * 6;
    runsFor.set(m.homeTeamId, (runsFor.get(m.homeTeamId) ?? 0) + hr);
    ballsFor.set(m.homeTeamId, (ballsFor.get(m.homeTeamId) ?? 0) + hb);
    runsAgainst.set(m.homeTeamId, (runsAgainst.get(m.homeTeamId) ?? 0) + ar);
    ballsAgainst.set(m.homeTeamId, (ballsAgainst.get(m.homeTeamId) ?? 0) + ab);
    runsFor.set(m.awayTeamId, (runsFor.get(m.awayTeamId) ?? 0) + ar);
    ballsFor.set(m.awayTeamId, (ballsFor.get(m.awayTeamId) ?? 0) + ab);
    runsAgainst.set(m.awayTeamId, (runsAgainst.get(m.awayTeamId) ?? 0) + hr);
    ballsAgainst.set(m.awayTeamId, (ballsAgainst.get(m.awayTeamId) ?? 0) + hb);
    if (m.status === "tied") {
      home.tied++;
      away.tied++;
      home.points += 1;
      away.points += 1;
    } else if (hr > ar) {
      home.won++;
      home.points += 2;
      away.lost++;
    } else {
      away.won++;
      away.points += 2;
      home.lost++;
    }
  }

  // Calculate NRR
  for (const [tid, s] of map) {
    const rf = runsFor.get(tid) ?? 0;
    const bf = ballsFor.get(tid) ?? 0;
    const ra = runsAgainst.get(tid) ?? 0;
    const ba = ballsAgainst.get(tid) ?? 0;
    const rrFor = bf > 0 ? rf / (bf / 6) : 0;
    const rrAgainst = ba > 0 ? ra / (ba / 6) : 0;
    s.nrr = rrFor - rrAgainst;
  }

  const poolOrder = pool.poolTeamOrder;
  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (Math.abs(b.nrr - a.nrr) > 0.001) return b.nrr - a.nrr;
    // Tie-breaker: admin-defined pool position
    return poolOrder.indexOf(a.teamId) - poolOrder.indexOf(b.teamId);
  });
}

function generateKnockout(
  pools: Pool[],
  allStandings: Map<string, Standing[]>,
): KnockoutMatch[] {
  const getTop2 = (pool: Pool) => {
    const s = allStandings.get(pool.id) ?? [];
    return [s[0]?.teamId ?? null, s[1]?.teamId ?? null];
  };

  let qfSeeds: Array<[string | null, string | null]> = [];

  if (pools.length === 4) {
    const [pA, pB, pC, pD] = pools;
    const [a1, a2] = getTop2(pA);
    const [b1, b2] = getTop2(pB);
    const [c1, c2] = getTop2(pC);
    const [d1, d2] = getTop2(pD);
    qfSeeds = [
      [a1, c2],
      [a2, c1],
      [b1, d2],
      [b2, d1],
    ];
  } else if (pools.length === 2) {
    const [pA, pB] = pools;
    const [a1, a2] = getTop2(pA);
    const [b1, b2] = getTop2(pB);
    qfSeeds = [
      [a1, b2],
      [a2, b1],
      [null, null],
      [null, null],
    ];
  } else {
    // 3 pools: best 2 from each + 2 best 3rd place
    for (const pool of pools) {
      const [a1, a2] = getTop2(pool);
      qfSeeds.push([a1, null]);
      qfSeeds.push([a2, null]);
    }
    qfSeeds = qfSeeds.slice(0, 4).map(([a]) => [a, null]);
  }

  const baseId = Date.now();
  const qfs: KnockoutMatch[] = qfSeeds.map(([tA, tB], i) => ({
    id: `qf${i + 1}_${baseId}`,
    round: "qf",
    slot: i + 1,
    label: `QF ${i + 1}`,
    teamAId: tA,
    teamBId: tB,
    winnerId: null,
    status: "pending",
  }));

  const sfs: KnockoutMatch[] = [
    {
      id: `sf1_${baseId}`,
      round: "sf",
      slot: 1,
      label: "Semi Final 1",
      teamAId: null,
      teamBId: null,
      winnerId: null,
      status: "pending",
    },
    {
      id: `sf2_${baseId}`,
      round: "sf",
      slot: 2,
      label: "Semi Final 2",
      teamAId: null,
      teamBId: null,
      winnerId: null,
      status: "pending",
    },
  ];

  const final: KnockoutMatch = {
    id: `final_${baseId}`,
    round: "final",
    slot: 1,
    label: "FINAL",
    teamAId: null,
    teamBId: null,
    winnerId: null,
    status: "pending",
  };

  return [...qfs, ...sfs, final];
}

function autoProgressKnockout(matches: KnockoutMatch[]): KnockoutMatch[] {
  let updated = [...matches];

  // Fill SF slots from QF winners
  const qf1W = updated.find((m) => m.id.startsWith("qf1"))?.winnerId;
  const qf2W = updated.find((m) => m.id.startsWith("qf2"))?.winnerId;
  const qf3W = updated.find((m) => m.id.startsWith("qf3"))?.winnerId;
  const qf4W = updated.find((m) => m.id.startsWith("qf4"))?.winnerId;

  updated = updated.map((m) => {
    if (m.round === "sf" && m.slot === 1) {
      return {
        ...m,
        teamAId: qf1W ?? m.teamAId,
        teamBId: qf2W ?? m.teamBId,
      };
    }
    if (m.round === "sf" && m.slot === 2) {
      return {
        ...m,
        teamAId: qf3W ?? m.teamAId,
        teamBId: qf4W ?? m.teamBId,
      };
    }
    return m;
  });

  // Fill Final from SF winners
  const sf1W = updated.find((m) => m.round === "sf" && m.slot === 1)?.winnerId;
  const sf2W = updated.find((m) => m.round === "sf" && m.slot === 2)?.winnerId;
  updated = updated.map((m) => {
    if (m.round === "final") {
      return {
        ...m,
        teamAId: sf1W ?? m.teamAId,
        teamBId: sf2W ?? m.teamBId,
      };
    }
    return m;
  });

  return updated;
}

// Auto-sync a completed MatchRecord to the tournament
export function syncMatchToTournament(
  data: EngineData,
  match: CompletedMatch,
): EngineData {
  if (!match.innings1 || !match.innings2) return data;
  const teamIds = new Set([match.teamA.id, match.teamB.id]);

  // Determine winner
  const i1 = match.innings1;
  const i2 = match.innings2;
  const battingFirstId = i1.battingTeam.id;
  const battingSecondId = i2.battingTeam.id;
  let winnerId: string | null = null;
  let homeRuns: number;
  let awayRuns: number;
  let homeBalls: number;
  let awayBalls: number;

  if (i1.totalRuns > i2.totalRuns) {
    winnerId = battingFirstId;
  } else if (i2.totalRuns > i1.totalRuns) {
    winnerId = battingSecondId;
  }

  // Check pool matches first
  const poolMatchIdx = data.poolMatches.findIndex(
    (m) =>
      m.status === "scheduled" &&
      !m.isManual &&
      teamIds.has(m.homeTeamId) &&
      teamIds.has(m.awayTeamId),
  );

  if (poolMatchIdx >= 0) {
    const pm = data.poolMatches[poolMatchIdx];
    homeRuns = pm.homeTeamId === battingFirstId ? i1.totalRuns : i2.totalRuns;
    awayRuns = pm.awayTeamId === battingFirstId ? i1.totalRuns : i2.totalRuns;
    homeBalls = pm.homeTeamId === battingFirstId ? i1.balls : i2.balls;
    awayBalls = pm.awayTeamId === battingFirstId ? i1.balls : i2.balls;
    const newPoolMatches = [...data.poolMatches];
    newPoolMatches[poolMatchIdx] = {
      ...pm,
      homeRuns,
      awayRuns,
      homeBalls,
      awayBalls,
      status: homeRuns === awayRuns ? "tied" : "completed",
      linkedMatchId: match.id,
    };
    return { ...data, poolMatches: newPoolMatches };
  }

  // Check knockout matches
  const kmIdx = data.knockoutMatches.findIndex(
    (m) =>
      m.status === "pending" &&
      !m.isManual &&
      m.teamAId !== null &&
      m.teamBId !== null &&
      teamIds.has(m.teamAId) &&
      teamIds.has(m.teamBId),
  );

  if (kmIdx >= 0) {
    const km = data.knockoutMatches[kmIdx];
    homeRuns = km.teamAId === battingFirstId ? i1.totalRuns : i2.totalRuns;
    awayRuns = km.teamBId === battingFirstId ? i1.totalRuns : i2.totalRuns;
    const newKm = {
      ...km,
      homeRuns,
      awayRuns,
      winnerId,
      status:
        homeRuns === awayRuns ? ("tied" as const) : ("completed" as const),
      linkedMatchId: match.id,
    };
    const newKms = [...data.knockoutMatches];
    newKms[kmIdx] = newKm;
    return { ...data, knockoutMatches: autoProgressKnockout(newKms) };
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

const ADMIN_PWD = "Shahzad@99";

type EngineTab = "setup" | "pools" | "table" | "qualified" | "bracket";

export function TournamentEngine({
  onBack,
  teams,
  myTeams,
  completedMatches,
  isAdmin: externalAdmin,
  onStartMatch,
}: TournamentEngineProps) {
  const [data, setData] = useState<EngineData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EngineData;
        if (parsed.pools) {
          parsed.pools = parsed.pools.map((p) => ({
            ...p,
            poolTeamOrder: p.poolTeamOrder?.length
              ? p.poolTeamOrder
              : [...p.teamIds],
          }));
        }
        if (!parsed.manualPoolRankings) parsed.manualPoolRankings = {};
        if (!parsed.tournamentId) parsed.tournamentId = "main_event";
        if (!parsed.tournamentName) parsed.tournamentName = "Main Tournament";
        return parsed;
      }
    } catch {
      try {
        const backup = localStorage.getItem("ccb_backup");
        if (backup) {
          const parsed = JSON.parse(backup);
          const t = parsed.ccb_tournament ?? parsed;
          if (t?.pools) {
            if (!t.manualPoolRankings) t.manualPoolRankings = {};
            return t as EngineData;
          }
        }
      } catch {}
    }
    return EMPTY_ENGINE;
  });

  const [tab, setTab] = useState<EngineTab>("setup");

  const [poolAssignments, setPoolAssignments] = useState<
    Record<string, string[]>
  >(() => {
    if (data.pools && data.pools.length === 4) {
      const result: Record<string, string[]> = {};
      for (const p of data.pools) {
        result[p.id] = [
          ...(p.poolTeamOrder.length ? p.poolTeamOrder : p.teamIds),
        ];
      }
      return result;
    }
    return { pool_A: [], pool_B: [], pool_C: [], pool_D: [] };
  });

  const [adminUnlocked, setAdminUnlocked] = useState(externalAdmin);
  const [pwdDialog, setPwdDialog] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  // Score entry dialog
  const [scoreDialog, setScoreDialog] = useState<{
    open: boolean;
    matchId: string;
    homeRuns: string;
    awayRuns: string;
    homeBalls: string;
    awayBalls: string;
    homeOvers: string;
    awayOvers: string;
    totalOvers: string;
    isKnockout: boolean;
    winnerId: string;
  } | null>(null);

  const [resetConfirm, setResetConfirm] = useState(false);
  const [editScheduleMode, setEditScheduleMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [allTournaments, setAllTournaments] = useState<
    { id: string; name: string }[]
  >(() => {
    try {
      const saved = localStorage.getItem("ccb_all_tournaments");
      if (saved) return JSON.parse(saved);
    } catch {}
    const hasMain =
      !!localStorage.getItem("ccb_tournament_main_event") ||
      !!localStorage.getItem(STORAGE_KEY);
    return hasMain ? [{ id: "main_event", name: "Main Tournament" }] : [];
  });
  const [showTournamentSelect, setShowTournamentSelect] = useState(false);
  const [showAddMatchDlg, setShowAddMatchDlg] = useState(false);
  const [addMatchPoolId, setAddMatchPoolId] = useState("pool_A");
  const [addMatchHome, setAddMatchHome] = useState("");
  const [addMatchAway, setAddMatchAway] = useState("");
  const [editingTimeMatchId, setEditingTimeMatchId] = useState<string | null>(
    null,
  );
  const [timeInput, setTimeInput] = useState("");
  const [dateInput, setDateInput] = useState("");

  // Persist to localStorage on every change (multi-key + backup)
  const prevDataRef = useRef(data);
  useEffect(() => {
    if (data !== prevDataRef.current) {
      try {
        // Write backup FIRST to prevent data loss
        const backupObj = {
          ccb_tournament: data,
          ccb_pools: data.pools,
          ccb_schedule: data.poolMatches,
        };
        localStorage.setItem("ccb_backup", JSON.stringify(backupObj));
        // Then write main keys
        localStorage.setItem("ccb_pools", JSON.stringify(data.pools));
        localStorage.setItem("ccb_schedule", JSON.stringify(data.poolMatches));
        localStorage.setItem(
          "ccb_matches",
          JSON.stringify(data.knockoutMatches),
        );
        const dynamicKey = `ccb_tournament_${data.tournamentId || "main_event"}`;
        localStorage.setItem(dynamicKey, JSON.stringify(data));
        if (dynamicKey !== STORAGE_KEY)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem("ccb_tournament", JSON.stringify(data));
        prevDataRef.current = data;
      } catch (e) {
        console.error("Save error", e);
      }
    }
  }, [data]);

  // Sync poolAssignments when data.pools changes (e.g. after load or reset)
  useEffect(() => {
    if (data.pools && data.pools.length > 0) {
      const result: Record<string, string[]> = {};
      for (const p of data.pools) {
        result[p.id] = [
          ...(p.poolTeamOrder.length ? p.poolTeamOrder : p.teamIds),
        ];
      }
      setPoolAssignments(result);
    }
  }, [data.pools]);

  // Auto-sync completed matches from scoring system
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!completedMatches.length || !data.pools.length) return;
    let current = data;
    let changed = false;
    for (const match of completedMatches) {
      const next = syncMatchToTournament(current, match);
      if (next !== current) {
        current = next;
        changed = true;
      }
    }
    if (changed) setData(current);
  }, [completedMatches]); // eslint-disable-line

  // Save tournament list
  useEffect(() => {
    try {
      localStorage.setItem(
        "ccb_all_tournaments",
        JSON.stringify(allTournaments),
      );
    } catch {}
  }, [allTournaments]);

  // Keep admin in sync with external
  useEffect(() => {
    if (externalAdmin) setAdminUnlocked(true);
  }, [externalAdmin]);

  function save(patch: Partial<EngineData>) {
    setData((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  }

  // ── SETUP ────────────────────────────────────────────────────

  const allTeams = [
    ...teams,
    ...(myTeams ?? []).map((mt) => ({
      id: mt.id,
      name: mt.name,
      players: mt.players.map((p) => ({ id: p.id, name: p.name })),
    })),
  ];

  // ── POOL TEAM ORDER ──────────────────────────────────────────

  function _moveTeamInPool(
    poolId: string,
    teamId: string,
    direction: "up" | "down",
  ) {
    const newPools = data.pools.map((pool) => {
      if (pool.id !== poolId) return pool;
      const order = [...pool.poolTeamOrder];
      const idx = order.indexOf(teamId);
      if (idx === -1) return pool;
      if (direction === "up" && idx > 0) {
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
      } else if (direction === "down" && idx < order.length - 1) {
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      }
      return { ...pool, poolTeamOrder: order };
    });
    const updatedPool = newPools.find((p) => p.id === poolId);
    if (!updatedPool) return;
    const newMatches = generateFixedSchedule([updatedPool]);
    const existingManual = data.poolMatches.filter(
      (m) => m.poolId === poolId && m.isManual === true,
    );
    const otherMatches = data.poolMatches.filter((m) => m.poolId !== poolId);
    const mergedNew = newMatches.map((nm) => {
      const manual = existingManual.find(
        (em) =>
          em.homeTeamId === nm.homeTeamId && em.awayTeamId === nm.awayTeamId,
      );
      return manual ?? nm;
    });
    save({ pools: newPools, poolMatches: [...otherMatches, ...mergedNew] });
  }

  // ── EDIT SCHEDULE ────────────────────────────────────────────

  function moveMatch(matchId: string, direction: "up" | "down") {
    const matches = [...data.poolMatches];
    const idx = matches.findIndex((m) => m.id === matchId);
    if (idx === -1) return;
    if (direction === "up" && idx > 0) {
      [matches[idx - 1], matches[idx]] = [matches[idx], matches[idx - 1]];
      // mark the match that moved (now at idx-1)
      matches[idx - 1] = { ...matches[idx - 1], isManual: true };
    } else if (direction === "down" && idx < matches.length - 1) {
      [matches[idx], matches[idx + 1]] = [matches[idx + 1], matches[idx]];
      // mark the match that moved (now at idx+1)
      matches[idx + 1] = { ...matches[idx + 1], isManual: true };
    }
    save({ poolMatches: matches });
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, _idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(
    e: React.DragEvent,
    poolId: string,
    targetIdx: number,
    poolMatches: TPoolMatch[],
  ) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIdx) {
      setDragIndex(null);
      return;
    }
    const reordered = [...poolMatches];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIdx, 0, { ...moved, isManual: true });
    setData((prev) => ({
      ...prev,
      poolMatches: [
        ...prev.poolMatches.filter((m) => m.poolId !== poolId),
        ...reordered,
      ],
    }));
    setDragIndex(null);
  }

  function swapMatchTeams(matchId: string) {
    const newMatches = data.poolMatches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            homeTeamId: m.awayTeamId,
            awayTeamId: m.homeTeamId,
            isManual: true,
          }
        : m,
    );
    save({ poolMatches: newMatches });
  }

  function saveMatchTime(matchId: string) {
    const newMatches = data.poolMatches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            matchTime: timeInput || m.matchTime,
            matchDate: dateInput || m.matchDate,
            isManual: true,
          }
        : m,
    );
    save({ poolMatches: newMatches });
    setEditingTimeMatchId(null);
    setTimeInput("");
    setDateInput("");
  }

  function deleteMatch(matchId: string) {
    if (!adminUnlocked) return;
    const newMatches = data.poolMatches.filter((m) => m.id !== matchId);
    save({ poolMatches: newMatches });
  }

  function addMatch() {
    if (!addMatchHome || !addMatchAway || addMatchHome === addMatchAway) return;
    const existingInPool = data.poolMatches.filter(
      (m) => m.poolId === addMatchPoolId,
    );
    const newMatch: TPoolMatch = {
      id: String(Date.now()),
      poolId: addMatchPoolId,
      homeTeamId: addMatchHome,
      awayTeamId: addMatchAway,
      totalOvers: 6,
      status: "scheduled",
      isManual: true,
      matchNumber: existingInPool.length + 1,
    };
    save({ poolMatches: [...data.poolMatches, newMatch] });
    setShowAddMatchDlg(false);
    setAddMatchHome("");
    setAddMatchAway("");
  }

  function createTournament() {
    const totalAssigned = Object.values(poolAssignments).flat().length;
    if (totalAssigned < 4) {
      alert("Please assign at least 4 teams to pools.");
      return;
    }
    const pools: Pool[] = (["A", "B", "C", "D"] as const)
      .map((name) => {
        const poolId = `pool_${name}`;
        const teamIds = poolAssignments[poolId] ?? [];
        return {
          id: poolId,
          name,
          teamIds,
          poolTeamOrder: [...teamIds],
        };
      })
      .filter((p) => p.teamIds.length >= 2);
    const poolMatches = generateFixedSchedule(pools);
    save({
      name: data.name,
      selectedTeamIds: Object.values(poolAssignments).flat(),
      pools,
      poolMatches,
      knockoutMatches: [],
      stage: "pool",
      createdAt: new Date().toISOString(),
      manualPoolRankings: {},
    });
    setTab("pools");
  }

  function resetTournament() {
    setData(EMPTY_ENGINE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setResetConfirm(false);
    setTab("setup");
  }

  // ── STANDINGS ────────────────────────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: allTeams derived from teams+myTeams
  const allStandings = useMemo(() => {
    const m = new Map<string, Standing[]>();
    for (const pool of data.pools) {
      m.set(pool.id, calcStandings(pool, data.poolMatches, allTeams));
    }
    return m;
  }, [data.pools, data.poolMatches, teams, myTeams]);

  // Display standings (with manual override applied)
  const displayStandings = useMemo(() => {
    const result = new Map<string, Standing[]>();
    for (const pool of data.pools) {
      const auto = allStandings.get(pool.id) ?? [];
      const manual = data.manualPoolRankings?.[pool.id];
      if (manual && manual.length > 0) {
        const ordered: Standing[] = [];
        for (const tid of manual) {
          const s = auto.find((x) => x.teamId === tid);
          if (s) ordered.push(s);
        }
        for (const s of auto) {
          if (!manual.includes(s.teamId)) ordered.push(s);
        }
        result.set(pool.id, ordered);
      } else {
        result.set(pool.id, auto);
      }
    }
    return result;
  }, [allStandings, data.pools, data.manualPoolRankings]);

  // Qualified teams (top 2 per pool, respects manual rankings)
  const qualifiedTeams = useMemo(() => {
    const qualified: Array<{
      teamId: string;
      teamName: string;
      poolName: string;
      rank: number;
    }> = [];
    for (const pool of data.pools) {
      const s = displayStandings.get(pool.id) ?? [];
      s.slice(0, 2).forEach((standing, i) => {
        qualified.push({
          teamId: standing.teamId,
          teamName: standing.teamName,
          poolName: pool.name,
          rank: i + 1,
        });
      });
    }
    return qualified;
  }, [displayStandings, data.pools]);

  // ── MANUAL RANKING ──────────────────────────────────────────

  function moveRanking(
    poolId: string,
    teamId: string,
    direction: "up" | "down",
  ) {
    const current =
      data.manualPoolRankings?.[poolId] ??
      (displayStandings.get(poolId) ?? []).map((s) => s.teamId);
    const arr = [...current];
    const idx = arr.indexOf(teamId);
    if (idx === -1) return;
    if (direction === "up" && idx > 0)
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    if (direction === "down" && idx < arr.length - 1)
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    save({ manualPoolRankings: { ...data.manualPoolRankings, [poolId]: arr } });
  }

  // Check if all pool matches completed → can advance to knockout
  const allPoolMatchesDone = useMemo(() => {
    if (!data.poolMatches.length) return false;
    return data.poolMatches.every((m) => m.status !== "scheduled");
  }, [data.poolMatches]);

  // ── KNOCKOUT ────────────────────────────────────────────────

  function generateKnockoutStage() {
    if (!allPoolMatchesDone && data.poolMatches.length > 0) {
      const proceed = window.confirm(
        "Some pool matches are not complete. Generate knockout bracket anyway?",
      );
      if (!proceed) return;
    }
    const kms = generateKnockout(data.pools, displayStandings);
    save({ knockoutMatches: kms, stage: "knockout" });
    setTab("bracket");
  }

  // ── SCORE ENTRY ──────────────────────────────────────────────

  function openScoreDialog(
    matchId: string,
    isKnockout: boolean,
    currentHomeRuns?: number,
    currentAwayRuns?: number,
    currentTotalOvers?: number,
    currentWinnerId?: string,
  ) {
    if (!adminUnlocked) {
      setPwdDialog(true);
      return;
    }
    // Find existing balls data to pre-fill overs
    const existingMatch = isKnockout
      ? null
      : data.poolMatches.find((m) => m.id === matchId);
    const homeOversStr = existingMatch?.homeBalls
      ? ballsToOversStr(existingMatch.homeBalls)
      : "";
    const awayOversStr = existingMatch?.awayBalls
      ? ballsToOversStr(existingMatch.awayBalls)
      : "";
    setScoreDialog({
      open: true,
      matchId,
      homeRuns: currentHomeRuns?.toString() ?? "",
      awayRuns: currentAwayRuns?.toString() ?? "",
      homeBalls: "",
      awayBalls: "",
      homeOvers: homeOversStr,
      awayOvers: awayOversStr,
      totalOvers: currentTotalOvers?.toString() ?? "6",
      isKnockout,
      winnerId: currentWinnerId ?? "",
    });
  }

  function saveScore() {
    if (!scoreDialog) return;
    const {
      matchId,
      homeRuns,
      awayRuns,
      homeOvers,
      awayOvers,
      totalOvers,
      isKnockout,
      winnerId,
    } = scoreDialog;
    const hr = Number.parseInt(homeRuns) || 0;
    const ar = Number.parseInt(awayRuns) || 0;
    const ov = Number.parseInt(totalOvers) || 6;
    const hb = homeOvers.trim() ? parseOvers(homeOvers) : ov * 6;
    const ab = awayOvers.trim() ? parseOvers(awayOvers) : ov * 6;
    const status: TPoolMatch["status"] = hr === ar ? "tied" : "completed";

    if (isKnockout) {
      let wId = winnerId;
      if (!wId) {
        const km = data.knockoutMatches.find((m) => m.id === matchId);
        if (km) wId = hr >= ar ? (km.teamAId ?? "") : (km.teamBId ?? "");
      }
      const newKms = data.knockoutMatches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              homeRuns: hr,
              awayRuns: ar,
              winnerId: wId || null,
              status: hr === ar ? ("tied" as const) : ("completed" as const),
              isManual: true,
            }
          : m,
      );
      save({ knockoutMatches: autoProgressKnockout(newKms) });
    } else {
      const newPMs = data.poolMatches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              homeRuns: hr,
              awayRuns: ar,
              homeBalls: hb,
              awayBalls: ab,
              totalOvers: ov,
              status,
              isManual: true,
            }
          : m,
      );
      save({ poolMatches: newPMs });
    }
    setScoreDialog(null);
  }

  function toggleNightMatch(matchId: string, isKnockout: boolean) {
    if (!adminUnlocked) {
      setPwdDialog(true);
      return;
    }
    if (isKnockout) {
      save({
        knockoutMatches: data.knockoutMatches.map((m) =>
          m.id === matchId ? { ...m, isNightMatch: !m.isNightMatch } : m,
        ),
      });
    } else {
      save({
        poolMatches: data.poolMatches.map((m) =>
          m.id === matchId ? { ...m, isNightMatch: !m.isNightMatch } : m,
        ),
      });
    }
  }

  function handleStartMatch(
    matchId: string,
    teamAId: string,
    teamBId: string,
    overs: number,
    tag: string,
  ) {
    if (onStartMatch) {
      onStartMatch({
        teamAId,
        teamBId,
        overs,
        tournamentMatchId: matchId,
        matchTag: tag,
      });
    }
  }

  function verifyAdmin() {
    if (pwdInput === ADMIN_PWD) {
      setAdminUnlocked(true);
      setPwdDialog(false);
      setPwdInput("");
      setPwdError(false);
    } else {
      setPwdError(true);
    }
  }

  const getTeamName = (id: string | null) =>
    id ? (allTeams.find((t) => t.id === id)?.name ?? id) : "TBD";

  // ── TOURNAMENT STAGE / STATUS BAR ───────────────────────────
  const stageLabel =
    data.stage === "setup"
      ? "Tournament Not Started"
      : data.stage === "pool"
        ? "🏏 Pool Stage"
        : data.stage === "knockout"
          ? "⚡ Knockout Stage"
          : "🏆 Complete";

  // Preview pools - kept for backward compat but not shown in UI

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const tabLabels: Array<{ id: EngineTab; label: string }> = [
    { id: "setup", label: "Setup" },
    { id: "pools", label: "Pools" },
    { id: "table", label: "Points" },
    { id: "qualified", label: "Qualified" },
    { id: "bracket", label: "Bracket" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── HEADER ── */}
      <header className="pt-8 pb-3 px-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="h-10 w-10 rounded-lg border border-white/20 bg-transparent text-white/80 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6l9-6 9 6M3 12v12h18V12" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg leading-tight">
              {data.name || "CCB Tournament"}
            </h1>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                data.stage === "setup"
                  ? "bg-white/10 text-white/50"
                  : data.stage === "pool"
                    ? "bg-green-500/20 text-green-400"
                    : data.stage === "knockout"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-primary/20 text-primary"
              }`}
            >
              {stageLabel}
            </span>
          </div>
          {!adminUnlocked ? (
            <button
              type="button"
              onClick={() => setPwdDialog(true)}
              className="h-10 w-10 rounded-lg border border-white/20 text-white/50 flex items-center justify-center cursor-pointer hover:bg-white/10"
              title="Admin Login"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          ) : (
            <span className="text-xs text-primary font-semibold px-2 py-1 bg-primary/10 rounded-lg">
              Admin
            </span>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          {tabLabels.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-primary text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-52 space-y-4">
        <AnimatePresence mode="wait">
          {tab === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Tournament name */}
              <div>
                <label
                  htmlFor="tournament-name"
                  className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1 block"
                >
                  Tournament Name
                </label>
                <input
                  id="tournament-name"
                  type="text"
                  value={data.name}
                  onChange={(e) => save({ name: e.target.value })}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-semibold text-sm focus:outline-none focus:border-primary"
                  placeholder="CCB Tournament 2025"
                />
              </div>

              {/* Tournament Selector */}
              <div className="p-3 rounded-xl border border-white/10 bg-white/3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">
                      Active Tournament
                    </p>
                    <p className="text-white font-bold text-sm">
                      {data.tournamentName || data.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTournamentSelect((v) => !v)}
                      className="h-7 px-2.5 rounded-lg border border-white/20 text-white/70 text-[10px] font-semibold cursor-pointer hover:bg-white/10"
                    >
                      ⚡ Switch
                    </button>
                    {adminUnlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt("New tournament name:");
                          if (!name?.trim()) return;
                          const newId = `tournament_${Date.now()}`;
                          const newT = {
                            ...EMPTY_ENGINE,
                            tournamentId: newId,
                            tournamentName: name.trim(),
                            name: name.trim(),
                          };
                          setAllTournaments((prev) => [
                            ...prev,
                            { id: newId, name: name.trim() },
                          ]);
                          setData(newT);
                          setShowTournamentSelect(false);
                        }}
                        className="h-7 px-2.5 rounded-lg border border-primary/40 text-primary text-[10px] font-semibold cursor-pointer hover:bg-primary/10"
                      >
                        + New
                      </button>
                    )}
                  </div>
                </div>
                {showTournamentSelect && allTournaments.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {allTournaments.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const key = `ccb_tournament_${t.id}`;
                          const raw =
                            localStorage.getItem(key) ||
                            (t.id === "main_event"
                              ? localStorage.getItem(STORAGE_KEY)
                              : null);
                          if (raw) {
                            try {
                              const parsed = JSON.parse(raw) as EngineData;
                              if (!parsed.tournamentId)
                                parsed.tournamentId = t.id;
                              if (!parsed.tournamentName)
                                parsed.tournamentName = t.name;
                              if (!parsed.manualPoolRankings)
                                parsed.manualPoolRankings = {};
                              setData(parsed);
                            } catch {}
                          } else {
                            setData({
                              ...EMPTY_ENGINE,
                              tournamentId: t.id,
                              tournamentName: t.name,
                              name: t.name,
                            });
                          }
                          setShowTournamentSelect(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                          data.tournamentId === t.id
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-white/10 bg-white/3 text-white/70 hover:bg-white/8"
                        }`}
                      >
                        {t.name}
                        {data.tournamentId === t.id && " ✓"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Pool Assignment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                    Pool Assignment
                  </span>
                  <span className="text-white/30 text-[10px]">
                    {Object.values(poolAssignments).flat().length} /{" "}
                    {allTeams.length} assigned
                  </span>
                </div>

                {/* Available teams */}
                {(() => {
                  const assignedIds = new Set(
                    Object.values(poolAssignments).flat(),
                  );
                  const available = allTeams.filter(
                    (t) => !assignedIds.has(t.id),
                  );
                  return available.length > 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/3 p-3">
                      <p className="text-white/40 text-[10px] font-semibold uppercase mb-2">
                        Available Teams ({available.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {available.map((t) => (
                          <span
                            key={t.id}
                            className="text-white/50 text-[10px] bg-white/5 border border-white/10 rounded px-2 py-1"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* 4 Fixed Pool Panels */}
                {(["A", "B", "C", "D"] as const).map((poolName) => {
                  const poolId = `pool_${poolName}`;
                  const assigned = poolAssignments[poolId] ?? [];
                  const assignedSet = new Set(
                    Object.values(poolAssignments).flat(),
                  );
                  const available = allTeams.filter(
                    (t) => !assignedSet.has(t.id),
                  );
                  return (
                    <div
                      key={poolId}
                      className="rounded-xl border border-primary/20 bg-white/3 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-primary font-bold text-xs uppercase tracking-wider">
                          Pool {poolName} ({assigned.length}/5)
                        </h3>
                        {assigned.length < 5 && available.length > 0 && (
                          <select
                            className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white cursor-pointer"
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              setPoolAssignments((prev) => ({
                                ...prev,
                                [poolId]: [
                                  ...(prev[poolId] ?? []),
                                  e.target.value,
                                ],
                              }));
                            }}
                          >
                            <option value="">+ Add Team</option>
                            <optgroup
                              label="Default Teams"
                              style={{ background: "#111", color: "#00e676" }}
                            >
                              {available
                                .filter(
                                  (t) => !myTeams?.find((mt) => mt.id === t.id),
                                )
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
                            {(myTeams ?? []).filter((mt) =>
                              available.find((t) => t.id === mt.id),
                            ).length > 0 && (
                              <optgroup
                                label="My Teams"
                                style={{ background: "#111", color: "#ffd600" }}
                              >
                                {(myTeams ?? [])
                                  .filter((mt) =>
                                    available.find((t) => t.id === mt.id),
                                  )
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
                        )}
                      </div>
                      {assigned.length === 0 ? (
                        <p className="text-white/20 text-[10px] py-2 text-center">
                          No teams assigned
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {assigned.map((tid, pos) => {
                            const team = allTeams.find((t) => t.id === tid);
                            return (
                              <div
                                key={tid}
                                className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5"
                              >
                                <span className="text-primary font-bold text-[10px] w-4 shrink-0">
                                  {pos + 1}.
                                </span>
                                <span className="text-white text-xs flex-1 font-semibold truncate">
                                  {team?.name ?? tid}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={pos === 0}
                                    onClick={() =>
                                      setPoolAssignments((prev) => {
                                        const arr = [...(prev[poolId] ?? [])];
                                        [arr[pos - 1], arr[pos]] = [
                                          arr[pos],
                                          arr[pos - 1],
                                        ];
                                        return { ...prev, [poolId]: arr };
                                      })
                                    }
                                    className="h-5 w-5 rounded border border-white/20 text-white/50 text-[10px] cursor-pointer hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pos === assigned.length - 1}
                                    onClick={() =>
                                      setPoolAssignments((prev) => {
                                        const arr = [...(prev[poolId] ?? [])];
                                        [arr[pos], arr[pos + 1]] = [
                                          arr[pos + 1],
                                          arr[pos],
                                        ];
                                        return { ...prev, [poolId]: arr };
                                      })
                                    }
                                    className="h-5 w-5 rounded border border-white/20 text-white/50 text-[10px] cursor-pointer hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPoolAssignments((prev) => ({
                                        ...prev,
                                        [poolId]: (prev[poolId] ?? []).filter(
                                          (id) => id !== tid,
                                        ),
                                      }))
                                    }
                                    className="h-5 w-5 rounded border border-red-500/30 text-red-400/70 text-[10px] cursor-pointer hover:bg-red-500/10 flex items-center justify-center"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Create / Reset buttons */}
              <button
                type="button"
                onClick={createTournament}
                disabled={Object.values(poolAssignments).flat().length < 4}
                className="w-full h-12 rounded-xl bg-primary text-black font-bold text-sm cursor-pointer disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                🏆 Generate Tournament
              </button>

              {data.stage !== "setup" && (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="w-full h-10 rounded-xl border border-red-500/30 text-red-400 text-xs font-semibold cursor-pointer hover:bg-red-500/10"
                >
                  Reset Tournament
                </button>
              )}
            </motion.div>
          )}

          {tab === "pools" && (
            <motion.div
              key="pools"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {data.stage === "setup" && (
                <p className="text-white/40 text-center py-8 text-sm">
                  Create tournament in Setup tab first
                </p>
              )}

              {/* Edit Schedule toggle */}
              {data.stage === "pool" &&
                adminUnlocked &&
                data.poolMatches.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                      Schedule
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditScheduleMode((v) => !v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        editScheduleMode
                          ? "bg-amber-500/30 border border-amber-500/60 text-amber-300"
                          : "bg-white/10 border border-white/20 text-white/70 hover:bg-white/15"
                      }`}
                      data-ocid="tournament.edit_schedule.button"
                    >
                      {editScheduleMode
                        ? "✓ Editing Schedule"
                        : "✏️ Edit Schedule"}
                    </button>
                  </div>
                )}

              {data.pools.map((pool) => {
                const poolMatches = data.poolMatches.filter(
                  (m) => m.poolId === pool.id,
                );
                return (
                  <div key={pool.id}>
                    <div className="mb-3">
                      <h2 className="text-primary font-bold text-sm tracking-wider uppercase mb-2">
                        Pool {pool.name}
                      </h2>
                      {/* Numbered team order display */}
                      <div className="rounded-lg border border-white/10 bg-white/3 p-2 mb-2">
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">
                          Pool {pool.name} Teams:
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          {pool.poolTeamOrder.map((tid, pos) => {
                            const teamObj = allTeams.find((t) => t.id === tid);
                            return (
                              <div
                                key={tid}
                                className="flex items-center gap-1.5"
                              >
                                <span className="text-primary font-bold text-[10px] w-4 shrink-0">
                                  {pos + 1}.
                                </span>
                                <span className="text-white/80 text-[10px] font-semibold truncate">
                                  {teamObj?.name ?? tid}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {poolMatches.map((m, idx) => {
                        const homeTeam = allTeams.find(
                          (t) => t.id === m.homeTeamId,
                        );
                        const awayTeam = allTeams.find(
                          (t) => t.id === m.awayTeamId,
                        );
                        const isCompleted = m.status !== "scheduled";
                        const matchNum = m.matchNumber ?? idx + 1;
                        const isEditingTime = editingTimeMatchId === m.id;
                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border p-3 ${
                              isCompleted
                                ? "border-primary/30 bg-primary/5"
                                : m.isManual
                                  ? "border-amber-500/30 bg-amber-500/5"
                                  : "border-white/10 bg-white/3"
                            }`}
                            data-ocid={`pool.match.item.${matchNum}`}
                            draggable={adminUnlocked}
                            onDragStart={
                              adminUnlocked
                                ? (e) => handleDragStart(e, idx)
                                : undefined
                            }
                            onDragOver={
                              adminUnlocked
                                ? (e) => handleDragOver(e, idx)
                                : undefined
                            }
                            onDrop={
                              adminUnlocked
                                ? (e) =>
                                    handleDrop(e, pool.id, idx, poolMatches)
                                : undefined
                            }
                            style={{
                              cursor: editScheduleMode ? "grab" : "default",
                              opacity: dragIndex === idx ? 0.5 : 1,
                            }}
                          >
                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                Match {m.matchNumber ?? idx + 1}
                              </span>
                              <span className="text-[10px] font-semibold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                Pool {pool.name} Match
                              </span>
                              <span className="text-[10px] text-white/40 px-2 py-0.5 rounded-full border border-white/10">
                                Pool Match
                              </span>
                              {m.isNightMatch && (
                                <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                  🌙 Night Match (5 ov)
                                </span>
                              )}
                              {m.isManual && (
                                <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                                  Manual
                                </span>
                              )}
                              {m.linkedMatchId && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                  Linked
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                  ✓ Done
                                </span>
                              )}
                            </div>

                            {/* Date/Time if set */}
                            {(m.matchDate || m.matchTime) && (
                              <p className="text-white/40 text-[10px] mb-1.5">
                                {m.matchDate && <span>{m.matchDate}</span>}
                                {m.matchDate && m.matchTime && <span> · </span>}
                                {m.matchTime && <span>{m.matchTime}</span>}
                              </p>
                            )}

                            {/* Teams */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-bold text-sm flex-1 leading-tight">
                                {homeTeam?.name ?? m.homeTeamId}
                              </span>
                              <span className="text-white/40 text-xs px-2">
                                vs
                              </span>
                              <span className="text-white font-bold text-sm flex-1 text-right leading-tight">
                                {awayTeam?.name ?? m.awayTeamId}
                              </span>
                            </div>

                            {/* Score if done */}
                            {isCompleted && (
                              <div className="text-white/60 text-xs text-center mb-2">
                                {m.homeRuns ?? 0} – {m.awayRuns ?? 0}
                                {m.status === "tied" && " (Tied)"}
                                {m.homeRuns !== undefined &&
                                  m.awayRuns !== undefined &&
                                  m.homeRuns !== m.awayRuns && (
                                    <span className="text-primary font-semibold">
                                      {" ·"} Winner:{" "}
                                      {m.homeRuns > m.awayRuns
                                        ? homeTeam?.name
                                        : awayTeam?.name}
                                    </span>
                                  )}
                              </div>
                            )}

                            {/* Edit Schedule controls */}
                            {adminUnlocked && (
                              <div className="flex flex-wrap gap-1.5 mb-2 pt-1 border-t border-white/10">
                                <button
                                  type="button"
                                  onClick={() => moveMatch(m.id, "up")}
                                  className="h-7 px-2 rounded-lg border border-white/20 text-white/60 text-[10px] font-semibold cursor-pointer hover:bg-white/10"
                                  title="Move up"
                                >
                                  ↑ Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveMatch(m.id, "down")}
                                  className="h-7 px-2 rounded-lg border border-white/20 text-white/60 text-[10px] font-semibold cursor-pointer hover:bg-white/10"
                                  title="Move down"
                                >
                                  ↓ Down
                                </button>
                                <button
                                  type="button"
                                  onClick={() => swapMatchTeams(m.id)}
                                  className="h-7 px-2 rounded-lg border border-blue-500/30 text-blue-400 text-[10px] font-semibold cursor-pointer hover:bg-blue-500/10"
                                  title="Swap teams"
                                >
                                  ⇄ Swap
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTimeMatchId(m.id);
                                    setTimeInput(m.matchTime ?? "");
                                    setDateInput(m.matchDate ?? "");
                                  }}
                                  className="h-7 px-2 rounded-lg border border-purple-500/30 text-purple-400 text-[10px] font-semibold cursor-pointer hover:bg-purple-500/10"
                                  title="Set time"
                                >
                                  🕐 Time
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Delete this match?"))
                                      deleteMatch(m.id);
                                  }}
                                  className="h-7 px-2 rounded-lg border border-red-500/30 text-red-400 text-[10px] font-semibold cursor-pointer hover:bg-red-500/10"
                                  title="Delete match"
                                  data-ocid={`pool.match.delete_button.${matchNum}`}
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            )}

                            {/* Inline time editor */}
                            {isEditingTime && (
                              <div className="flex flex-wrap gap-2 mb-2 pt-1 border-t border-purple-500/20">
                                <div className="flex items-center gap-1.5">
                                  <label
                                    htmlFor="match-date-input"
                                    className="text-[10px] text-white/40 shrink-0"
                                  >
                                    Date:
                                  </label>
                                  <input
                                    id="match-date-input"
                                    type="date"
                                    value={dateInput}
                                    onChange={(e) =>
                                      setDateInput(e.target.value)
                                    }
                                    className="bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-[10px] focus:outline-none focus:border-purple-400"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label
                                    htmlFor="match-time-input"
                                    className="text-[10px] text-white/40 shrink-0"
                                  >
                                    Time:
                                  </label>
                                  <input
                                    id="match-time-input"
                                    type="time"
                                    value={timeInput}
                                    onChange={(e) =>
                                      setTimeInput(e.target.value)
                                    }
                                    className="bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-[10px] focus:outline-none focus:border-purple-400"
                                  />
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => saveMatchTime(m.id)}
                                    className="h-7 px-3 rounded bg-purple-500/30 border border-purple-500/50 text-purple-300 text-[10px] font-bold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTimeMatchId(null)}
                                    className="h-7 px-3 rounded border border-white/20 text-white/40 text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Admin actions */}
                            <div className="flex gap-2">
                              {adminUnlocked && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openScoreDialog(
                                        m.id,
                                        false,
                                        m.homeRuns,
                                        m.awayRuns,
                                        m.totalOvers,
                                      )
                                    }
                                    className="flex-1 h-8 rounded-lg border border-primary/40 text-primary text-xs font-semibold cursor-pointer hover:bg-primary/10"
                                  >
                                    {isCompleted ? "Edit Score" : "Enter Score"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleNightMatch(m.id, false)
                                    }
                                    className={`h-8 w-8 rounded-lg border text-xs cursor-pointer ${
                                      m.isNightMatch
                                        ? "border-blue-400/60 text-blue-400 bg-blue-500/10"
                                        : "border-white/20 text-white/40"
                                    }`}
                                    title="Toggle Night Match"
                                  >
                                    🌙
                                  </button>
                                </>
                              )}
                              {onStartMatch && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartMatch(
                                      m.id,
                                      m.homeTeamId,
                                      m.awayTeamId,
                                      m.isNightMatch ? 5 : 6,
                                      `Pool ${pool.name} Match`,
                                    )
                                  }
                                  className="flex-1 h-8 rounded-lg border border-green-500/40 text-green-400 text-xs font-semibold cursor-pointer hover:bg-green-500/10"
                                >
                                  ▶ Start
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {adminUnlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddMatchPoolId(pool.id);
                          setShowAddMatchDlg(true);
                        }}
                        className="w-full h-10 mt-2 rounded-xl border border-dashed text-sm font-semibold cursor-pointer transition-colors bg-transparent"
                        style={{
                          borderColor: "rgba(0,230,118,0.4)",
                          color: "rgba(0,230,118,0.7)",
                        }}
                        data-ocid="tournament.add_match.button"
                      >
                        + Add Match
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Advance to Knockout button */}
              {data.stage === "pool" && adminUnlocked && (
                <button
                  type="button"
                  onClick={generateKnockoutStage}
                  className="w-full h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-bold text-sm cursor-pointer hover:bg-yellow-500/30"
                >
                  ⚡ Generate Knockout Bracket
                </button>
              )}
            </motion.div>
          )}

          {tab === "table" && (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {data.pools.length === 0 && (
                <p className="text-white/40 text-center py-8 text-sm">
                  No pools yet. Generate tournament in Setup.
                </p>
              )}
              {data.pools.map((pool) => {
                const standings = displayStandings.get(pool.id) ?? [];
                const hasManual = !!data.manualPoolRankings?.[pool.id]?.length;
                return (
                  <div key={pool.id}>
                    <h2 className="text-primary font-bold text-sm tracking-wider uppercase mb-3 flex items-center gap-2">
                      Pool {pool.name} — Points Table
                      {hasManual && (
                        <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </h2>
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-xs">
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
                            <th className="text-center text-primary/80 font-semibold px-2 py-2">
                              Pts
                            </th>
                            <th className="text-center text-white/50 font-semibold px-2 py-2">
                              NRR
                            </th>
                            {adminUnlocked && (
                              <th className="text-center text-white/30 font-semibold px-2 py-2 text-[10px]">
                                ⬆⬇
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s, i) => (
                            <tr
                              key={s.teamId}
                              className={`border-b border-white/5 ${i < 2 ? "bg-green-500/5" : ""}`}
                            >
                              <td className="px-3 py-2 text-white/40">
                                {i + 1}
                              </td>
                              <td className="px-3 py-2 font-semibold">
                                <span
                                  className={
                                    i < 2 ? "text-green-400" : "text-white"
                                  }
                                >
                                  {i < 2 ? "✓ " : ""}
                                  {s.teamName}
                                </span>
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
                              <td className="px-2 py-2 text-center text-primary font-bold">
                                {s.points}
                              </td>
                              <td
                                className={`px-2 py-2 text-center font-mono text-[10px] ${s.nrr >= 0 ? "text-green-400" : "text-red-400"}`}
                              >
                                {s.nrr >= 0 ? "+" : ""}
                                {s.nrr.toFixed(2)}
                              </td>
                              {adminUnlocked && (
                                <td className="px-1 py-2">
                                  <div className="flex gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveRanking(pool.id, s.teamId, "up")
                                      }
                                      disabled={i === 0}
                                      className="h-5 w-5 rounded border border-white/20 text-white/50 text-[10px] cursor-pointer hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                                      data-ocid="points.toggle"
                                    >
                                      ⬆
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveRanking(pool.id, s.teamId, "down")
                                      }
                                      disabled={i === standings.length - 1}
                                      className="h-5 w-5 rounded border border-white/20 text-white/50 text-[10px] cursor-pointer hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                                      data-ocid="points.toggle"
                                    >
                                      ⬇
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                          {standings.length === 0 && (
                            <tr>
                              <td
                                colSpan={adminUnlocked ? 8 : 7}
                                className="px-3 py-4 text-center text-white/30 text-xs"
                              >
                                No stats available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between mt-1 px-1">
                      <p className="text-white/30 text-[10px]">
                        ✓ = Qualified to knockout
                      </p>
                      {adminUnlocked && hasManual && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRankings = { ...data.manualPoolRankings };
                            delete newRankings[pool.id];
                            save({ manualPoolRankings: newRankings });
                          }}
                          className="text-[10px] text-white/30 cursor-pointer hover:text-white/50"
                        >
                          ↺ Reset to auto ranking
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {tab === "qualified" && (
            <motion.div
              key="qualified"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <h2 className="text-primary font-bold text-sm tracking-wider uppercase">
                Qualified Teams ({qualifiedTeams.length})
              </h2>
              {qualifiedTeams.length === 0 ? (
                <p className="text-white/40 text-center py-8 text-sm">
                  No teams qualified yet. Complete pool matches.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {qualifiedTeams.map((qt) => (
                    <div
                      key={qt.teamId}
                      className={`rounded-xl border p-3 ${
                        qt.rank === 1
                          ? "border-yellow-400/40 bg-yellow-400/10"
                          : "border-green-500/30 bg-green-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            qt.rank === 1
                              ? "bg-yellow-400/30 text-yellow-300"
                              : "bg-green-500/30 text-green-400"
                          }`}
                        >
                          #{qt.rank} Pool {qt.poolName}
                        </span>
                      </div>
                      <p className="text-white font-bold text-sm leading-tight">
                        {qt.teamName}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {data.stage === "pool" &&
                adminUnlocked &&
                qualifiedTeams.length >= 4 && (
                  <button
                    type="button"
                    onClick={generateKnockoutStage}
                    className="w-full h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-bold text-sm cursor-pointer hover:bg-yellow-500/30"
                  >
                    ⚡ Generate Knockout Bracket
                  </button>
                )}
            </motion.div>
          )}

          {tab === "bracket" && (
            <motion.div
              key="bracket"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {data.knockoutMatches.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/40 text-sm mb-4">No bracket yet.</p>
                  {adminUnlocked && data.stage === "pool" && (
                    <button
                      type="button"
                      onClick={generateKnockoutStage}
                      className="px-6 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-bold text-sm cursor-pointer"
                    >
                      ⚡ Generate Bracket
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Quarter Finals */}
                  {data.knockoutMatches.filter((m) => m.round === "qf").length >
                    0 && (
                    <div>
                      <h2 className="text-yellow-400 font-bold text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
                        <span className="h-px flex-1 bg-yellow-400/20" />
                        Quarter Finals
                        <span className="h-px flex-1 bg-yellow-400/20" />
                      </h2>
                      <div className="space-y-3">
                        {data.knockoutMatches
                          .filter((m) => m.round === "qf")
                          .map((m) => (
                            <KnockoutMatchCard
                              key={m.id}
                              match={m}
                              teams={allTeams}
                              adminUnlocked={adminUnlocked}
                              onEnterScore={() =>
                                openScoreDialog(
                                  m.id,
                                  true,
                                  m.homeRuns,
                                  m.awayRuns,
                                  6,
                                  m.winnerId ?? undefined,
                                )
                              }
                              onToggleNight={() => toggleNightMatch(m.id, true)}
                              onStartMatch={
                                onStartMatch && m.teamAId && m.teamBId
                                  ? () =>
                                      handleStartMatch(
                                        m.id,
                                        m.teamAId!,
                                        m.teamBId!,
                                        m.isNightMatch ? 5 : 6,
                                        m.label,
                                      )
                                  : undefined
                              }
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Semi Finals */}
                  {data.knockoutMatches.filter((m) => m.round === "sf").length >
                    0 && (
                    <div>
                      <h2 className="text-orange-400 font-bold text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
                        <span className="h-px flex-1 bg-orange-400/20" />
                        Semi Finals
                        <span className="h-px flex-1 bg-orange-400/20" />
                      </h2>
                      <div className="space-y-3">
                        {data.knockoutMatches
                          .filter((m) => m.round === "sf")
                          .map((m) => (
                            <KnockoutMatchCard
                              key={m.id}
                              match={m}
                              teams={allTeams}
                              adminUnlocked={adminUnlocked}
                              onEnterScore={() =>
                                openScoreDialog(
                                  m.id,
                                  true,
                                  m.homeRuns,
                                  m.awayRuns,
                                  6,
                                  m.winnerId ?? undefined,
                                )
                              }
                              onToggleNight={() => toggleNightMatch(m.id, true)}
                              onStartMatch={
                                onStartMatch && m.teamAId && m.teamBId
                                  ? () =>
                                      handleStartMatch(
                                        m.id,
                                        m.teamAId!,
                                        m.teamBId!,
                                        m.isNightMatch ? 5 : 6,
                                        m.label,
                                      )
                                  : undefined
                              }
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Final */}
                  {data.knockoutMatches.filter((m) => m.round === "final")
                    .length > 0 && (
                    <div>
                      <h2 className="text-primary font-bold text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
                        <span className="h-px flex-1 bg-primary/20" />🏆 FINAL
                        <span className="h-px flex-1 bg-primary/20" />
                      </h2>
                      <div className="space-y-3">
                        {data.knockoutMatches
                          .filter((m) => m.round === "final")
                          .map((m) => (
                            <KnockoutMatchCard
                              key={m.id}
                              match={m}
                              teams={allTeams}
                              adminUnlocked={adminUnlocked}
                              isFinal
                              onEnterScore={() =>
                                openScoreDialog(
                                  m.id,
                                  true,
                                  m.homeRuns,
                                  m.awayRuns,
                                  6,
                                  m.winnerId ?? undefined,
                                )
                              }
                              onToggleNight={() => toggleNightMatch(m.id, true)}
                              onStartMatch={
                                onStartMatch && m.teamAId && m.teamBId
                                  ? () =>
                                      handleStartMatch(
                                        m.id,
                                        m.teamAId!,
                                        m.teamBId!,
                                        m.isNightMatch ? 5 : 6,
                                        m.label,
                                      )
                                  : undefined
                              }
                            />
                          ))}
                      </div>

                      {/* Champion display */}
                      {data.knockoutMatches.find(
                        (m) => m.round === "final" && m.winnerId,
                      ) && (
                        <div className="mt-4 rounded-2xl border-2 border-primary/60 bg-primary/10 p-6 text-center">
                          <p className="text-4xl mb-2">🏆</p>
                          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                            Champion
                          </p>
                          <p className="text-primary font-bold text-xl">
                            {getTeamName(
                              data.knockoutMatches.find(
                                (m) => m.round === "final" && m.winnerId,
                              )?.winnerId ?? null,
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ADD MATCH DIALOG ── */}
      {showAddMatchDlg && adminUnlocked && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div className="w-full max-w-md bg-zinc-900 border border-primary/30 rounded-t-2xl p-6 space-y-4">
            <h3 className="text-primary font-bold text-lg">+ Add Match</h3>

            {/* Pool selector */}
            <div>
              <label
                htmlFor="add-match-pool"
                className="text-white/60 text-xs mb-1 block"
              >
                Pool
              </label>
              <select
                id="add-match-pool"
                value={addMatchPoolId}
                onChange={(e) => setAddMatchPoolId(e.target.value)}
                className="w-full border text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                style={{
                  background: "#111",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                {data.pools.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    style={{ background: "#111" }}
                  >
                    Pool {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Home Team */}
            <div>
              <label
                htmlFor="add-match-home"
                className="text-white/60 text-xs mb-1 block"
              >
                Home Team
              </label>
              <select
                id="add-match-home"
                value={addMatchHome}
                onChange={(e) => setAddMatchHome(e.target.value)}
                className="w-full border text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                style={{
                  background: "#111",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
                data-ocid="tournament.add_match.home.select"
              >
                <option value="" disabled style={{ background: "#111" }}>
                  Select team...
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
                {(myTeams ?? []).length > 0 && (
                  <optgroup
                    label="─── My Teams ───"
                    style={{ background: "#111", color: "#ffd600" }}
                  >
                    {(myTeams ?? []).map((t) => (
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

            {/* Away Team */}
            <div>
              <label
                htmlFor="add-match-away"
                className="text-white/60 text-xs mb-1 block"
              >
                Away Team
              </label>
              <select
                id="add-match-away"
                value={addMatchAway}
                onChange={(e) => setAddMatchAway(e.target.value)}
                className="w-full border text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                style={{
                  background: "#111",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
                data-ocid="tournament.add_match.away.select"
              >
                <option value="" disabled style={{ background: "#111" }}>
                  Select team...
                </option>
                <optgroup
                  label="─── Default Teams ───"
                  style={{ background: "#111", color: "#00e676" }}
                >
                  {teams
                    .filter((t) => t.id !== addMatchHome)
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
                {(myTeams ?? []).length > 0 && (
                  <optgroup
                    label="─── My Teams ───"
                    style={{ background: "#111", color: "#ffd600" }}
                  >
                    {(myTeams ?? [])
                      .filter((t) => t.id !== addMatchHome)
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddMatchDlg(false);
                  setAddMatchHome("");
                  setAddMatchAway("");
                }}
                className="flex-1 h-11 rounded-xl border text-white/60 text-sm font-semibold cursor-pointer bg-transparent"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
                data-ocid="tournament.add_match.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addMatch}
                disabled={
                  !addMatchHome ||
                  !addMatchAway ||
                  addMatchHome === addMatchAway
                }
                className="flex-1 h-11 rounded-xl text-black text-sm font-bold cursor-pointer disabled:opacity-40 border-0"
                style={{ background: "#00e676" }}
                data-ocid="tournament.add_match.confirm_button"
              >
                Add Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN PASSWORD DIALOG ── */}
      {pwdDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-xs bg-zinc-900 rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-bold text-base text-center">
              Admin Login
            </h3>
            <input
              type="password"
              value={pwdInput}
              onChange={(e) => {
                setPwdInput(e.target.value);
                setPwdError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && verifyAdmin()}
              placeholder="Enter admin password"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary"
              // autoFocus removed for lint
            />
            {pwdError && (
              <p className="text-red-400 text-xs text-center">
                Incorrect password
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPwdDialog(false);
                  setPwdInput("");
                  setPwdError(false);
                }}
                className="flex-1 h-10 rounded-xl border border-white/15 text-white/60 text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyAdmin}
                className="flex-1 h-10 rounded-xl bg-primary text-black font-bold text-sm cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCORE ENTRY DIALOG ── */}
      {scoreDialog?.open && (
        <ScoreEntryDialog
          dialog={scoreDialog}
          teams={allTeams}
          poolMatches={data.poolMatches}
          knockoutMatches={data.knockoutMatches}
          onChange={(patch) =>
            setScoreDialog((prev) => (prev ? { ...prev, ...patch } : null))
          }
          onSave={saveScore}
          onClose={() => setScoreDialog(null)}
        />
      )}

      {/* ── RESET CONFIRM ── */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-xs bg-zinc-900 rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-bold text-base text-center">
              Reset Tournament?
            </h3>
            <p className="text-white/50 text-xs text-center">
              All tournament data will be deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="flex-1 h-10 rounded-xl border border-white/15 text-white/60 text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetTournament}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white font-bold text-sm cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KNOCKOUT MATCH CARD
// ─────────────────────────────────────────────────────────────

function KnockoutMatchCard({
  match,
  teams,
  adminUnlocked,
  isFinal,
  onEnterScore,
  onToggleNight,
  onStartMatch,
}: {
  match: KnockoutMatch;
  teams: Team[];
  adminUnlocked: boolean;
  isFinal?: boolean;
  onEnterScore: () => void;
  onToggleNight: () => void;
  onStartMatch?: () => void;
}) {
  const getTeam = (id: string | null) =>
    id ? teams.find((t) => t.id === id) : null;
  const teamA = getTeam(match.teamAId);
  const teamB = getTeam(match.teamBId);
  const winner = getTeam(match.winnerId);

  const borderClass = isFinal
    ? "border-primary/40"
    : match.round === "sf"
      ? "border-orange-400/30"
      : "border-yellow-400/30";
  const bgClass = isFinal
    ? "bg-primary/5"
    : match.round === "sf"
      ? "bg-orange-400/5"
      : "bg-yellow-400/5";

  return (
    <div className={`rounded-xl border p-3 ${borderClass} ${bgClass}`}>
      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isFinal
              ? "bg-primary/20 text-primary"
              : match.round === "sf"
                ? "bg-orange-400/20 text-orange-400"
                : "bg-yellow-400/20 text-yellow-400"
          }`}
        >
          {match.label}
        </span>
        {match.isNightMatch && (
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            🌙 Night Match (5 ov)
          </span>
        )}
        {match.isManual && (
          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
            Manual
          </span>
        )}
        {match.status === "completed" && (
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            ✓ Done
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex-1 text-sm font-bold leading-tight ${
            winner?.id === match.teamAId ? "text-primary" : "text-white"
          }`}
        >
          {teamA?.name ?? "TBD"}
          {winner?.id === match.teamAId && " 🏆"}
        </div>
        <span className="text-white/30 text-xs">vs</span>
        <div
          className={`flex-1 text-sm font-bold text-right leading-tight ${
            winner?.id === match.teamBId ? "text-primary" : "text-white"
          }`}
        >
          {winner?.id === match.teamBId && "🏆 "}
          {teamB?.name ?? "TBD"}
        </div>
      </div>

      {/* Score */}
      {match.status !== "pending" && (
        <div className="text-white/60 text-xs text-center mb-2">
          {match.homeRuns ?? "?"} – {match.awayRuns ?? "?"}
          {match.status === "tied" && " (Tied)"}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {adminUnlocked && (
          <>
            <button
              type="button"
              onClick={onEnterScore}
              className="flex-1 h-8 rounded-lg border border-white/20 text-white/70 text-xs font-semibold cursor-pointer hover:bg-white/5"
            >
              {match.status === "pending" ? "Enter Score" : "Edit Score"}
            </button>
            <button
              type="button"
              onClick={onToggleNight}
              className={`h-8 w-8 rounded-lg border text-xs cursor-pointer ${
                match.isNightMatch
                  ? "border-blue-400/60 text-blue-400 bg-blue-500/10"
                  : "border-white/20 text-white/40"
              }`}
              title="Toggle Night Match"
            >
              🌙
            </button>
          </>
        )}
        {onStartMatch && match.teamAId && match.teamBId && (
          <button
            type="button"
            onClick={onStartMatch}
            className="flex-1 h-8 rounded-lg border border-green-500/40 text-green-400 text-xs font-semibold cursor-pointer hover:bg-green-500/10"
          >
            ▶ Start Match
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCORE ENTRY DIALOG
// ─────────────────────────────────────────────────────────────

function ScoreEntryDialog({
  dialog,
  teams,
  poolMatches,
  knockoutMatches,
  onChange,
  onSave,
  onClose,
}: {
  dialog: {
    matchId: string;
    homeRuns: string;
    awayRuns: string;
    homeBalls: string;
    awayBalls: string;
    homeOvers?: string;
    awayOvers?: string;
    totalOvers: string;
    isKnockout: boolean;
    winnerId: string;
  };
  teams: Team[];
  poolMatches: TPoolMatch[];
  knockoutMatches: KnockoutMatch[];
  onChange: (patch: Partial<typeof dialog>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const match = dialog.isKnockout
    ? knockoutMatches.find((m) => m.id === dialog.matchId)
    : poolMatches.find((m) => m.id === dialog.matchId);

  const homeId = match
    ? "homeTeamId" in match
      ? match.homeTeamId
      : match.teamAId
    : null;
  const awayId = match
    ? "awayTeamId" in match
      ? match.awayTeamId
      : match.teamBId
    : null;
  const homeName = homeId
    ? (teams.find((t) => t.id === homeId)?.name ?? homeId)
    : "Home";
  const awayName = awayId
    ? (teams.find((t) => t.id === awayId)?.name ?? awayId)
    : "Away";

  const hr = Number.parseInt(dialog.homeRuns) || 0;
  const ar = Number.parseInt(dialog.awayRuns) || 0;
  const autoWinnerId = hr > ar ? homeId : ar > hr ? awayId : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80">
      <div className="w-full max-w-sm bg-zinc-900 rounded-t-2xl border-t border-white/10 p-6 space-y-4">
        <h3 className="text-white font-bold text-base text-center">
          Enter Score
        </h3>
        <p className="text-white/50 text-xs text-center">
          {homeName} vs {awayName}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="home-runs"
              className="text-white/50 text-[10px] uppercase tracking-wider mb-1 block"
            >
              {homeName} Runs
            </label>
            <input
              id="home-runs"
              type="number"
              value={dialog.homeRuns}
              onChange={(e) => onChange({ homeRuns: e.target.value })}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label
              htmlFor="away-runs"
              className="text-white/50 text-[10px] uppercase tracking-wider mb-1 block"
            >
              {awayName} Runs
            </label>
            <input
              id="away-runs"
              type="number"
              value={dialog.awayRuns}
              onChange={(e) => onChange({ awayRuns: e.target.value })}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {autoWinnerId && (
          <p className="text-primary text-xs text-center">
            Winner:{" "}
            {teams.find((t) => t.id === autoWinnerId)?.name ?? autoWinnerId}
          </p>
        )}
        {hr === ar && hr > 0 && (
          <p className="text-yellow-400 text-xs text-center">Tied match</p>
        )}

        {/* Overs Played (optional, for NRR) */}
        <div className="space-y-1">
          <p className="text-white/40 text-[10px] uppercase tracking-wider text-center">
            Overs Faced (for NRR — optional, e.g. 4.3 = 4 overs 3 balls)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="home-overs"
                className="text-white/50 text-[10px] uppercase tracking-wider mb-1 block"
              >
                {homeName} Overs
              </label>
              <input
                id="home-overs"
                type="text"
                value={dialog.homeOvers ?? ""}
                onChange={(e) => onChange({ homeOvers: e.target.value })}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 6.0"
              />
            </div>
            <div>
              <label
                htmlFor="away-overs"
                className="text-white/50 text-[10px] uppercase tracking-wider mb-1 block"
              >
                {awayName} Overs
              </label>
              <input
                id="away-overs"
                type="text"
                value={dialog.awayOvers ?? ""}
                onChange={(e) => onChange({ awayOvers: e.target.value })}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 5.4"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/15 text-white/60 text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 h-11 rounded-xl bg-primary text-black font-bold text-sm cursor-pointer"
          >
            Save Result
          </button>
        </div>
      </div>
    </div>
  );
}
