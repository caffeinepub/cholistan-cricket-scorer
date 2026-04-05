import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface PlayerRef {
  id: string;
  name: string;
}

interface TeamRef {
  id: string;
  name: string;
  players: PlayerRef[];
}

interface PremiumMatch {
  id: string;
  matchId: string;
  pool: string;
  matchNum: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  date?: string;
  time?: string;
  status: "scheduled" | "completed";
  homeRuns?: number;
  awayRuns?: number;
  isManual?: boolean;
}

interface UserPremiumData {
  tournamentName: string;
  teams: TeamRef[];
  matches: PremiumMatch[];
  schedule: PremiumMatch[];
  createdAt: string;
}

interface PremiumTournamentProps {
  onBack: () => void;
  defaultTeams: TeamRef[];
  myTeams: TeamRef[];
  isAdmin: boolean;
  onAdminLogin: () => void;
}

type PremiumState = "locked" | "code-entry" | "unlocked";

// Fixed 10-match schedule pattern (5-team pool)
const POOL_SCHEDULE = [
  [0, 1], // T1 vs T2
  [2, 3], // T3 vs T4
  [4, 0], // T5 vs T1
  [1, 2], // T2 vs T3
  [3, 4], // T4 vs T5
  [0, 2], // T1 vs T3
  [1, 4], // T2 vs T5
  [3, 0], // T4 vs T1
  [2, 4], // T3 vs T5
  [1, 3], // T2 vs T4
];

// ─────────────────────────────────────────────────────────────
// DATA HELPERS
// ─────────────────────────────────────────────────────────────

function generateMatchId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function savePremiumData(code: string, data: UserPremiumData): void {
  try {
    const allData: Record<string, UserPremiumData> = JSON.parse(
      localStorage.getItem("ccb_premium_data") || "{}",
    );
    // Backup first
    localStorage.setItem(
      "ccb_backup_premium",
      localStorage.getItem("ccb_premium_data") || "{}",
    );
    allData[code] = data;
    localStorage.setItem("ccb_premium_data", JSON.stringify(allData));
  } catch {}
}

