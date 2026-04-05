import { motion } from "motion/react";
import React, { useEffect, useState } from "react";

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
  matchId?: string;
}

function formatOvers(balls: number): string {
  const o = Math.floor(balls / 6);
  const b = balls % 6;
  return `${o}.${b}`;
}

export default function PublicLiveMatchPage() {
  const matchId = window.location.pathname.replace("/match/", "").split("/")[0];

  const [liveData, setLiveData] = useState<LiveMatchData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    function readData() {
      try {
        // Try match-specific key first
        const specific = localStorage.getItem(`ccb_live_match_${matchId}`);
        if (specific) {
          const parsed = JSON.parse(specific) as LiveMatchData;
          setLiveData(parsed);
          setLastUpdated(new Date());
          return;
        }
        // Fallback: check main live match key if matchId matches
        const main = localStorage.getItem("ccb_live_match");
        if (main) {
          const parsed = JSON.parse(main) as LiveMatchData;
          if (!parsed.matchId || parsed.matchId === matchId) {
            setLiveData(parsed);
            setLastUpdated(new Date());
          }
        }
      } catch {}
    }
    readData();
    const interval = setInterval(readData, 2000);
    return () => clearInterval(interval);
  }, [matchId]);

  const isLive = liveData && !liveData.isComplete;
  const runsNeeded =
    liveData?.target !== undefined
      ? liveData.target - liveData.totalRuns
      : undefined;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "linear-gradient(160deg, #000000 0%, #0a1a0a 50%, #000d1a 100%)",
        color: "#ffffff",
        fontFamily: "'Poppins', 'Montserrat', system-ui, sans-serif",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "100%",
          maxWidth: "480px",
          textAlign: "center",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255,215,0,0.2)",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "4px" }}>🏏</div>
        <h1
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            background: "linear-gradient(90deg, #ffd700, #00ff88)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
          }}
        >
          CCB SCORING PRO
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.7rem",
            margin: "4px 0 0",
          }}
        >
          LIVE MATCH TRACKER
        </p>
      </motion.div>

      {/* Main content */}
      <div style={{ width: "100%", maxWidth: "480px", flex: 1 }}>
        {!liveData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📡</div>
            <p style={{ fontSize: "1rem", fontWeight: 600 }}>
              No match found for this link
            </p>
            <p style={{ fontSize: "0.8rem", marginTop: "8px" }}>
              The match may not have started yet or the link is invalid.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {/* Status Badge */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              {isLive ? (
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    borderRadius: "20px",
                    padding: "4px 14px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#ff4444",
                    letterSpacing: "0.08em",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ff4444",
                      display: "inline-block",
                    }}
                  />
                  LIVE
                </motion.div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(0,255,136,0.15)",
                    border: "1px solid rgba(0,255,136,0.4)",
                    borderRadius: "20px",
                    padding: "4px 14px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#00ff88",
                    letterSpacing: "0.08em",
                  }}
                >
                  ✓ COMPLETED
                </div>
              )}
            </div>

            {/* Score Card */}
            <motion.div
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,215,0,0.25)",
                borderRadius: "20px",
                padding: "24px 20px",
                boxShadow:
                  "0 0 30px rgba(255,215,0,0.08), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {/* Teams */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color:
                        liveData.inningsNum === 1
                          ? "#00ff88"
                          : "rgba(255,255,255,0.6)",
                      margin: 0,
                      wordBreak: "break-word",
                    }}
                  >
                    {liveData.teamA}
                  </p>
                  {liveData.inningsNum === 1 && (
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "rgba(0,255,136,0.6)",
                        margin: "2px 0 0",
                      }}
                    >
                      BATTING
                    </p>
                  )}
                </div>
                <div
                  style={{
                    background: "rgba(255,215,0,0.15)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: "12px",
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#ffd700",
                    whiteSpace: "nowrap",
                  }}
                >
                  VS
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color:
                        liveData.inningsNum === 2
                          ? "#00ff88"
                          : "rgba(255,255,255,0.6)",
                      margin: 0,
                      wordBreak: "break-word",
                    }}
                  >
                    {liveData.teamB}
                  </p>
                  {liveData.inningsNum === 2 && (
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "rgba(0,255,136,0.6)",
                        margin: "2px 0 0",
                      }}
                    >
                      BATTING
                    </p>
                  )}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <motion.div
                  key={`${liveData.totalRuns}-${liveData.wickets}`}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  style={{
                    fontSize: "3.5rem",
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "#ffffff",
                    textShadow: "0 0 30px rgba(0,255,136,0.4)",
                  }}
                >
                  {liveData.totalRuns}/{liveData.wickets}
                </motion.div>
                <div
                  style={{
                    fontSize: "1rem",
                    color: "rgba(255,255,255,0.6)",
                    marginTop: "6px",
                    fontWeight: 600,
                  }}
                >
                  {formatOvers(liveData.balls)} / {liveData.totalOvers} ov
                </div>
                {liveData.inningsNum === 2 && liveData.target !== undefined && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "0.85rem",
                      color:
                        runsNeeded !== undefined && runsNeeded <= 0
                          ? "#00ff88"
                          : "#ffd700",
                      fontWeight: 700,
                    }}
                  >
                    {runsNeeded !== undefined && runsNeeded <= 0
                      ? "Target Achieved! 🎉"
                      : `Target: ${liveData.target} | Need: ${runsNeeded} runs`}
                  </div>
                )}
              </div>

              {/* Players */}
              {isLive && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(0,255,136,0.08)",
                      border: "1px solid rgba(0,255,136,0.2)",
                      borderRadius: "12px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.65rem",
                        color: "rgba(255,255,255,0.4)",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        margin: "0 0 4px",
                      }}
                    >
                      🏏 BATSMAN
                    </p>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#00ff88",
                        margin: "0 0 2px",
                        wordBreak: "break-word",
                      }}
                    >
                      {liveData.strikerName} *
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.5)",
                        margin: 0,
                      }}
                    >
                      {liveData.strikerRuns}r ({liveData.strikerBalls}b)
                    </p>
                    {liveData.nonStrikerName && (
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "rgba(255,255,255,0.6)",
                          margin: "6px 0 0",
                          wordBreak: "break-word",
                        }}
                      >
                        {liveData.nonStrikerName} {liveData.nonStrikerRuns}r
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      background: "rgba(255,100,100,0.08)",
                      border: "1px solid rgba(255,100,100,0.2)",
                      borderRadius: "12px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.65rem",
                        color: "rgba(255,255,255,0.4)",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        margin: "0 0 4px",
                      }}
                    >
                      ⚡ BOWLER
                    </p>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#ff9090",
                        margin: 0,
                        wordBreak: "break-word",
                      }}
                    >
                      {liveData.bowlerName}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Last updated */}
            {lastUpdated && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.3)",
                  margin: 0,
                }}
              >
                Last updated:{" "}
                {lastUpdated.toLocaleTimeString("en-PK", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          textAlign: "center",
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.35)",
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: 0 }}>CCB Scoring Pro</p>
        <p style={{ margin: 0 }}>
          Managed by Shahzad Sultan | Contact: 03418890677
        </p>
      </div>
    </div>
  );
}
