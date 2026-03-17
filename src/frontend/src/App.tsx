import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  Home,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  Shield,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import AnnouncementSection from "./components/AnnouncementSection";

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
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
  | "scoring"
  | "innings-switch"
  | "result"
  | "tournament";

interface BatsmanState {
  player: Player;
  runs: number;
  balls: number;
  isStriker: boolean;
  isOut: boolean;
  wicketType?: WicketType;
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
}

interface MatchRecord {
  id: string;
  date: string;
  teamA: Team;
  teamB: Team;
  totalOvers: number;
  innings1: InningsState;
  innings2?: InningsState;
  resultText?: string;
}

interface WicketDialog {
  open: boolean;
  step: "type" | "batsman";
  wicketType?: WicketType;
}

// ──────────────────────────────────────────────────────────────
// SEED DATA — 24 REGISTERED TEAMS
// ──────────────────────────────────────────────────────────────

const TEAMS: Team[] = [
  {
    id: "t1",
    name: "Desert Hawks CC",
    players: [
      { id: "p1", name: "Ahmed Ali" },
      { id: "p2", name: "Bilal Khan" },
      { id: "p3", name: "Usman Tariq" },
      { id: "p4", name: "Salman Raza" },
      { id: "p5", name: "Faisal Iqbal" },
      { id: "p6", name: "Tariq Mehmood" },
      { id: "p7", name: "Asif Nawaz" },
      { id: "p8", name: "Rizwan Malik" },
      { id: "p9", name: "Danish Qureshi" },
      { id: "p10", name: "Hamza Butt" },
      { id: "p11", name: "Zubair Anwar" },
    ],
  },
  {
    id: "t2",
    name: "Cholistan Lions",
    players: [
      { id: "p12", name: "Kashif Javed" },
      { id: "p13", name: "Naveed Akhtar" },
      { id: "p14", name: "Imran Siddiqui" },
      { id: "p15", name: "Shoaib Rana" },
      { id: "p16", name: "Wasim Baig" },
      { id: "p17", name: "Shahid Zaman" },
      { id: "p18", name: "Adeel Chaudhry" },
      { id: "p19", name: "Majid Hussain" },
      { id: "p20", name: "Aamir Bashir" },
      { id: "p21", name: "Naeem Sheikh" },
      { id: "p22", name: "Khalid Mahmood" },
    ],
  },
  {
    id: "t3",
    name: "Yazman Warriors",
    players: [
      { id: "p23", name: "Irfan Saeed" },
      { id: "p24", name: "Ghulam Abbas" },
      { id: "p25", name: "Pervaiz Alam" },
      { id: "p26", name: "Javaid Iqbal" },
      { id: "p27", name: "Mukhtar Ahmed" },
      { id: "p28", name: "Shaukat Ali" },
      { id: "p29", name: "Liaquat Khan" },
      { id: "p30", name: "Azhar Mehmood" },
      { id: "p31", name: "Sajjad Rao" },
      { id: "p32", name: "Tanveer Gill" },
      { id: "p33", name: "Arif Butt" },
    ],
  },
  {
    id: "t4",
    name: "Bahawalpur Eagles",
    players: [
      { id: "p34", name: "Umer Farooq" },
      { id: "p35", name: "Zafar Iqbal" },
      { id: "p36", name: "Kabir Hussain" },
      { id: "p37", name: "Ramzan Ali" },
      { id: "p38", name: "Shakeel Ahmed" },
      { id: "p39", name: "Anwar Pasha" },
      { id: "p40", name: "Mujahid Raza" },
      { id: "p41", name: "Farhan Noor" },
      { id: "p42", name: "Waleed Shahid" },
      { id: "p43", name: "Haris Baig" },
      { id: "p44", name: "Saeed Gul" },
    ],
  },
  {
    id: "t5",
    name: "Fort Abbas Tigers",
    players: [
      { id: "p45", name: "Aleem Khan" },
      { id: "p46", name: "Nasir Mehmood" },
      { id: "p47", name: "Iqbal Shah" },
      { id: "p48", name: "Zaheer Awan" },
      { id: "p49", name: "Munir Siddiq" },
      { id: "p50", name: "Qasim Rauf" },
      { id: "p51", name: "Bashir Ahmed" },
      { id: "p52", name: "Amjad Ali" },
      { id: "p53", name: "Rafiq Ullah" },
      { id: "p54", name: "Saqib Noor" },
      { id: "p55", name: "Waqas Tariq" },
    ],
  },
  {
    id: "t6",
    name: "Derawar Falcons",
    players: [
      { id: "p56", name: "Tahir Abbas" },
      { id: "p57", name: "Younus Khan" },
      { id: "p58", name: "Aftab Nawaz" },
      { id: "p59", name: "Javed Miandad Jr" },
      { id: "p60", name: "Sohail Tanvir Jr" },
      { id: "p61", name: "Mohsin Kamal" },
      { id: "p62", name: "Asad Shafiq Jr" },
      { id: "p63", name: "Sarfraz Ali" },
      { id: "p64", name: "Babar Shah" },
      { id: "p65", name: "Shaheen Malik" },
      { id: "p66", name: "Waqar Younis Jr" },
    ],
  },
  {
    id: "t7",
    name: "Khairpur Stallions",
    players: [
      { id: "p67", name: "Fawad Khan" },
      { id: "p68", name: "Abubakar Siddiq" },
      { id: "p69", name: "Ismail Qureshi" },
      { id: "p70", name: "Khurram Manzoor Jr" },
      { id: "p71", name: "Taimur Shah" },
      { id: "p72", name: "Zeeshan Malik" },
      { id: "p73", name: "Moeen Abbas" },
      { id: "p74", name: "Rayyan Ali" },
      { id: "p75", name: "Huzaifa Khan" },
      { id: "p76", name: "Sanan Zubair" },
      { id: "p77", name: "Muqeet Rana" },
    ],
  },
  {
    id: "t8",
    name: "Uch Sharif Royals",
    players: [
      { id: "p78", name: "Abdullah Niaz" },
      { id: "p79", name: "Hassan Butt" },
      { id: "p80", name: "Hussain Nawaz" },
      { id: "p81", name: "Ibrahim Malik" },
      { id: "p82", name: "Kamran Sajid" },
      { id: "p83", name: "Luqman Hakim" },
      { id: "p84", name: "Mehran Iqbal" },
      { id: "p85", name: "Noman Ali" },
      { id: "p86", name: "Omar Shahzad" },
      { id: "p87", name: "Qadeer Ahmed" },
      { id: "p88", name: "Rashid Latif Jr" },
    ],
  },
  {
    id: "t9",
    name: "Haroonabad Bulls",
    players: [
      { id: "p89", name: "Saqlain Mushtaq Jr" },
      { id: "p90", name: "Tauseef Ahmed" },
      { id: "p91", name: "Umar Gul Jr" },
      { id: "p92", name: "Yasir Shah Jr" },
      { id: "p93", name: "Zulfiqar Babar Jr" },
      { id: "p94", name: "Aizaz Cheema" },
      { id: "p95", name: "Bilawal Bhatti" },
      { id: "p96", name: "Chetan Saifullah" },
      { id: "p97", name: "Dilawar Khan" },
      { id: "p98", name: "Ehsan Adil" },
      { id: "p99", name: "Fahad Akhtar" },
    ],
  },
  {
    id: "t10",
    name: "Ahmadpur Knights",
    players: [
      { id: "p100", name: "Ghulam Mudassar" },
      { id: "p101", name: "Hafiz Habib" },
      { id: "p102", name: "Iftikhar Ahmed Jr" },
      { id: "p103", name: "Junaid Khan Jr" },
      { id: "p104", name: "Kamran Akmal Jr" },
      { id: "p105", name: "Lal Khan" },
      { id: "p106", name: "Maqsood Ahmed" },
      { id: "p107", name: "Nisar Ali" },
      { id: "p108", name: "Omer Khan" },
      { id: "p109", name: "Parvez Rasool" },
      { id: "p110", name: "Qamar Zaman" },
    ],
  },
  {
    id: "t11",
    name: "Minchinabad Cobras",
    players: [
      { id: "p111", name: "Riaz Ahmed" },
      { id: "p112", name: "Sajid Khan" },
      { id: "p113", name: "Tabish Khan" },
      { id: "p114", name: "Usama Mir" },
      { id: "p115", name: "Varun Ali" },
      { id: "p116", name: "Wahab Riaz Jr" },
      { id: "p117", name: "Xulfiqar Mirza" },
      { id: "p118", name: "Yousuf Baig" },
      { id: "p119", name: "Zahid Mahmood" },
      { id: "p120", name: "Arshad Iqbal" },
      { id: "p121", name: "Basit Ali Jr" },
    ],
  },
  {
    id: "t12",
    name: "Chishtian Gladiators",
    players: [
      { id: "p122", name: "Chand Nawab" },
      { id: "p123", name: "Danish Aziz" },
      { id: "p124", name: "Ejaz Ahmed Jr" },
      { id: "p125", name: "Fida Hussain" },
      { id: "p126", name: "Ghaffar Khan" },
      { id: "p127", name: "Hasnain Ali" },
      { id: "p128", name: "Imtiaz Ahmed" },
      { id: "p129", name: "Jamshed Khan" },
      { id: "p130", name: "Khalilullah" },
      { id: "p131", name: "Latif Ahmed" },
      { id: "p132", name: "Mansoor Akhtar" },
    ],
  },
  {
    id: "t13",
    name: "Sadiqabad Spartans",
    players: [
      { id: "p133", name: "Naved Latif" },
      { id: "p134", name: "Obaid Kakar" },
      { id: "p135", name: "Pasha Nawaz" },
      { id: "p136", name: "Qurban Ali" },
      { id: "p137", name: "Rahim Gul" },
      { id: "p138", name: "Sardar Khan" },
      { id: "p139", name: "Tahir Mughal" },
      { id: "p140", name: "Umar Akmal Jr" },
      { id: "p141", name: "Vaqar Ali" },
      { id: "p142", name: "Waqas Ali" },
      { id: "p143", name: "Xerxes Bhatti" },
    ],
  },
  {
    id: "t14",
    name: "Rahim Yar Khan XI",
    players: [
      { id: "p144", name: "Yaqoob Butt" },
      { id: "p145", name: "Zaeem Hussain" },
      { id: "p146", name: "Aqeel Ahmed" },
      { id: "p147", name: "Badshah Khan" },
      { id: "p148", name: "Chavez Ali" },
      { id: "p149", name: "Dilnawaz Baig" },
      { id: "p150", name: "Ejaz Mir" },
      { id: "p151", name: "Fiaz Ahmad" },
      { id: "p152", name: "Gulab Khan" },
      { id: "p153", name: "Hameed Gul" },
      { id: "p154", name: "Ilyas Butt" },
    ],
  },
  {
    id: "t15",
    name: "Liaquatpur Panthers",
    players: [
      { id: "p155", name: "Javed Akhtar" },
      { id: "p156", name: "Kamber Ali" },
      { id: "p157", name: "Lal Hussain" },
      { id: "p158", name: "Munib Rehman" },
      { id: "p159", name: "Nayyer Abbas" },
      { id: "p160", name: "Osama Tariq" },
      { id: "p161", name: "Perveen Akhtar" },
      { id: "p162", name: "Qadir Iqbal" },
      { id: "p163", name: "Rizwan Ahmed" },
      { id: "p164", name: "Saqlain Ahmed" },
      { id: "p165", name: "Taimur Mirza" },
    ],
  },
  {
    id: "t16",
    name: "Hasilpur Thunder",
    players: [
      { id: "p166", name: "Usman Ghani" },
      { id: "p167", name: "Vehbi Ali" },
      { id: "p168", name: "Waheed Khan" },
      { id: "p169", name: "Xander Raza" },
      { id: "p170", name: "Yawer Abbasi" },
      { id: "p171", name: "Zakir Khan" },
      { id: "p172", name: "Ameer Hamza" },
      { id: "p173", name: "Baber Azam Jr" },
      { id: "p174", name: "Corbin Pasha" },
      { id: "p175", name: "Danyal Hussain" },
      { id: "p176", name: "Ejaz Shah" },
    ],
  },
  {
    id: "t17",
    name: "Khanewal Strikers",
    players: [
      { id: "p177", name: "Adnan Raza" },
      { id: "p178", name: "Bilal Asif Jr" },
      { id: "p179", name: "Fahim Ashraf Jr" },
      { id: "p180", name: "Ghulam Ali" },
      { id: "p181", name: "Hammad Ahmed" },
      { id: "p182", name: "Imran Butt" },
      { id: "p183", name: "Jibran Khan" },
      { id: "p184", name: "Kamran Ghulam Jr" },
      { id: "p185", name: "Luqman Ahmed" },
      { id: "p186", name: "Mubashar Ahmed" },
      { id: "p187", name: "Noman Butt" },
    ],
  },
  {
    id: "t18",
    name: "Bahawal Nagar Stars",
    players: [
      { id: "p188", name: "Omer Butt" },
      { id: "p189", name: "Pervez Khan" },
      { id: "p190", name: "Qammar Hussain" },
      { id: "p191", name: "Rashid Khan" },
      { id: "p192", name: "Salim Raza" },
      { id: "p193", name: "Tahir Hussain" },
      { id: "p194", name: "Usman Butt" },
      { id: "p195", name: "Waqas Khan" },
      { id: "p196", name: "Yasir Khan" },
      { id: "p197", name: "Zafar Ali" },
      { id: "p198", name: "Asad Ali" },
    ],
  },
  {
    id: "t19",
    name: "Pakpattan Blazers",
    players: [
      { id: "p199", name: "Babar Khan" },
      { id: "p200", name: "Chaudhry Zafar" },
      { id: "p201", name: "Daniyal Raza" },
      { id: "p202", name: "Fahad Mirza" },
      { id: "p203", name: "Ghulam Rasool" },
      { id: "p204", name: "Haroon Khan" },
      { id: "p205", name: "Ikram Ullah" },
      { id: "p206", name: "Jawad Ahmed" },
      { id: "p207", name: "Khawaja Usman" },
      { id: "p208", name: "Liaquat Ali" },
      { id: "p209", name: "Murtaza Baig" },
    ],
  },
  {
    id: "t20",
    name: "Vehari Volcanoes",
    players: [
      { id: "p210", name: "Naseem Shah Jr" },
      { id: "p211", name: "Omer Farhan" },
      { id: "p212", name: "Pasha Ali" },
      { id: "p213", name: "Qaiser Abbas" },
      { id: "p214", name: "Rana Asif" },
      { id: "p215", name: "Shahbaz Ahmed" },
      { id: "p216", name: "Tariq Awan" },
      { id: "p217", name: "Usman Qadir Jr" },
      { id: "p218", name: "Wahid Ali" },
      { id: "p219", name: "Yasin Butt" },
      { id: "p220", name: "Zohaib Khan" },
    ],
  },
  {
    id: "t21",
    name: "Multan Mavericks",
    players: [
      { id: "p221", name: "Ahtesham Ali" },
      { id: "p222", name: "Bashar Hussain" },
      { id: "p223", name: "Dawood Khan" },
      { id: "p224", name: "Ehsan Mirza" },
      { id: "p225", name: "Faizan Ahmed" },
      { id: "p226", name: "Habib Ullah" },
      { id: "p227", name: "Irfan Khan" },
      { id: "p228", name: "Jahanzaib Ali" },
      { id: "p229", name: "Khawar Mehmood" },
      { id: "p230", name: "Laeeq Ahmed" },
      { id: "p231", name: "Moeez Khan" },
    ],
  },
  {
    id: "t22",
    name: "Taunsa Chargers",
    players: [
      { id: "p232", name: "Nafees Khan" },
      { id: "p233", name: "Owais Shah Jr" },
      { id: "p234", name: "Parvez Aziz" },
      { id: "p235", name: "Qadeer Ullah" },
      { id: "p236", name: "Rehman Gul" },
      { id: "p237", name: "Saadat Ali" },
      { id: "p238", name: "Tanvir Ahmed" },
      { id: "p239", name: "Usaid Khan" },
      { id: "p240", name: "Waqas Hussain" },
      { id: "p241", name: "Yaqub Khan" },
      { id: "p242", name: "Zain Butt" },
    ],
  },
  {
    id: "t23",
    name: "Rojhan Raiders",
    players: [
      { id: "p243", name: "Aamir Iqbal" },
      { id: "p244", name: "Baqir Hussain" },
      { id: "p245", name: "Chaand Butt" },
      { id: "p246", name: "Dost Muhammad" },
      { id: "p247", name: "Fazal Butt" },
      { id: "p248", name: "Gulzar Khan" },
      { id: "p249", name: "Haider Ali" },
      { id: "p250", name: "Inzamam Jr" },
      { id: "p251", name: "Javed Raza" },
      { id: "p252", name: "Khuram Iqbal" },
      { id: "p253", name: "Latif Ullah" },
    ],
  },
  {
    id: "t24",
    name: "Muzaffargarh Mustangs",
    players: [
      { id: "p254", name: "Mansoor Ali" },
      { id: "p255", name: "Nawab Khan" },
      { id: "p256", name: "Owais Butt" },
      { id: "p257", name: "Parvaiz Ahmed" },
      { id: "p258", name: "Qayyum Ali" },
      { id: "p259", name: "Ramzan Khan" },
      { id: "p260", name: "Sajid Ahmed" },
      { id: "p261", name: "Tariq Butt" },
      { id: "p262", name: "Umar Latif" },
      { id: "p263", name: "Vaqar Hussain" },
      { id: "p264", name: "Wasiq Ali" },
    ],
  },
];

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function initInnings(batting: Team, bowling: Team): InningsState {
  return {
    battingTeam: batting,
    bowlingTeam: bowling,
    totalRuns: 0,
    wickets: 0,
    balls: 0,
    activeBatsmen: [
      {
        player: batting.players[0],
        runs: 0,
        balls: 0,
        isStriker: true,
        isOut: false,
      },
      {
        player: batting.players[1],
        runs: 0,
        balls: 0,
        isStriker: false,
        isOut: false,
      },
    ],
    outBatsmen: [],
    nextBatsmanIndex: 2,
    isComplete: false,
  };
}

