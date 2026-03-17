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
  Shield,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

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
  | "result";

interface BatsmanState {
  player: Player;
  runs: number;
  balls: number;
  isStriker: boolean;
  isOut: boolean;
  wicketType?: WicketType;
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
  pastMatches: MatchRecord[];
}

function HomeView({
  onSetup,
  onTeams,
  onEditTeams,
  pastMatches,
}: HomeViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Page>
      {/* Header */}
      <header className="pt-10 pb-6 px-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center text-3xl">
            🏏
          </div>
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
      <main className="flex-1 flex flex-col items-center gap-4 px-6 py-8">
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
          onClick={onEditTeams}
          className="w-full max-w-sm h-14 rounded-xl font-body font-semibold text-base text-white/80 border-2 border-white/30 bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <Pencil size={18} />
          ٹیموں کو ترمیم کریں / EDIT TEAMS
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
              {[5, 6, 7, 8, 9, 10].map((ov) => (
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
  const [wicketDlg, setWicketDlg] = useState<WicketDialog>({
    open: false,
    step: "type",
  });
  const [editableTeamName, setEditableTeamName] = useState(
    innings.battingTeam.name,
  );
  const [editableBowlerName, setEditableBowlerName] = useState(
    innings.bowlingTeam.name,
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
    if (next.isComplete) {
      onInningsEnd(next);
    } else {
      onUpdate(next);
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

  return (
    <Page>
      {/* AppBar — Flutter-style black header with yellow title */}
      <header className="bg-black px-4 py-3 flex items-center justify-center border-b border-primary/20 relative">
        <h1 className="font-display font-bold text-primary text-lg tracking-widest uppercase text-center">
          CHOLISTAN CRICKET BOARD
        </h1>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-body">
          INN {inningsNum}
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
            readOnly
            className="w-full bg-transparent border-none border-b border-white/20 outline-none font-body font-semibold text-base pb-1 focus:ring-0 p-0 focus:border-b focus:border-cyan-400"
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
          <input
            type="text"
            data-ocid="scoring.bowler.input"
            value={editableBowlerName}
            onChange={(e) => setEditableBowlerName(e.target.value)}
            className="w-full bg-transparent border-none border-b border-white/20 outline-none font-body font-semibold text-base pb-1 focus:ring-0 p-0"
            style={{ color: "#FF8C00" }}
            placeholder="Bowler Name"
          />
          {nonStriker && (
            <p className="text-white/40 font-body text-[11px] mt-0.5">
              Non-striker: {nonStriker?.player.name}
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-white/15" />

      {/* Scoring Buttons — 3x3 grid + LEGAL full-width */}
      <div className="flex-1 bg-black p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm mx-auto">
          {/* Row 1: 1, 2, 3 — light green */}
          <ScoreBtn
            label="1"
            sub="Run"
            colorClass="bg-btn-green"
            onClick={() => handleRun(1)}
            ocid="scoring.run_1.button"
          />
          <ScoreBtn
            label="2"
            sub="Runs"
            colorClass="bg-btn-green"
            onClick={() => handleRun(2)}
            ocid="scoring.run_2.button"
          />
          <ScoreBtn
            label="3"
            sub="Runs"
            colorClass="bg-btn-green"
            onClick={() => handleRun(3)}
            ocid="scoring.run_3.button"
          />
          {/* Row 2: 4, 6, WD */}
          <ScoreBtn
            label="4"
            sub="FOUR"
            colorClass="bg-btn-blue"
            onClick={() => handleRun(4)}
            ocid="scoring.run_4.button"
          />
          <ScoreBtn
            label="6"
            sub="SIX"
            colorClass="bg-btn-orange"
            onClick={() => handleRun(6)}
            ocid="scoring.run_6.button"
          />
          <ScoreBtn
            label="WD"
            sub="Wide"
            colorClass="bg-btn-pink"
            onClick={() => handleExtra(1)}
            ocid="scoring.wide.button"
          />
          {/* Row 3: NB, OUT, 0 */}
          <ScoreBtn
            label="NB"
            sub="No Ball"
            colorClass="bg-btn-purple"
            onClick={() => handleExtra(1)}
            ocid="scoring.noball.button"
          />
          <ScoreBtn
            label="OUT"
            sub="Wicket"
            colorClass="bg-btn-red"
            onClick={handleOutClick}
            ocid="scoring.out.button"
          />
          <ScoreBtn
            label="0"
            sub="Dot"
            colorClass="bg-btn-gray"
            onClick={() => handleRun(0)}
            ocid="scoring.run_0.button"
          />
          {/* LEGAL — full width bottom */}
          <ScoreBtn
            label="LEGAL"
            sub="قانونی گیند"
            colorClass="bg-btn-legal"
            onClick={() => handleRun(0)}
            ocid="scoring.legal.button"
            wide
          />
        </div>

        {/* Undo */}
        <div className="flex justify-center mt-3 max-w-sm mx-auto">
          <button
            type="button"
            data-ocid="scoring.undo.button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
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
// APP ROOT
// ──────────────────────────────────────────────────────────────

export default function App() {
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ccb_past_matches");
      if (saved) setPastMatches(JSON.parse(saved));
    } catch {}
  }, []);

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
    const updated = [record, ...pastMatches];
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

  return (
    <div className="bg-background min-h-screen">
      <AnimatePresence mode="wait">
        {view === "home" && (
          <HomeView
            key="home"
            onSetup={() => setView("setup")}
            onTeams={() => setView("teams")}
            onEditTeams={() => setShowEditTeams(true)}
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