function loadPremiumData(code: string): UserPremiumData {
  try {
    const allData: Record<string, UserPremiumData> = JSON.parse(
      localStorage.getItem("ccb_premium_data") || "{}",
    );
    return (
      allData[code] || {
        tournamentName: "",
        teams: [],
        matches: [],
        schedule: [],
        createdAt: "",
      }
    );
  } catch {
    try {
      const backup: Record<string, UserPremiumData> = JSON.parse(
        localStorage.getItem("ccb_backup_premium") || "{}",
      );
      return (
        backup[code] || {
          tournamentName: "",
          teams: [],
          matches: [],
          schedule: [],
          createdAt: "",
        }
      );
    } catch {
      return {
        tournamentName: "",
        teams: [],
        matches: [],
        schedule: [],
        createdAt: "",
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PremiumTournament({
  onBack,
  defaultTeams,
  myTeams,
  isAdmin,
  onAdminLogin,
}: PremiumTournamentProps) {
  // Auth state
  const [premiumState, setPremiumState] = useState<PremiumState>(() => {
    try {
      if (localStorage.getItem("ccb_premium_unlocked") === "true")
        return "unlocked";
    } catch {}
    return "locked";
  });
  const [userCode, setUserCode] = useState<string>(
    () => localStorage.getItem("ccb_user_code") || "",
  );
  const [tournamentCreated, setTournamentCreated] = useState<boolean>(
    () => localStorage.getItem("ccb_user_tournament_created") === "true",
  );

  // Locked state
  const [_uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(
    null,
  );
  const [waitingApproval, setWaitingApproval] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Code entry
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // Tournament data (only loaded after unlock)
  const [userData, setUserData] = useState<UserPremiumData>(() =>
    premiumState === "unlocked" && userCode
      ? loadPremiumData(userCode)
      : {
          tournamentName: "",
          teams: [],
          matches: [],
          schedule: [],
          createdAt: "",
        },
  );

  // Tournament creation form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Admin panel
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCodes, setAdminCodes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ccb_premium_codes") || "[]");
    } catch {
      return [];
    }
  });
  const [newCodeInput, setNewCodeInput] = useState("");

  // Schedule tab
  const [activeTab, setActiveTab] = useState<"schedule" | "results">(
    "schedule",
  );

  // Match edit
  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Score entry
  const [scoreMatchId, setScoreMatchId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  // Live link copy
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

  const allTeams = [...defaultTeams, ...myTeams];

  // ─── Save helper ───
  const saveData = useCallback(
    (data: UserPremiumData) => {
      setUserData(data);
      if (userCode) savePremiumData(userCode, data);
    },
    [userCode],
  );

  // Reload from storage when unlocked
  useEffect(() => {
    if (premiumState === "unlocked" && userCode) {
      const data = loadPremiumData(userCode);
      setUserData(data);
    }
  }, [premiumState, userCode]);

  // ─── Code unlock ───
  function handleUnlock() {
    const code = codeInput.trim();
    if (!code) {
      setCodeError("Please enter a code");
      return;
    }
    setUnlocking(true);
    setCodeError("");
    setTimeout(() => {
      try {
        const validCodes: string[] = JSON.parse(
          localStorage.getItem("ccb_premium_codes") || "[]",
        );
        if (validCodes.includes(code)) {
          localStorage.setItem("ccb_user_code", code);
          localStorage.setItem("ccb_premium_unlocked", "true");
          localStorage.setItem("ccb_user_tournament_created", "false");
          setUserCode(code);
          setTournamentCreated(false);
          setPremiumState("unlocked");
          toast.success("Premium unlocked! 🎉");
        } else {
          setCodeError("Invalid Code. Please contact Admin.");
        }
      } catch {
        setCodeError("Error checking code. Try again.");
      }
      setUnlocking(false);
    }, 600);
  }

  // ─── Screenshot upload ───
  function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedScreenshot(reader.result as string);
      setWaitingApproval(true);
      toast.success("Screenshot uploaded! Waiting for Admin approval.");
    };
    reader.readAsDataURL(file);
  }

  // ─── Tournament creation ───
  function handleCreateTournament() {
    if (!newTournamentName.trim()) {
      toast.error("Please enter a tournament name");
      return;
    }
    if (selectedTeamIds.length < 2) {
      toast.error("Select at least 2 teams");
      return;
    }

    const selectedTeams = allTeams.filter((t) =>
      selectedTeamIds.includes(t.id),
    );

    // Generate schedule (up to 5 teams, 1 pool)
    const schedule: PremiumMatch[] = [];
    const poolTeams = selectedTeams.slice(0, 5);
    const patternLength = Math.min(
      POOL_SCHEDULE.length,
      poolTeams.length < 2
        ? 0
        : poolTeams.length === 2
          ? 1
          : poolTeams.length === 3
            ? 3
            : poolTeams.length === 4
              ? 6
              : 10,
    );

    for (let i = 0; i < patternLength; i++) {
      const [a, b] = POOL_SCHEDULE[i];
      if (!poolTeams[a] || !poolTeams[b]) continue;
      const mId = generateMatchId();
      schedule.push({
        id: `m_${i + 1}`,
        matchId: mId,
        pool: "A",
        matchNum: i + 1,
        homeTeamId: poolTeams[a].id,
        awayTeamId: poolTeams[b].id,
        homeTeamName: poolTeams[a].name,
        awayTeamName: poolTeams[b].name,
        status: "scheduled",
      });
    }

    const newData: UserPremiumData = {
      tournamentName: newTournamentName.trim(),
      teams: selectedTeams,
      matches: [],
      schedule,
      createdAt: new Date().toISOString(),
    };

    saveData(newData);
    localStorage.setItem("ccb_user_tournament_created", "true");
    setTournamentCreated(true);
    setShowCreateForm(false);
    toast.success(`Tournament "${newTournamentName.trim()}" created! 🏏`);
  }

  // ─── Schedule edit ───
  function handleSaveMatchEdit() {
    const updated = {
      ...userData,
      schedule: userData.schedule.map((m) =>
        m.id === editMatchId
          ? { ...m, date: editDate, time: editTime, isManual: true }
          : m,
      ),
    };
    saveData(updated);
    setEditMatchId(null);
    toast.success("Match updated");
  }

  function handleDeleteMatch(id: string) {
    const updated = {
      ...userData,
      schedule: userData.schedule.filter((m) => m.id !== id),
    };
    saveData(updated);
    toast.success("Match removed");
  }

  function handleSwapTeams(id: string) {
    const updated = {
      ...userData,
      schedule: userData.schedule.map((m) =>
        m.id === id
          ? {
              ...m,
              homeTeamId: m.awayTeamId,
              awayTeamId: m.homeTeamId,
              homeTeamName: m.awayTeamName,
              awayTeamName: m.homeTeamName,
              isManual: true,
            }
          : m,
      ),
    };
    saveData(updated);
    toast.success("Teams swapped");
  }

  // ─── Score entry ───
  function handleSaveScore() {
    const hRuns = Number.parseInt(homeScore, 10);
    const aRuns = Number.parseInt(awayScore, 10);
    if (Number.isNaN(hRuns) || Number.isNaN(aRuns)) {
      toast.error("Enter valid scores");
      return;
    }
    const updated = {
      ...userData,
      schedule: userData.schedule.map((m) =>
        m.id === scoreMatchId
          ? {
              ...m,
              homeRuns: hRuns,
              awayRuns: aRuns,
              status: "completed" as const,
            }
          : m,
      ),
    };
    saveData(updated);
    setScoreMatchId(null);
    setHomeScore("");
    setAwayScore("");
    toast.success("Score saved! 🏏");
  }

  // ─── Live link copy ───
  function handleCopyLiveLink(matchId: string) {
    const url = `${window.location.origin}/match/${matchId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedMatchId(matchId);
      setTimeout(() => setCopiedMatchId(null), 2000);
      toast.success("Copied! 📡");
    });
  }

  // ─── Admin panel helpers ───
  function handleAddCode() {
    const code = newCodeInput.trim().toUpperCase();
    if (!code) return;
    if (adminCodes.includes(code)) {
      toast.error("Code already exists");
      return;
    }
    const updated = [...adminCodes, code];
    setAdminCodes(updated);
    localStorage.setItem("ccb_premium_codes", JSON.stringify(updated));
    setNewCodeInput("");
    toast.success(`Code ${code} added`);
  }

  function handleRemoveCode(code: string) {
    const updated = adminCodes.filter((c) => c !== code);
    setAdminCodes(updated);
    localStorage.setItem("ccb_premium_codes", JSON.stringify(updated));
    toast.success(`Code ${code} removed`);
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────

  const GoldBadge = ({ children }: { children: React.ReactNode }) => (
    <span
      style={{
        background: "linear-gradient(135deg, #ffd700, #ffaa00)",
        color: "#000",
        borderRadius: "20px",
        padding: "2px 10px",
        fontSize: "0.7rem",
        fontWeight: 800,
        letterSpacing: "0.06em",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {children}
    </span>
  );

  // ─────────────────────────────────────────────────────────────
  // LOCKED STATE
  // ─────────────────────────────────────────────────────────────

  const lockedView = (
    <motion.div
      key="locked"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      {/* Payment Card */}
      <div
        style={{
          background: "rgba(255,215,0,0.06)",
          border: "1.5px solid rgba(255,215,0,0.3)",
          borderRadius: "20px",
          padding: "24px 20px",
          boxShadow: "0 0 30px rgba(255,215,0,0.1), 0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            style={{ fontSize: "48px", lineHeight: 1 }}
          >
            💎
          </motion.div>
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "#ffd700",
              margin: "12px 0 4px",
              textShadow: "0 0 20px rgba(255,215,0,0.5)",
            }}
          >
            Unlock Premium Tournament
          </h2>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              color: "#00ff88",
              textShadow: "0 0 20px rgba(0,255,136,0.4)",
            }}
          >
            Rs 1,000
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,215,0,0.15)",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.7)",
              fontWeight: 700,
              marginBottom: "10px",
              letterSpacing: "0.04em",
            }}
          >
            💳 PAYMENT VIA
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}
              >
                Method
              </span>
              <span
                style={{
                  color: "#ffd700",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                EasyPaisa / JazzCash
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}
              >
                Number
              </span>
              <span
                style={{
                  color: "#00ff88",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                03418890677
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}
              >
                Name
              </span>
              <span
                style={{
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Shahzad Sultan
              </span>
            </div>
          </div>
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.82rem",
            textAlign: "center",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
          Send payment and upload screenshot for verification
        </p>

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleScreenshotUpload}
          data-ocid="premium.upload_button"
        />

        {!waitingApproval ? (
          <motion.button
            type="button"
            data-ocid="premium.upload_button"
            whileTap={{ scale: 0.96 }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "1.5px solid rgba(255,215,0,0.5)",
              background:
                "linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)",
              color: "#ffd700",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 0 20px rgba(255,215,0,0.2)",
            }}
          >
            📤 Upload Screenshot
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "rgba(255,165,0,0.15)",
              border: "1px solid rgba(255,165,0,0.4)",
              borderRadius: "14px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "#ffaa00",
                fontWeight: 700,
                fontSize: "0.9rem",
                margin: 0,
              }}
            >
              ⏳ Waiting for Admin Approval
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.75rem",
                marginTop: "6px",
              }}
            >
              Code will be provided by Admin after payment verification
            </p>
          </motion.div>
        )}
      </div>

      {/* Code entry card */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.8rem",
            marginBottom: "12px",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Already have a code?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="text"
            placeholder="Enter Unlock Code"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.toUpperCase());
              setCodeError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            data-ocid="premium.code.input"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: codeError
                ? "1.5px solid #ff4444"
                : "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              padding: "12px 14px",
              color: "#ffffff",
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          {codeError && (
            <p
              data-ocid="premium.code.error_state"
              style={{
                color: "#ff4444",
                fontSize: "0.78rem",
                margin: 0,
                fontWeight: 600,
              }}
            >
              ❌ {codeError}
            </p>
          )}
          <motion.button
            type="button"
            data-ocid="premium.unlock.primary_button"
            whileTap={{ scale: 0.96 }}
            onClick={handleUnlock}
            disabled={unlocking}
            style={{
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              background: unlocking
                ? "rgba(0,255,136,0.15)"
                : "linear-gradient(135deg, #00ff88, #00cc66)",
              color: unlocking ? "#00ff88" : "#000",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: unlocking ? "not-allowed" : "pointer",
              boxShadow: unlocking ? "none" : "0 0 20px rgba(0,255,136,0.3)",
            }}
          >
            {unlocking ? "Checking..." : "🔓 Unlock"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────
  // UNLOCKED STATE
  // ─────────────────────────────────────────────────────────────

  const scheduledMatches = userData.schedule.filter(
    (m) => m.status === "scheduled",
  );
  const completedMatches = userData.schedule.filter(
    (m) => m.status === "completed",
  );

  const unlockedView = (
    <motion.div
      key="unlocked"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      {/* User Badge */}
      <div
        style={{
          background: "rgba(255,215,0,0.08)",
          border: "1px solid rgba(255,215,0,0.25)",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "20px" }}>💎</span>
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Premium Active
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "#ffd700",
              fontWeight: 700,
            }}
          >
            Code: {userCode}
          </p>
        </div>
        <GoldBadge>✓ PREMIUM</GoldBadge>
      </div>

      {/* Tournament info or create form */}
      {userData.tournamentName ? (
        <div
          style={{
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: "14px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🏆</span>
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {userData.tournamentName}
            </h3>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {userData.teams.length} teams • {userData.schedule.length} matches
          </p>
        </div>
      ) : tournamentCreated ? (
        <div
          style={{
            background: "rgba(255,100,0,0.08)",
            border: "1px solid rgba(255,100,0,0.3)",
            borderRadius: "14px",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <p
            data-ocid="premium.code_used.error_state"
            style={{ color: "#ff8800", fontWeight: 700, margin: 0 }}
          >
            ⚠️ This code is already used for one tournament
          </p>
        </div>
      ) : (
        <motion.button
          type="button"
          data-ocid="premium.create_tournament.primary_button"
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: "16px",
            borderRadius: "14px",
            border: "1.5px solid rgba(255,215,0,0.4)",
            background:
              "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.08) 100%)",
            color: "#ffd700",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(255,215,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          🏏 Create Tournament
        </motion.button>
      )}

      {/* Schedule tabs */}
      {userData.schedule.length > 0 && (
        <div>
          {/* Tab headers */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {(["schedule", "results"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                data-ocid={`premium.${tab}.tab`}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "10px",
                  border:
                    activeTab === tab
                      ? "1.5px solid rgba(0,255,136,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                  background:
                    activeTab === tab ? "rgba(0,255,136,0.12)" : "transparent",
                  color:
                    activeTab === tab ? "#00ff88" : "rgba(255,255,255,0.4)",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {tab === "schedule"
                  ? `📅 Schedule (${scheduledMatches.length})`
                  : `✅ Results (${completedMatches.length})`}
              </button>
            ))}
          </div>

          {/* Matches list */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {(activeTab === "schedule"
              ? scheduledMatches
              : completedMatches
            ).map((match, idx) => (
              <motion.div
                key={match.id}
                data-ocid={`premium.match.item.${idx + 1}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  background: match.isManual
                    ? "rgba(255,165,0,0.06)"
                    : "rgba(255,255,255,0.04)",
                  border: match.isManual
                    ? "1px solid rgba(255,165,0,0.3)"
                    : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  padding: "14px",
                }}
              >
                {/* Match header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "#ffd700",
                        fontWeight: 700,
                        background: "rgba(255,215,0,0.12)",
                        borderRadius: "6px",
                        padding: "2px 8px",
                      }}
                    >
                      Match {match.matchNum}
                    </span>
                    {match.isManual && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "0.65rem",
                          color: "#ffaa00",
                          fontWeight: 700,
                          background: "rgba(255,165,0,0.12)",
                          borderRadius: "6px",
                          padding: "2px 8px",
                        }}
                      >
                        Manual
                      </span>
                    )}
                  </div>
                  {(match.date || match.time) && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {match.date} {match.time}
                    </span>
                  )}
                </div>

                {/* Teams */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      flex: 1,
                      wordBreak: "break-word",
                    }}
                  >
                    {match.homeTeamName}
                  </span>
                  {match.status === "completed" ? (
                    <div style={{ textAlign: "center", padding: "0 8px" }}>
                      <span
                        style={{
                          color: "#00ff88",
                          fontWeight: 800,
                          fontSize: "1rem",
                        }}
                      >
                        {match.homeRuns} - {match.awayRuns}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        color: "rgba(255,215,0,0.7)",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        padding: "0 8px",
                      }}
                    >
                      vs
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      flex: 1,
                      textAlign: "right",
                      wordBreak: "break-word",
                    }}
                  >
                    {match.awayTeamName}
                  </span>
                </div>

                {/* Action buttons */}
                {activeTab === "schedule" && (
                  <div
                    style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                  >
                    {/* Enter score */}
                    <motion.button
                      type="button"
                      data-ocid={`premium.match.edit_button.${idx + 1}`}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        setScoreMatchId(match.id);
                        setHomeScore("");
                        setAwayScore("");
                      }}
                      style={{
                        flex: 1,
                        minWidth: "80px",
                        padding: "7px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0,255,136,0.3)",
                        background: "rgba(0,255,136,0.1)",
                        color: "#00ff88",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Score
                    </motion.button>

                    {/* Edit date/time */}
                    <motion.button
                      type="button"
                      data-ocid={`premium.match.save_button.${idx + 1}`}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        setEditMatchId(match.id);
                        setEditDate(match.date || "");
                        setEditTime(match.time || "");
                      }}
                      style={{
                        flex: 1,
                        minWidth: "80px",
                        padding: "7px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,215,0,0.3)",
                        background: "rgba(255,215,0,0.08)",
                        color: "#ffd700",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      🕐 Time
                    </motion.button>

                    {/* Swap */}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleSwapTeams(match.id)}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      ⇄
                    </motion.button>

                    {/* Copy live link */}
                    <motion.button
                      type="button"
                      data-ocid={`premium.match.link.${idx + 1}`}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleCopyLiveLink(match.matchId)}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0,229,255,0.3)",
                        background:
                          copiedMatchId === match.matchId
                            ? "rgba(0,229,255,0.2)"
                            : "rgba(0,229,255,0.08)",
                        color: "#00e5ff",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      {copiedMatchId === match.matchId ? "✓" : "📡"}
                    </motion.button>

                    {/* Delete */}
                    <motion.button
                      type="button"
                      data-ocid={`premium.match.delete_button.${idx + 1}`}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleDeleteMatch(match.id)}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,68,68,0.3)",
                        background: "rgba(255,68,68,0.08)",
                        color: "#ff4444",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      🗑
                    </motion.button>
                  </div>
                )}

                {/* Copy live link on completed */}
                {activeTab === "results" && (
                  <motion.button
                    type="button"
                    data-ocid={`premium.result.link.${idx + 1}`}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleCopyLiveLink(match.matchId)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid rgba(0,229,255,0.3)",
                      background:
                        copiedMatchId === match.matchId
                          ? "rgba(0,229,255,0.2)"
                          : "rgba(0,229,255,0.06)",
                      color: "#00e5ff",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    📡{" "}
                    {copiedMatchId === match.matchId
                      ? "Copied!"
                      : "Copy Live Link"}
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {userData.tournamentName && userData.schedule.length === 0 && (
        <div
          data-ocid="premium.schedule.empty_state"
          style={{
            textAlign: "center",
            padding: "32px 20px",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          <p style={{ fontSize: "2rem" }}>📋</p>
          <p style={{ fontSize: "0.85rem" }}>No matches in schedule yet</p>
        </div>
      )}
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      key="premium-tournament"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "linear-gradient(160deg, #000000 0%, #0a0a0a 60%, #000d1a 100%)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        overflowY: "auto",
        paddingBottom: "80px",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,215,0,0.15)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          type="button"
          data-ocid="premium.back.button"
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "10px",
            padding: "8px",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>💎</span>
            <h1
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 800,
                background: "linear-gradient(90deg, #ffd700, #ffaa00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.04em",
              }}
            >
              PREMIUM TOURNAMENT
            </h1>
          </div>
        </div>

        {/* Admin settings icon */}
        <button
          type="button"
          data-ocid="premium.admin.open_modal_button"
          onClick={() => {
            if (isAdmin) {
              setShowAdminPanel(true);
            } else {
              onAdminLogin();
            }
          }}
          style={{
            background: isAdmin
              ? "rgba(255,215,0,0.15)"
              : "rgba(255,255,255,0.06)",
            border: isAdmin
              ? "1px solid rgba(255,215,0,0.4)"
              : "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            padding: "8px",
            color: isAdmin ? "#ffd700" : "rgba(255,255,255,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Admin Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "16px", flex: 1 }}>
        <AnimatePresence mode="wait">
          {premiumState === "locked" ? lockedView : unlockedView}
        </AnimatePresence>
      </div>

      {/* Create Tournament Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent
          style={{
            background: "#0d0d0d",
            border: "1.5px solid rgba(255,215,0,0.25)",
            color: "#ffffff",
            maxWidth: "360px",
            width: "calc(100vw - 32px)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#ffd700" }}>
              🏏 Create Tournament
            </DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              padding: "4px 0",
            }}
          >
            <div>
              <Label
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
              >
                Tournament Name
              </Label>
              <Input
                data-ocid="premium.tournament_name.input"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                placeholder="e.g. CCB Cup 2024"
                style={{
                  marginTop: "6px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                }}
              />
            </div>
            <div>
              <Label
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
              >
                Select Teams (min 2, max 5)
              </Label>
              <div
                style={{
                  marginTop: "8px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {/* Default Teams */}
                {defaultTeams.length > 0 && (
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.3)",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      margin: "4px 0 2px",
                    }}
                  >
                    DEFAULT TEAMS
                  </p>
                )}
                {defaultTeams.map((team) => (
                  <label
                    key={team.id}
                    data-ocid="premium.team.checkbox"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: selectedTeamIds.includes(team.id)
                        ? "rgba(0,255,136,0.1)"
                        : "rgba(255,255,255,0.04)",
                      border: selectedTeamIds.includes(team.id)
                        ? "1px solid rgba(0,255,136,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                      cursor:
                        !selectedTeamIds.includes(team.id) &&
                        selectedTeamIds.length >= 5
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !selectedTeamIds.includes(team.id) &&
                        selectedTeamIds.length >= 5
                          ? 0.4
                          : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      disabled={
                        !selectedTeamIds.includes(team.id) &&
                        selectedTeamIds.length >= 5
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedTeamIds.length < 5)
                            setSelectedTeamIds([...selectedTeamIds, team.id]);
                        } else {
                          setSelectedTeamIds(
                            selectedTeamIds.filter((id) => id !== team.id),
                          );
                        }
                      }}
                      style={{ accentColor: "#00ff88" }}
                    />
                    <span
                      style={{ fontSize: "0.85rem", color: "#ffffff", flex: 1 }}
                    >
                      {team.name}
                    </span>
                  </label>
                ))}
                {/* My Teams */}
                {myTeams.length > 0 && (
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.3)",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      margin: "8px 0 2px",
                    }}
                  >
                    MY TEAMS
                  </p>
                )}
                {myTeams.map((team) => (
                  <label
                    key={team.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: selectedTeamIds.includes(team.id)
                        ? "rgba(0,255,136,0.1)"
                        : "rgba(255,255,255,0.04)",
                      border: selectedTeamIds.includes(team.id)
                        ? "1px solid rgba(0,255,136,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                      cursor:
                        !selectedTeamIds.includes(team.id) &&
                        selectedTeamIds.length >= 5
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !selectedTeamIds.includes(team.id) &&
                        selectedTeamIds.length >= 5
                          ? 0.4
                          : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      disabled={
                        !selectedTeamIds.includes(team.id) &&
                        selectedTeamIds.length >= 5
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedTeamIds.length < 5)
                            setSelectedTeamIds([...selectedTeamIds, team.id]);
                        } else {
                          setSelectedTeamIds(
                            selectedTeamIds.filter((id) => id !== team.id),
                          );
                        }
                      }}
                      style={{ accentColor: "#00ff88" }}
                    />
                    <span
                      style={{ fontSize: "0.85rem", color: "#ffd700", flex: 1 }}
                    >
                      {team.name} ⭐
                    </span>
                  </label>
                ))}
              </div>
              {selectedTeamIds.length > 0 && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#00ff88",
                    marginTop: "6px",
                  }}
                >
                  {selectedTeamIds.length} team
                  {selectedTeamIds.length !== 1 ? "s" : ""} selected
                  {selectedTeamIds.length >= 5 && " (max)"}
                </p>
              )}
            </div>
          </div>
          <DialogFooter style={{ gap: "8px", marginTop: "4px" }}>
            <Button
              data-ocid="premium.create_tournament.cancel_button"
              variant="outline"
              onClick={() => setShowCreateForm(false)}
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="premium.create_tournament.submit_button"
              onClick={handleCreateTournament}
              style={{
                background: "linear-gradient(135deg, #ffd700, #ffaa00)",
                color: "#000",
                fontWeight: 800,
                border: "none",
              }}
            >
              Create 🏆
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog
        open={!!editMatchId}
        onOpenChange={(o) => !o && setEditMatchId(null)}
      >
        <DialogContent
          style={{
            background: "#0d0d0d",
            border: "1.5px solid rgba(255,215,0,0.25)",
            color: "#ffffff",
            maxWidth: "360px",
            width: "calc(100vw - 32px)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#ffd700" }}>
              🕐 Edit Match Time
            </DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "4px 0",
            }}
          >
            <div>
              <Label
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
              >
                Date
              </Label>
              <Input
                data-ocid="premium.match_date.input"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                style={{
                  marginTop: "6px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  colorScheme: "dark",
                }}
              />
            </div>
            <div>
              <Label
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
              >
                Time
              </Label>
              <Input
                data-ocid="premium.match_time.input"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                style={{
                  marginTop: "6px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>
          <DialogFooter style={{ gap: "8px", marginTop: "4px" }}>
            <Button
              data-ocid="premium.match_edit.cancel_button"
              variant="outline"
              onClick={() => setEditMatchId(null)}
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="premium.match_edit.save_button"
              onClick={handleSaveMatchEdit}
              style={{
                background: "linear-gradient(135deg, #ffd700, #ffaa00)",
                color: "#000",
                fontWeight: 800,
                border: "none",
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enter Score Dialog */}
      <Dialog
        open={!!scoreMatchId}
        onOpenChange={(o) => !o && setScoreMatchId(null)}
      >
        <DialogContent
          style={{
            background: "#0d0d0d",
            border: "1.5px solid rgba(0,255,136,0.25)",
            color: "#ffffff",
            maxWidth: "360px",
            width: "calc(100vw - 32px)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#00ff88" }}>
              🏏 Enter Match Score
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const m = userData.schedule.find((x) => x.id === scoreMatchId);
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div>
                    <Label
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {m?.homeTeamName || "Home"} Score
                    </Label>
                    <Input
                      data-ocid="premium.home_score.input"
                      type="number"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      placeholder="e.g. 142"
                      style={{
                        marginTop: "6px",
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                  <div>
                    <Label
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {m?.awayTeamName || "Away"} Score
                    </Label>
                    <Input
                      data-ocid="premium.away_score.input"
                      type="number"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      placeholder="e.g. 138"
                      style={{
                        marginTop: "6px",
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter style={{ gap: "8px", marginTop: "4px" }}>
            <Button
              data-ocid="premium.score.cancel_button"
              variant="outline"
              onClick={() => setScoreMatchId(null)}
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="premium.score.submit_button"
              onClick={handleSaveScore}
              style={{
                background: "linear-gradient(135deg, #00ff88, #00cc66)",
                color: "#000",
                fontWeight: 800,
                border: "none",
              }}
            >
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Panel Dialog */}
      <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
        <DialogContent
          style={{
            background: "#0d0d0d",
            border: "1.5px solid rgba(255,215,0,0.3)",
            color: "#ffffff",
            maxWidth: "380px",
            width: "calc(100vw - 32px)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#ffd700" }}>
              ⚙️ Admin — Manage Codes
            </DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              padding: "4px 0",
            }}
          >
            {/* Add code */}
            <div>
              <Label
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
              >
                Add New Code
              </Label>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <Input
                  data-ocid="premium.admin_code.input"
                  value={newCodeInput}
                  onChange={(e) =>
                    setNewCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="e.g. CCB2024A"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCode()}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                />
                <Button
                  data-ocid="premium.admin_code.primary_button"
                  onClick={handleAddCode}
                  style={{
                    background: "linear-gradient(135deg, #ffd700, #ffaa00)",
                    color: "#000",
                    fontWeight: 800,
                    border: "none",
                    flexShrink: 0,
                  }}
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {/* Code list */}
            <div>
              <Label
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
              >
                Active Codes ({adminCodes.length})
              </Label>
              {adminCodes.length === 0 ? (
                <p
                  data-ocid="premium.admin_codes.empty_state"
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "0.8rem",
                    marginTop: "8px",
                    textAlign: "center",
                    padding: "16px",
                  }}
                >
                  No codes yet
                </p>
              ) : (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {adminCodes.map((code, i) => (
                    <div
                      key={code}
                      data-ocid={`premium.admin_code.item.${i + 1}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: "#ffd700",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {code}
                      </span>
                      <button
                        type="button"
                        data-ocid={`premium.admin_code.delete_button.${i + 1}`}
                        onClick={() => handleRemoveCode(code)}
                        style={{
                          background: "rgba(255,68,68,0.15)",
                          border: "1px solid rgba(255,68,68,0.3)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          color: "#ff4444",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background: "rgba(255,165,0,0.08)",
                border: "1px solid rgba(255,165,0,0.2)",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "rgba(255,165,0,0.8)",
                  lineHeight: 1.5,
                }}
              >
                ⚠️ Codes are manually created by Admin only. 1 code = 1
                tournament. Users cannot see this panel.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="premium.admin_panel.close_button"
              onClick={() => setShowAdminPanel(false)}
              style={{
                background: "linear-gradient(135deg, #ffd700, #ffaa00)",
                color: "#000",
                fontWeight: 800,
                border: "none",
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