function isInningsComplete(innings: InningsState, totalOvers: number): boolean {
  return innings.balls >= totalOvers * 6 || innings.wickets >= 10;
}

/** Apply a legal delivery (0–6 runs). Updates runs, balls, strike rotation. */
function applyLegal(
  innings: InningsState,
  runs: number,
  totalOvers: number,
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

  const next: InningsState = {
    ...innings,
    totalRuns: innings.totalRuns + runs,
    balls: newBalls,
    activeBatsmen: newActive,
    isComplete: false,
  };
  next.isComplete = isInningsComplete(next, totalOvers);
  return next;
}

/** Apply wide or no-ball: add runs, do NOT count ball. */
function applyExtra(innings: InningsState, extraRuns: number): InningsState {
  return { ...innings, totalRuns: innings.totalRuns + extraRuns };
}

/** Apply wicket — must have already determined newBatsman (or null if last wicket). */
function applyWicket(
  innings: InningsState,
  wt: WicketType,
  newBatsman: Player | null,
  totalOvers: number,
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

  const next: InningsState = {
    ...innings,
    balls: newBalls,
    wickets: innings.wickets + 1,
    activeBatsmen: newActive,
    outBatsmen: [...innings.outBatsmen, outRecord],
    nextBatsmanIndex: innings.nextBatsmanIndex + 1,
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

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="min-h-screen bg-background flex flex-col"
    >
      {children}
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
  pastMatches: MatchRecord[];
}

function HomeView({
  onSetup,
  onTeams,
  onEditTeams,
  onTournament,
  pastMatches,
}: HomeViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [pwdDialog, setPwdDialog] = useState<{
    open: boolean;
    target: "edit" | "tournament" | null;
  }>({ open: false, target: null });
  const [pwdInput, setPwdInput] = useState("");
  const [_pwdError, setPwdError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function requestProtected(target: "edit" | "tournament") {
    setPwdInput("");
    setPwdError(false);
    setPwdDialog({ open: true, target });
  }

  function submitPassword() {
    if (pwdInput === "Shahzad@99") {
      const t = pwdDialog.target;
      setPwdDialog({ open: false, target: null });
      if (t === "edit") onEditTeams();
      if (t === "tournament") onTournament();
    } else {
      setPwdError(true);
    }
  }

  return (
    <Page>
      {/* Header */}
      <header className="pt-10 pb-6 px-6 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/assets/uploads/1773769089361-1.png"
            alt="CCB SCORING PRO"
            className="w-16 h-16 rounded-full object-cover border-2 border-primary"
          />
        </div>
        <h1
          className="font-display font-bold text-primary text-3xl sm:text-4xl tracking-widest uppercase leading-tight"
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

      <AnnouncementSection />

      {/* Action Buttons */}
      <main className="flex-1 flex flex-col items-center gap-4 px-6 py-8">
        {/* Share & Download Card */}
        <div
          className="w-full max-w-sm rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, #0a0a0a 0%, #0f1a00 100%)",
            border: "1.5px solid oklch(var(--p))",
            boxShadow: "0 0 22px oklch(var(--p) / 0.35)",
          }}
        >
          <p className="text-center font-display font-bold text-xs tracking-[0.2em] text-primary/80 uppercase mb-3">
            Share &amp; Download
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="home.copy_link.button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                } catch {
                  /* ignore */
                }
              }}
              className="flex-1 h-11 rounded-xl font-body font-semibold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
              style={{
                background: linkCopied
                  ? "oklch(var(--p) / 0.15)"
                  : "transparent",
                border: "1.5px solid oklch(var(--p) / 0.5)",
                color: linkCopied
                  ? "oklch(var(--p))"
                  : "rgba(255,255,255,0.75)",
              }}
            >
              {linkCopied ? "✓ COPIED!" : "📋 COPY LINK"}
            </button>
            <button
              type="button"
              data-ocid="home.share.button"
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: "CCB SCORING PRO",
                      text: "Download CCB Live Cricket Scoring App 🏏\nFast Live Score & Tournament Updates",
                      url: window.location.href,
                    });
                  } else {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`Download CCB SCORING PRO 🏏\nFast Live Score & Tournament Updates\n${window.location.href}`)}`,
                      "_blank",
                    );
                  }
                } catch {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`Download CCB SCORING PRO 🏏\nFast Live Score & Tournament Updates\n${window.location.href}`)}`,
                    "_blank",
                  );
                }
              }}
              className="flex-1 h-11 rounded-xl font-body font-semibold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
              style={{
                background: "oklch(var(--p) / 0.12)",
                border: "1.5px solid oklch(var(--p) / 0.5)",
                color: "oklch(var(--p))",
              }}
            >
              <Share2 size={15} />
              SHARE
            </button>
          </div>
        </div>
        <button
          type="button"
          data-ocid="home.start_match.primary_button"
          onClick={onSetup}
          className="w-full max-w-sm h-16 rounded-xl font-display font-bold text-xl tracking-wider text-black bg-primary border-0 cursor-pointer"
          style={{ boxShadow: "0 0 24px rgba(250,255,0,0.35)" }}
        >
          🏏 START MATCH
        </button>

        <button
          type="button"
          data-ocid="home.teams.secondary_button"
          onClick={onTeams}
          className="w-full max-w-sm h-14 rounded-xl font-body font-semibold text-base text-primary border-2 border-primary/60 bg-transparent cursor-pointer hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          <Users size={18} />
          TEAM DIRECTORY
        </button>

        <button
          type="button"
          data-ocid="home.edit_teams.secondary_button"
          onClick={() => requestProtected("edit")}
          className="w-full max-w-sm h-14 rounded-xl font-body font-semibold text-base text-white/80 border-2 border-white/30 bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <Pencil size={18} />
          ٹیموں کو ترمیم کریں / EDIT TEAMS
        </button>

        <button
          type="button"
          data-ocid="home.tournament.secondary_button"
          onClick={() => requestProtected("tournament")}
          className="w-full max-w-sm h-14 rounded-xl font-body font-semibold text-base text-primary border-2 border-primary/60 bg-transparent cursor-pointer hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          <Trophy size={18} />
          TOURNAMENT / ٹورنامنٹ
        </button>

        <button
          type="button"
          data-ocid="home.past_matches.toggle"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full max-w-sm h-14 rounded-xl font-body font-semibold text-base text-white/80 border border-white/20 bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <Trophy size={18} />
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
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-body font-semibold text-sm">
                            {m.teamA.name} vs {m.teamB.name}
                          </p>
                          <p className="text-primary text-xs font-body mt-0.5">
                            {m.resultText}
                          </p>
                        </div>
                        <p className="text-white/40 text-xs font-body">
                          {m.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer dev />

      {/* Password Dialog */}
      {pwdDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-xs rounded-2xl border border-primary/40 bg-zinc-950 p-6 flex flex-col gap-4">
            <h2 className="text-primary font-display font-bold text-lg text-center">
              🔒 Admin Password Required
            </h2>
            <p className="text-white/60 text-sm text-center">
              This section is for Admin only
            </p>
            <input
              type="password"
              value={pwdInput}
              onChange={(e) => {
                setPwdInput(e.target.value);
                setPwdError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="Enter Password"
              className="w-full rounded-lg border border-white/20 bg-black text-white px-4 py-3 text-base outline-none focus:border-primary text-center tracking-widest"
            />
            {_pwdError && (
              <p className="text-red-400 text-sm text-center">
                Wrong password -- please try again
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPwdDialog({ open: false, target: null })}
                className="flex-1 h-11 rounded-xl border border-white/20 text-white/60 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPassword}
                className="flex-1 h-11 rounded-xl bg-primary text-black font-bold text-sm"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg w-full max-h-[85vh] flex flex-col p-0 border border-yellow-400/40"
        style={{ background: "#000", color: "#fff" }}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-yellow-400/20 shrink-0">
          <DialogTitle className="text-yellow-400 font-bold text-lg tracking-wide flex items-center gap-2">
            <Pencil size={18} />
            ٹیموں کو ترمیم کریں / Edit Teams
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
                        Add Player / کھلاڑی شامل کریں
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
            منسوخ / Cancel
          </button>
          <button
            type="button"
            data-ocid="edit_teams.save_button"
            onClick={() => onSave(draft)}
            className="flex-1 h-11 rounded-xl bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 cursor-pointer border-0 tracking-wide transition-colors"
            style={{ boxShadow: "0 0 16px rgba(250,255,0,0.3)" }}
          >
            محفوظ کریں / Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
}

function SetupView({ onBack, onStart, teams }: SetupViewProps) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [overs, setOvers] = useState(6);
  const [error, setError] = useState("");

  const teamA = teams.find((t) => t.id === teamAId) ?? null;
  const teamB = teams.find((t) => t.id === teamBId) ?? null;

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
              {teams.map((t) => (
                <option key={t.id} value={t.id} style={{ background: "#111" }}>
                  {t.name}
                </option>
              ))}
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
// SCORING VIEW
// ──────────────────────────────────────────────────────────────

interface ScoringViewProps {
  innings: InningsState;
  inningsNum: 1 | 2;
  totalOvers: number;
  target?: number; // innings 2 only
  onUpdate: (newInnings: InningsState) => void;
  onInningsEnd: (finalInnings: InningsState) => void;
}

function ScoringView({
  innings,
  inningsNum,
  totalOvers,
  target,
  onUpdate,
  onInningsEnd,
}: ScoringViewProps) {
  const [undoStack, setUndoStack] = useState<InningsState[]>([]);
  const [bowlerName, setBowlerName] = useState(innings.bowlingTeam.name);
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
    const next = applyLegal(innings, runs, totalOvers);

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
        setBowlerInput("");
        setBowlerDlg(true);
      }
    }
  }

  function handleExtra(extraRuns: number) {
    pushUndo(innings);
    const next = applyExtra(innings, extraRuns);
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
      const next = applyWicket(innings, wt, null, totalOvers);
      setWicketDlg({ open: false, step: "type" });
      onInningsEnd(next);
    } else {
      setWicketDlg({ open: true, step: "batsman", wicketType: wt });
    }
  }

  function handleNewBatsman(player: Player) {
    if (!wicketDlg.wicketType) return;
    pushUndo(innings);
    const next = applyWicket(innings, wicketDlg.wicketType, player, totalOvers);
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
          <p className="text-white/60 font-body text-xs mb-1">
            Batsman / بلے باز
          </p>
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
          <p className="text-white/60 font-body text-xs mb-1">
            Bowler / گیند باز
          </p>
          <p
            data-ocid="scoring.bowler.input"
            className="font-body font-semibold text-base pb-1 border-b border-white/20"
            style={{ color: "#FF8C00" }}
          >
            {bowlerName}
          </p>
          {nonStriker && (
            <div className="mt-1">
              <p className="text-white/40 font-body text-[9px] uppercase tracking-wide mb-0.5">
                Non-striker / نان اسٹرائیکر
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
              Match Won! — تارگٹ حاصل کر لیا
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
            sub="قانونی گیند"
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
          <input
            className="w-full bg-gray-900 text-white border border-yellow-400/50 rounded px-3 py-2 text-base outline-none"
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
              شروع کریں / Start Over
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
// RESULT VIEW
// ──────────────────────────────────────────────────────────────

interface ResultViewProps {
  match: MatchRecord;
  onNewMatch: () => void;
}

function ResultView({ match, onNewMatch }: ResultViewProps) {
  const { innings1, innings2, resultText } = match;

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
        {(() => {
          const allBatsmen: { name: string; runs: number }[] = [];
          for (const inn of [innings1, innings2].filter(
            Boolean,
          ) as InningsState[]) {
            for (const b of [...inn.activeBatsmen, ...inn.outBatsmen]) {
              const existing = allBatsmen.find((x) => x.name === b.player.name);
              if (existing) existing.runs += b.runs;
              else allBatsmen.push({ name: b.player.name, runs: b.runs });
            }
          }
          const motm = allBatsmen.sort((a, b) => b.runs - a.runs)[0];
          if (!motm || motm.runs === 0) return null;
          return (
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
              <p
                className="text-yellow-300 font-display font-bold text-2xl"
                style={{ textShadow: "0 0 16px rgba(250,204,21,0.5)" }}
              >
                {motm.name}
              </p>
              <p className="text-yellow-400/80 text-sm mt-1 font-body">
                {motm.runs} Runs
              </p>
            </motion.div>
          );
        })()}

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
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            data-ocid="result.print.button"
            onClick={() => window.print()}
            className="w-full h-14 rounded-xl border border-white/30 text-white font-body font-semibold flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer bg-transparent"
          >
            <Printer size={18} />
            Print / Save PDF Scorecard
          </button>

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

function TournamentView({
  onBack,
  tournament,
  onUpdate,
  teams,
}: {
  onBack: () => void;
  tournament: Tournament;
  onUpdate: (t: Tournament) => void;
  teams: Team[];
}) {
  const [activeTab, setActiveTab] = useState<
    "setup" | "schedule" | "standings"
  >("setup");
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
      pwdVerified: false,
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
            <p className="text-white/50 text-xs font-body">ٹورنامنٹ مینجمنٹ</p>
          </div>
        </div>

        {/* Tournament Name */}
        <input
          type="text"
          data-ocid="tournament.name.input"
          value={tournament.name}
          onChange={(e) => updateTournament({ name: e.target.value })}
          className="w-full bg-transparent border border-primary/40 rounded-xl px-4 py-3 text-white font-body font-semibold text-lg focus:outline-none focus:border-primary"
          placeholder="Tournament Name / ٹورنامنٹ کا نام"
        />
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-white/10 px-4">
        {(["setup", "schedule", "standings"] as const).map((tab) => {
          const labels: Record<string, string> = {
            setup: "سیٹ اپ",
            schedule: "شیڈول",
            standings: "اسٹینڈنگز",
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
                کوئی پول نہیں۔ نیچے بٹن دبا کر پول شامل کریں۔
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
                      onChange={(e) => updatePoolName(pool.id, e.target.value)}
                      className="w-16 bg-transparent border border-primary/40 rounded-lg px-2 py-1 text-primary font-display font-bold text-lg text-center focus:outline-none focus:border-primary"
                      maxLength={3}
                    />
                    <div className="flex-1" />
                    <button
                      type="button"
                      data-ocid="tournament.pool.delete_button"
                      onClick={() => deletePool(pool.id)}
                      className="h-8 w-8 rounded-lg border border-red-500/40 text-red-400 flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
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
                          <button
                            type="button"
                            data-ocid="tournament.team.delete_button"
                            onClick={() => removeTeamFromPool(pool.id, tid)}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                    {pool.teamIds.length === 0 && (
                      <p className="text-white/30 text-xs font-body text-center py-2">
                        کوئی ٹیم نہیں — نیچے سے ٹیم منتخب کریں
                      </p>
                    )}
                  </div>

                  {/* Add team dropdown */}
                  {pool.teamIds.length < 5 && (
                    <select
                      data-ocid="tournament.team.select"
                      className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white/80 font-body text-sm focus:outline-none focus:border-primary"
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          addTeamToPool(pool.id, e.target.value);
                      }}
                    >
                      <option value="">+ ٹیم شامل کریں</option>
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
                      زیادہ سے زیادہ 5 ٹیمیں فی پول
                    </p>
                  )}
                </div>
              );
            })}

            {tournament.pools.length < 4 && (
              <button
                type="button"
                data-ocid="tournament.add_pool.button"
                onClick={addPool}
                className="w-full h-12 rounded-xl border-2 border-dashed border-primary/40 text-primary font-body font-semibold text-sm cursor-pointer hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                پول شامل کریں / Add Pool
              </button>
            )}
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {tournament.pools.length === 0 && (
              <p className="text-white/40 text-center py-8 font-body text-sm">
                پہلے سیٹ اپ میں پول بنائیں
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
                    {pool.teamIds.length >= 2 && (
                      <button
                        type="button"
                        data-ocid="tournament.add_match.button"
                        onClick={() => addMatch(pool.id)}
                        className="h-8 px-3 rounded-lg border border-primary/50 text-primary text-xs font-body font-semibold cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} />
                        میچ شامل کریں
                      </button>
                    )}
                  </div>
                  {poolMatches.length === 0 && (
                    <p className="text-white/30 text-xs font-body py-3 text-center border border-dashed border-white/10 rounded-lg">
                      کوئی میچ نہیں
                    </p>
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
                            <button
                              type="button"
                              data-ocid={`tournament.match.delete_button.${idx + 1}`}
                              onClick={() => confirmDeleteMatch(m.id)}
                              className="text-red-400/60 hover:text-red-400 cursor-pointer ml-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {/* Team selectors */}
                          <div className="flex items-center gap-2">
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
                          <button
                            type="button"
                            data-ocid="tournament.enter_score.button"
                            onClick={() => openScoreDialog(m)}
                            className="w-full h-9 rounded-lg border border-primary/40 text-primary text-xs font-body font-semibold cursor-pointer hover:bg-primary/10 transition-colors"
                          >
                            {m.status === "scheduled"
                              ? "سکور درج کریں / Enter Score"
                              : "سکور ترمیم کریں / Edit Score"}
                          </button>
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
                پہلے سیٹ اپ میں پول بنائیں
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
                    POOL {pool.name} — اسٹینڈنگز
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="text-left text-white/50 font-semibold px-3 py-2">
                            #
                          </th>
                          <th className="text-left text-white/50 font-semibold px-3 py-2">
                            ٹیم
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
                              کوئی ٹیم نہیں
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
              سکور درج کریں / Enter Score
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
                      اوورز / Total Overs
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
                        {homeTeam?.name ?? "Home"} — رنز
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
                        {homeTeam?.name ?? "Home"} — گیندیں
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
                        {awayTeam?.name ?? "Away"} — رنز
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
                        {awayTeam?.name ?? "Away"} — گیندیں
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
                      ? "⚠️ برابری — ٹائی میچ"
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
              محفوظ کریں
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

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
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
        src="/assets/uploads/1773769089361-1.png"
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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<View>("home");
  const [teams, setTeams] = useState<Team[]>(TEAMS);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [setupTeamA, setSetupTeamA] = useState<Team | null>(null);
  const [setupTeamB, setSetupTeamB] = useState<Team | null>(null);
  const [setupOvers, setSetupOvers] = useState(6);
  const [innings1, setInnings1] = useState<InningsState | null>(null);
  const [innings2, setInnings2] = useState<InningsState | null>(null);
  const [currentInningsNum, setCurrentInningsNum] = useState<1 | 2>(1);
  const [currentMatch, setCurrentMatch] = useState<MatchRecord | null>(null);
  const [pastMatches, setPastMatches] = useState<MatchRecord[]>([]);
  const [tournament, setTournament] = useState<Tournament>(EMPTY_TOURNAMENT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ccb_past_matches");
      if (saved) setPastMatches(JSON.parse(saved));
      const savedT = localStorage.getItem("ccb_tournament");
      if (savedT) setTournament(JSON.parse(savedT));
    } catch {}
  }, []);

  function handleUpdateTournament(t: Tournament) {
    setTournament(t);
    try {
      localStorage.setItem("ccb_tournament", JSON.stringify(t));
    } catch {}
  }

  function handleStartMatch(teamA: Team, teamB: Team, overs: number) {
    setSetupTeamA(teamA);
    setSetupTeamB(teamB);
    setSetupOvers(overs);
    const i1 = initInnings(teamA, teamB);
    setInnings1(i1);
    setInnings2(null);
    setCurrentInningsNum(1);
    setView("scoring");
  }

  function handleInnings1End(finalInnings: InningsState) {
    setInnings1(finalInnings);
    setView("innings-switch");
  }

  function handleStart2nd() {
    if (!innings1) return;
    const i2 = initInnings(innings1.bowlingTeam, innings1.battingTeam);
    setInnings2(i2);
    setCurrentInningsNum(2);
    setView("scoring");
  }

  function handleInnings2End(finalInnings: InningsState) {
    setInnings2(finalInnings);
    const i1 = innings1!;
    const result = calcResult(i1, finalInnings);
    const record: MatchRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-PK"),
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
      localStorage.setItem("ccb_past_matches", JSON.stringify(updated));
    } catch {}
    setCurrentMatch(record);
    setView("result");
  }

  const activeInnings = currentInningsNum === 1 ? innings1 : innings2;
  const setActiveInnings = currentInningsNum === 1 ? setInnings1 : setInnings2;

  const target =
    currentInningsNum === 2 && innings1 ? innings1.totalRuns + 1 : undefined;

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen onDone={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <AnimatePresence mode="wait">
        {view === "home" && (
          <HomeView
            key="home"
            onSetup={() => setView("setup")}
            onTeams={() => setView("teams")}
            onEditTeams={() => setShowEditTeams(true)}
            onTournament={() => setView("tournament")}
            pastMatches={pastMatches}
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
          <TournamentView
            key="tournament"
            onBack={() => setView("home")}
            tournament={tournament}
            onUpdate={handleUpdateTournament}
            teams={teams}
          />
        )}
      </AnimatePresence>
      <EditTeamsDialog
        open={showEditTeams}
        teams={teams}
        onSave={(updated) => {
          setTeams(updated);
          setShowEditTeams(false);
        }}
        onClose={() => setShowEditTeams(false)}
      />
    </div>
  );
}
