import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// html2canvas loaded dynamically from CDN
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
  | "tournament"
  | "match-info"
  | "fixed-schedule"
  | "announcements"
  | "live-match"
  | "post-vote";

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
// HOME VIEW
// ──────────────────────────────────────────────────────────────

interface HomeViewProps {
  onSetup: () => void;
  onTeams: () => void;
  onEditTeams: () => void;
  onTournament: () => void;
  onFixedSchedule: () => void;
  onAnnouncements: () => void;
  onLiveMatch: () => void;
  onPostVote: () => void;
  pastMatches: MatchRecord[];
}

function HomeView({
  onSetup,
  onTeams,
  onEditTeams,
  onTournament,
  onFixedSchedule,
  onAnnouncements,
  onLiveMatch,
  onPostVote,
  pastMatches,
}: HomeViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  return (
    <Page
      style={{
        background:
          "linear-gradient(160deg, #000000 0%, #001a0a 60%, #000d1a 100%)",
      }}
    >
      {/* Header */}
      <header className="pt-10 pb-6 px-6 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/assets/generated/logo-hb-cricket-transparent.dim_512x512.png"
            alt="CCB SCORING PRO"
            className="w-20 h-20 object-contain"
            style={{ filter: "drop-shadow(0 0 16px #00ff88)" }}
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

      {/* Action Buttons */}
      <main className="flex-1 flex flex-col items-center gap-4 px-6 py-8 pb-24">
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

          {/* Announcements Card */}
          <motion.button
            type="button"
            data-ocid="home.announcements.secondary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onAnnouncements}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src="/assets/generated/icon-scoreboard-transparent.dim_256x256.png"
              alt="Announcements"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 10px #00ff88) drop-shadow(0 0 20px #00cc66)",
              }}
            />
            <span className="text-sm font-bold text-white tracking-wide text-center leading-tight">
              ANNOUNCEMENTS
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

          {/* POST & VOTE Card */}
          <motion.button
            type="button"
            data-ocid="home.post_vote.primary_button"
            whileTap={{ scale: 0.94 }}
            onClick={onPostVote}
            className="aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-2xl border cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,230,118,0.12) 0%, rgba(0,230,118,0.04) 100%)",
              borderColor: "rgba(0,230,118,0.35)",
              boxShadow:
                "0 4px 16px rgba(0,230,118,0.15), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src="/assets/generated/icon-settings-transparent.dim_256x256.png"
              alt="Match Prediction"
              className="w-14 h-14 object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 10px #ffd700) drop-shadow(0 0 20px #00ff88)",
              }}
            />
            <span
              className="text-sm font-bold tracking-wide text-center leading-tight"
              style={{ color: "#e2e8f0" }}
            >
              POST &amp; VOTE
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

      {/* Slim Fixed Footer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#0D0D0D",
          borderTop: "1px solid rgba(250,255,0,0.2)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "11px",
            letterSpacing: "0.1em",
          }}
        >
          SHARE &amp; DOWNLOAD
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
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
            style={{
              background: linkCopied ? "rgba(250,255,0,0.15)" : "transparent",
              border: "1.5px solid rgba(250,255,0,0.4)",
              borderRadius: "20px",
              padding: "6px 14px",
              color: linkCopied ? "#FAFF00" : "rgba(255,255,255,0.75)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.05em",
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
                    text: "Download CCB Live Cricket Scoring App 🏏",
                    url: window.location.href,
                  });
                } else {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`Download CCB SCORING PRO 🏏\n${window.location.href}`)}`,
                    "_blank",
                  );
                }
              } catch {
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`Download CCB SCORING PRO 🏏\n${window.location.href}`)}`,
                  "_blank",
                );
              }
            }}
            style={{
              background: "rgba(250,255,0,0.12)",
              border: "1.5px solid rgba(250,255,0,0.4)",
              borderRadius: "20px",
              padding: "6px 14px",
              color: "#FAFF00",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              letterSpacing: "0.05em",
            }}
          >
            <Share2 size={12} />
            SHARE
          </button>
        </div>
      </div>

      <Footer dev />
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
  onHome: () => void;
}

function ScoringView({
  innings,
  inningsNum,
  totalOvers,
  target,
  onUpdate,
  onInningsEnd,
  onHome,
}: ScoringViewProps) {
  const [undoStack, setUndoStack] = useState<InningsState[]>([]);
  const [bowlerName, setBowlerName] = useState(innings.bowlingTeam.name);

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

  function handleShare() {
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
    if (navigator.share) {
      navigator.share({ title: "CCB Match Report", text }).catch(() => {
        window.open(waUrl, "_blank");
      });
    } else {
      window.open(waUrl, "_blank");
    }
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
  const [adminUnlocked, setAdminUnlocked] = useState(false);
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
}: MatchInfoViewProps) {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
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

async function getHtml2Canvas() {
  if (!(window as any).html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("html2canvas load failed"));
      document.head.appendChild(s);
    });
  }
  return (window as any).html2canvas as (
    el: HTMLElement,
    opts?: any,
  ) => Promise<HTMLCanvasElement>;
}

async function saveAsPng(
  elementId: string,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void,
) {
  onStart?.();
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      alert("Element not found. Please scroll to the scorecard and try again.");
      onEnd?.();
      return;
    }
    const h2c = await getHtml2Canvas();
    const canvas = await h2c(el, {
      scale: 2,
      backgroundColor: "#0a0e21",
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onEnd?.();
  } catch (e) {
    console.error("PNG save failed:", e);
    alert("❌ Could not save PNG. Try taking a screenshot manually.");
    onEnd?.();
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
      alert("Element not found. Please scroll to the scorecard and try again.");
      onEnd?.();
      return;
    }
    const h2c = await getHtml2Canvas();
    const canvas = await h2c(el, {
      scale: 2,
      backgroundColor: "#0a0e21",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    // Load jsPDF from CDN dynamically
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
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 20;
    const imgH = (canvas.height * imgW) / canvas.width;
    const yOffset = imgH < pageH - 20 ? (pageH - imgH) / 2 : 10;
    pdf.addImage(imgData, "PNG", 10, yOffset, imgW, Math.min(imgH, pageH - 20));
    pdf.save(`${filename}.pdf`);
    onEnd?.();
  } catch (e) {
    console.error("PDF save failed:", e);
    alert("❌ Could not generate PDF.");
    onEnd?.();
  }
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
        src="/assets/generated/logo-hb-cricket-transparent.dim_512x512.png"
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
  onHome: () => void;
}

function FixedScheduleView({ teams, onHome }: FixedScheduleViewProps) {
  const times = [
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
  const matchPairs = [
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
  ] as const;
  const teamName = (i: number) => teams[i]?.name ?? `Team ${i + 1}`;

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
        <div className="w-20" />
      </div>

      {/* Schedule List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="text-center mb-4">
          <p className="text-yellow-300 text-sm font-semibold">
            CCB Tournament · Night Matches
          </p>
          <p className="text-white/50 text-xs mt-1">
            First 5 matches: 45 min gap · Last 5 matches: 40 min gap
          </p>
        </div>
        {matchPairs.map(([a, b], idx) => (
          <div
            key={`${a}-${b}`}
            data-ocid={`fixed_schedule.item.${idx + 1}`}
            className="rounded-2xl border border-white/10 p-4 flex items-center gap-4"
            style={{
              background:
                idx < 5
                  ? "linear-gradient(135deg, rgba(250,255,0,0.06) 0%, rgba(0,0,0,0.3) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex flex-col items-center min-w-[40px]">
              <span className="text-yellow-400 font-black text-lg leading-none">
                #{idx + 1}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-sm">{teamName(a)}</div>
              <div className="text-yellow-400 text-xs font-semibold my-0.5">
                VS
              </div>
              <div className="text-white font-bold text-sm">{teamName(b)}</div>
            </div>
            <div className="text-right">
              <span className="text-yellow-300 font-bold text-sm">
                {times[idx]}
              </span>
              <div className="text-white/40 text-xs mt-1">
                {idx < 5 ? "+45 min" : "+40 min"}
              </div>
            </div>
          </div>
        ))}
      </div>
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
  const [matchInfoCards, setMatchInfoCards] = useState<MatchInfoCard[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ccb_past_matches");
      if (saved) setPastMatches(JSON.parse(saved));
      const savedT = localStorage.getItem("ccb_tournament");
      if (savedT) setTournament(JSON.parse(savedT));
      const savedMIC = localStorage.getItem("ccb_match_info_cards");
      if (savedMIC) setMatchInfoCards(JSON.parse(savedMIC));
    } catch {}
  }, []);

  function handleUpdateMatchInfoCards(cards: MatchInfoCard[]) {
    setMatchInfoCards(cards);
    try {
      localStorage.setItem("ccb_match_info_cards", JSON.stringify(cards));
    } catch {}
  }

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
            onFixedSchedule={() => setView("fixed-schedule")}
            onAnnouncements={() => setView("announcements")}
            onLiveMatch={() => setView("live-match")}
            onPostVote={() => setView("post-vote")}
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
            onHome={() => setView("home")}
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

        {view === "match-info" && (
          <MatchInfoView
            key="match-info"
            onBack={() => setView("home")}
            cards={matchInfoCards}
            onUpdate={handleUpdateMatchInfoCards}
            lastMotm={lastMotm}
          />
        )}

        {view === "fixed-schedule" && (
          <FixedScheduleView
            key="fixed-schedule"
            teams={teams}
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

        {view === "post-vote" && (
          <PostVoteView
            key="post-vote"
            onHome={() => setView("home")}
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
