import { ArrowLeft, Camera, Share2, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface LiveMatchData {
  teamA: string;
  teamB: string;
  totalRuns: number;
  wickets: number;
  balls: number;
  totalOvers: number;
  target?: number;
  striker?: { name: string; runs: number; balls: number };
  nonStriker?: { name: string; runs: number; balls: number };
  bowler?: { name: string; overs: number; runs: number; wickets: number };
  inningsNum: number;
  isLive: boolean;
  matchTitle?: string;
}

const DEMO_DATA: LiveMatchData = {
  teamA: "9 DRB",
  teamB: "14 DRB",
  totalRuns: 142,
  wickets: 4,
  balls: 96,
  totalOvers: 20,
  target: 165,
  striker: { name: "Shahzad Sultan", runs: 67, balls: 52 },
  nonStriker: { name: "Rai Musyab", runs: 28, balls: 31 },
  bowler: { name: "Ahmad Buttar", overs: 3, runs: 24, wickets: 1 },
  inningsNum: 2,
  isLive: false,
  matchTitle: "CCB Tournament 2026",
};

function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function calcCRR(runs: number, balls: number): string {
  if (balls === 0) return "0.00";
  return (runs / (balls / 6)).toFixed(2);
}

function calcRRR(
  target: number,
  runs: number,
  balls: number,
  totalOvers: number,
): string {
  const ballsLeft = totalOvers * 6 - balls;
  if (ballsLeft <= 0) return "0.00";
  return ((target - runs) / (ballsLeft / 6)).toFixed(2);
}

function calcSR(runs: number, balls: number): string {
  if (balls === 0) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

interface Props {
  onBack: () => void;
}

export default function ScoreBoardTemplate({ onBack }: Props) {
  const [data, setData] = useState<LiveMatchData>(DEMO_DATA);
  const [isDemo, setIsDemo] = useState(true);
  const [saving, setSaving] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function poll() {
      try {
        const raw = localStorage.getItem("ccb_live_match");
        if (raw) {
          const parsed = JSON.parse(raw) as LiveMatchData;
          setData(parsed);
          setIsDemo(false);
        } else {
          setData(DEMO_DATA);
          setIsDemo(true);
        }
      } catch {
        setData(DEMO_DATA);
        setIsDemo(true);
      }
    }
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);

  const runsLeft = data.target ? data.target - data.totalRuns : 0;
  const ballsLeft = data.totalOvers * 6 - data.balls;
  const showTarget = data.inningsNum === 2 && data.target !== undefined;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  async function handleSavePNG() {
    if (!boardRef.current || saving) return;
    setSaving(true);
    try {
      let h2c = (window as any).html2canvas;
      if (!h2c) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("html2canvas load failed"));
          document.head.appendChild(s);
        });
        h2c = (window as any).html2canvas;
      }
      const canvas = await h2c(boardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `ccb-scoreboard-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleWhatsApp() {
    const overs = formatOvers(data.balls);
    let msg = "🏏 *CCB SCORING PRO*\n";
    if (data.matchTitle) msg += `📋 ${data.matchTitle}\n`;
    msg += `\n*${data.teamA}* vs *${data.teamB}*\n`;
    msg += `Score: *${data.totalRuns}/${data.wickets}* (${overs} ov)\n`;
    if (showTarget && data.target) {
      msg += `Target: ${data.target} | Need ${runsLeft} from ${ballsLeft} balls\n`;
      msg += `CRR: ${calcCRR(data.totalRuns, data.balls)} | RRR: ${calcRRR(data.target, data.totalRuns, data.balls, data.totalOvers)}\n`;
    }
    if (data.striker) {
      msg += `\n🏏 *${data.striker.name}*: ${data.striker.runs}(${data.striker.balls}) SR ${calcSR(data.striker.runs, data.striker.balls)}\n`;
    }
    if (data.nonStriker) {
      msg += `   ${data.nonStriker.name}: ${data.nonStriker.runs}(${data.nonStriker.balls})\n`;
    }
    if (data.bowler) {
      msg += `\n🎳 *${data.bowler.name}*: ${data.bowler.overs}-${data.bowler.runs}-${data.bowler.wickets}\n`;
    }
    msg += "\nPowered by CCB SCORING PRO";
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const statusBadge = isDemo ? "DEMO" : data.isLive ? "LIVE" : "COMPLETED";

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, #000000 0%, #0a1628 50%, #001a00 100%)",
      }}
    >
      {/* Top action bar (outside capture area) */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          type="button"
          data-ocid="scoreboard.back.button"
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <span className="text-white/40 text-xs">Score Board Template</span>
      </div>

      {/* Scoreboard capture area */}
      <div
        id="scoreboard-template"
        ref={boardRef}
        className="flex-1 flex flex-col px-4 pb-4"
        style={{
          background:
            "linear-gradient(135deg, #000000 0%, #0a1628 60%, #001a00 100%)",
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Wifi size={16} style={{ color: "#00E676" }} />
            <span
              className="font-bold text-sm"
              style={{ color: "#00E676", letterSpacing: "0.1em" }}
            >
              CCB SCORING PRO
            </span>
          </div>
          <span
            className="text-xs font-medium text-center flex-1 mx-4 truncate"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {data.matchTitle || "Cricket Match"}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {today}
          </span>
        </div>

        {/* Neon accent line */}
        <div
          className="w-full h-px mb-4"
          style={{
            background:
              "linear-gradient(90deg, transparent, #00E676 30%, #00E676 70%, transparent)",
          }}
        />

        {/* Status Badge */}
        <div className="flex justify-center mb-4">
          <AnimatePresence mode="wait">
            {statusBadge === "LIVE" ? (
              <motion.div
                key="live"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  borderColor: "rgba(239,68,68,0.6)",
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 1.2,
                  }}
                  className="text-red-400 text-lg leading-none"
                >
                  ●
                </motion.span>
                <span className="text-red-400 font-bold text-sm tracking-widest">
                  LIVE
                </span>
              </motion.div>
            ) : statusBadge === "COMPLETED" ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
                style={{
                  background: "rgba(148,163,184,0.1)",
                  borderColor: "rgba(148,163,184,0.3)",
                }}
              >
                <span className="text-slate-400 font-bold text-sm tracking-widest">
                  ✓ COMPLETED
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="demo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
                style={{
                  background: "rgba(234,179,8,0.1)",
                  borderColor: "rgba(234,179,8,0.3)",
                }}
              >
                <span className="text-yellow-400 font-bold text-sm tracking-widest">
                  ◆ DEMO
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Score Block */}
        <div
          className="rounded-3xl p-5 mb-4 text-center relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(0,230,118,0.3)",
            boxShadow:
              "0 0 40px rgba(0,230,118,0.1), inset 0 0 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Subtle field pattern */}
          <div
            className="absolute inset-0 rounded-3xl opacity-5"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, #00E676 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {/* Batting team */}
          <p className="text-white font-bold text-xl tracking-widest uppercase mb-2 relative z-10">
            {data.teamA}
          </p>

          {/* Score */}
          <div className="relative z-10 flex items-end justify-center gap-2 mb-1">
            <span
              className="font-black leading-none"
              style={{
                fontSize: "clamp(64px, 20vw, 96px)",
                color: "#FFD700",
                textShadow:
                  "0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)",
              }}
            >
              {data.totalRuns}/{data.wickets}
            </span>
          </div>

          {/* Overs */}
          <p
            className="text-lg font-semibold relative z-10 mb-1"
            style={{ color: "#00E676" }}
          >
            ({formatOvers(data.balls)} ov)
          </p>

          {/* Target info (2nd innings) */}
          {showTarget && data.target && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 pt-3 border-t relative z-10"
              style={{ borderColor: "rgba(0,230,118,0.2)" }}
            >
              <p
                className="text-sm font-bold mb-1"
                style={{ color: "#FCD34D" }}
              >
                Target: {data.target}
              </p>
              <p className="text-base font-bold" style={{ color: "#F97316" }}>
                Need {runsLeft} from {ballsLeft} balls
              </p>
            </motion.div>
          )}
        </div>

        {/* VS Divider & bowling team */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex-1 h-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          <span className="text-white/30 text-xs font-bold tracking-widest">
            vs
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
        </div>
        <p className="text-center text-white/60 font-semibold text-sm tracking-widest uppercase mb-4">
          {data.teamB}
        </p>

        {/* Run Rate Bar */}
        <div className="flex gap-3 mb-4">
          <div
            className="flex-1 rounded-2xl p-3 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(0,230,118,0.2)",
            }}
          >
            <p className="text-xs text-white/40 mb-1">CRR</p>
            <p className="text-xl font-black" style={{ color: "#00E676" }}>
              {calcCRR(data.totalRuns, data.balls)}
            </p>
          </div>
          {showTarget && data.target && (
            <div
              className="flex-1 rounded-2xl p-3 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(249,115,22,0.3)",
              }}
            >
              <p className="text-xs text-white/40 mb-1">RRR</p>
              <p className="text-xl font-black" style={{ color: "#F97316" }}>
                {calcRRR(
                  data.target,
                  data.totalRuns,
                  data.balls,
                  data.totalOvers,
                )}
              </p>
            </div>
          )}
        </div>

        {/* Batsmen Panel */}
        <div className="flex gap-3 mb-4">
          {/* Striker */}
          {data.striker && (
            <div
              data-ocid="scoreboard.striker.card"
              className="flex-1 rounded-2xl p-3"
              style={{
                background: "rgba(0,255,255,0.05)",
                border: "1px solid rgba(0,255,255,0.3)",
              }}
            >
              <div className="flex items-center gap-1 mb-2">
                <span style={{ color: "#FFD700", fontSize: "12px" }}>★</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: "#00FFFF" }}
                >
                  {data.striker.name}
                </span>
              </div>
              <p
                className="text-xl font-black leading-none"
                style={{
                  color: "#00FFFF",
                  textShadow: "0 0 12px rgba(0,255,255,0.5)",
                }}
              >
                {data.striker.runs}
                <span className="text-sm font-normal text-white/50">
                  ({data.striker.balls})
                </span>
              </p>
              <p className="text-xs text-white/40 mt-1">
                SR {calcSR(data.striker.runs, data.striker.balls)}
              </p>
            </div>
          )}

          {/* Non-striker */}
          {data.nonStriker && (
            <div
              data-ocid="scoreboard.non_striker.card"
              className="flex-1 rounded-2xl p-3"
              style={{
                background: "rgba(173,255,47,0.05)",
                border: "1px solid rgba(173,255,47,0.25)",
              }}
            >
              <div className="flex items-center gap-1 mb-2">
                <span
                  className="text-xs font-bold"
                  style={{ color: "#ADFF2F" }}
                >
                  {data.nonStriker.name}
                </span>
              </div>
              <p
                className="text-xl font-black leading-none"
                style={{ color: "#ADFF2F" }}
              >
                {data.nonStriker.runs}
                <span className="text-sm font-normal text-white/50">
                  ({data.nonStriker.balls})
                </span>
              </p>
              <p className="text-xs text-white/40 mt-1">
                SR {calcSR(data.nonStriker.runs, data.nonStriker.balls)}
              </p>
            </div>
          )}
        </div>

        {/* Bowler Panel */}
        {data.bowler && (
          <div
            data-ocid="scoreboard.bowler.card"
            className="rounded-2xl p-4 mb-4"
            style={{
              background: "rgba(255,140,0,0.06)",
              border: "1px solid rgba(255,140,0,0.3)",
            }}
          >
            <p className="text-xs text-white/40 mb-1 uppercase tracking-widest">
              Current Bowler
            </p>
            <div className="flex items-center justify-between">
              <p className="font-bold text-base" style={{ color: "#FF8C00" }}>
                {data.bowler.name}
              </p>
              <p
                className="font-mono text-sm font-bold"
                style={{ color: "#FF8C00", opacity: 0.8 }}
              >
                {data.bowler.overs}-{data.bowler.runs}-{data.bowler.wickets}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-3">
          <p
            className="text-xs font-semibold tracking-widest"
            style={{ color: "#00E676", opacity: 0.7 }}
          >
            Powered by CCB SCORING PRO
          </p>
        </div>
      </div>

      {/* Action Buttons (outside capture area) */}
      <div className="px-4 pb-24 flex flex-col gap-3 shrink-0">
        <div className="flex gap-3">
          <motion.button
            type="button"
            data-ocid="scoreboard.save_png.button"
            whileTap={{ scale: 0.96 }}
            onClick={handleSavePNG}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-black"
            style={{
              background: saving
                ? "rgba(0,230,118,0.4)"
                : "linear-gradient(135deg, #00E676, #00C853)",
              boxShadow: saving ? "none" : "0 0 20px rgba(0,230,118,0.4)",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            <Camera size={18} />
            {saving ? "Saving..." : "Save as PNG"}
          </motion.button>

          <motion.button
            type="button"
            data-ocid="scoreboard.share_whatsapp.button"
            whileTap={{ scale: 0.96 }}
            onClick={handleWhatsApp}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white"
            style={{
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              boxShadow: "0 0 20px rgba(37,211,102,0.3)",
              cursor: "pointer",
            }}
          >
            <Share2 size={18} />
            Share on WhatsApp
          </motion.button>
        </div>

        {isDemo && (
          <p className="text-center text-white/30 text-xs">
            Start a match to see live data here
          </p>
        )}
      </div>
    </div>
  );
}
