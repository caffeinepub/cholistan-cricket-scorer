import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface Rule {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface RulesPageProps {
  isAdmin: boolean;
  onBack: () => void;
  onAdminLogin: () => void;
}

const DEFAULT_RULES: Rule[] = [
  {
    id: "default-1",
    title: "ٹیم رجسٹریشن",
    description:
      "چولیستان کرکٹ بورڈ میں جتنے بھی رجسٹر ٹیم ہیں وہ جلد جلد اپنی ٹیموں کی لسٹ مکمل کریں",
    createdAt: new Date().toISOString(),
  },
];

const RULES_KEY = "ccb_rules";
const LIKES_KEY = "ccb_rule_likes";

function loadRules(): Rule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) return JSON.parse(raw) as Rule[];
  } catch {}
  return DEFAULT_RULES;
}

function saveRules(rules: Rule[]) {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {}
}

function loadLikes(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {}
  return {};
}

function saveLikes(likes: Record<string, boolean>) {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
  } catch {}
}

const LIKE_COUNTS_KEY = "ccb_rule_like_counts";

function loadLikeCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LIKE_COUNTS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {}
  return {};
}

function saveLikeCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(LIKE_COUNTS_KEY, JSON.stringify(counts));
  } catch {}
}

export function RulesPage({ isAdmin, onBack, onAdminLogin }: RulesPageProps) {
  const [rules, setRules] = useState<Rule[]>(() => loadRules());
  const [myLikes, setMyLikes] = useState<Record<string, boolean>>(() =>
    loadLikes(),
  );
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() =>
    loadLikeCounts(),
  );
  const [likeAnim, setLikeAnim] = useState<Record<string, boolean>>({});

  // Add form state
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addError, setAddError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  const handleAddRule = () => {
    if (!addTitle.trim()) {
      setAddError("Title is required");
      return;
    }
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      title: addTitle.trim(),
      description: addDesc.trim(),
      createdAt: new Date().toISOString(),
    };
    setRules((prev) => [newRule, ...prev]);
    setAddTitle("");
    setAddDesc("");
    setAddError("");
  };

  const handleDelete = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditTitle(rule.title);
    setEditDesc(rule.description);
  };

  const saveEdit = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, title: editTitle, description: editDesc } : r,
      ),
    );
    setEditingId(null);
  };

  const handleLike = (id: string) => {
    if (myLikes[id]) return;
    const newLikes = { ...myLikes, [id]: true };
    const newCounts = { ...likeCounts, [id]: (likeCounts[id] || 0) + 1 };
    setMyLikes(newLikes);
    setLikeCounts(newCounts);
    saveLikes(newLikes);
    saveLikeCounts(newCounts);
    setLikeAnim((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setLikeAnim((prev) => ({ ...prev, [id]: false })), 400);
  };

  const maxLikes = Math.max(0, ...rules.map((r) => likeCounts[r.id] || 0));

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      data-ocid="rules.page"
      style={{
        minHeight: "100dvh",
        background:
          "linear-gradient(160deg, #0a0a0a 0%, #0d1a0d 60%, #0a0a0a 100%)",
        fontFamily: "'Poppins', system-ui, sans-serif",
        paddingBottom: "80px",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(34,197,94,0.25)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          type="button"
          data-ocid="rules.back.button"
          onClick={onBack}
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "10px",
            color: "#22c55e",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.02em",
            }}
          >
            📋 Rules & Regulations
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              marginTop: 1,
            }}
          >
            Cholistan Cricket Board
          </p>
        </div>
        {isAdmin ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#22c55e",
              background: "rgba(34,197,94,0.14)",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 8,
              padding: "3px 10px",
              letterSpacing: "0.05em",
            }}
          >
            🔓 ADMIN
          </span>
        ) : (
          <button
            type="button"
            data-ocid="rules.admin_login.button"
            onClick={onAdminLogin}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "3px 10px",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            🔒 Admin
          </button>
        )}
      </div>

      <div style={{ padding: "16px", maxWidth: 560, margin: "0 auto" }}>
        {/* Admin Add Form */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            data-ocid="rules.add_form.panel"
            style={{
              background: "rgba(34,197,94,0.07)",
              border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                fontWeight: 700,
                color: "#22c55e",
                letterSpacing: "0.04em",
              }}
            >
              + ADD NEW RULE
            </p>
            <input
              data-ocid="rules.title.input"
              type="text"
              placeholder="Rule Title"
              value={addTitle}
              onChange={(e) => {
                setAddTitle(e.target.value);
                setAddError("");
              }}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <textarea
              data-ocid="rules.description.textarea"
              placeholder="Rule description..."
              value={addDesc}
              onChange={(e) => setAddDesc(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            {addError && (
              <p style={{ color: "#f87171", fontSize: 12, margin: "0 0 8px" }}>
                {addError}
              </p>
            )}
            <motion.button
              type="button"
              data-ocid="rules.add_rule.button"
              whileTap={{ scale: 0.95 }}
              onClick={handleAddRule}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "none",
                borderRadius: 10,
                padding: "11px",
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
              }}
            >
              ✓ Add Rule
            </motion.button>
          </motion.div>
        )}

        {!isAdmin && (
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "rgba(255,255,255,0.28)",
              marginBottom: 16,
              letterSpacing: "0.04em",
            }}
          >
            🔒 Only admin can add or edit rules
          </div>
        )}

        {/* Rules List */}
        {rules.length === 0 ? (
          <div
            data-ocid="rules.list.empty_state"
            style={{
              textAlign: "center",
              padding: "48px 16px",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              کوئی قوانین نہیں ہیں
            </p>
            <p
              style={{
                fontSize: 12,
                margin: "4px 0 0",
                color: "rgba(255,255,255,0.22)",
              }}
            >
              No rules added yet
            </p>
          </div>
        ) : (
          <div
            data-ocid="rules.list"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <AnimatePresence>
              {rules.map((rule, idx) => {
                const count = likeCounts[rule.id] || 0;
                const liked = !!myLikes[rule.id];
                const isMostPopular = maxLikes > 0 && count === maxLikes;
                const isEditing = editingId === rule.id;

                return (
                  <motion.div
                    key={rule.id}
                    data-ocid={`rules.item.${idx + 1}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04 }}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: isMostPopular
                        ? "1px solid rgba(251,191,36,0.5)"
                        : "1px solid rgba(34,197,94,0.22)",
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: isMostPopular
                        ? "0 0 18px rgba(251,191,36,0.12)"
                        : "0 2px 12px rgba(0,0,0,0.3)",
                    }}
                  >
                    {isEditing ? (
                      <div>
                        <input
                          data-ocid={"rules.edit_title.input"}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(34,197,94,0.4)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            color: "#fff",
                            fontSize: 14,
                            fontFamily: "inherit",
                            outline: "none",
                            marginBottom: 8,
                            boxSizing: "border-box",
                          }}
                        />
                        <textarea
                          data-ocid={"rules.edit_description.textarea"}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          rows={3}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(34,197,94,0.4)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            color: "#fff",
                            fontSize: 13,
                            fontFamily: "inherit",
                            outline: "none",
                            resize: "vertical",
                            marginBottom: 10,
                            boxSizing: "border-box",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <motion.button
                            type="button"
                            data-ocid={"rules.save_edit.button"}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => saveEdit(rule.id)}
                            style={{
                              flex: 1,
                              background:
                                "linear-gradient(135deg, #22c55e, #16a34a)",
                              border: "none",
                              borderRadius: 8,
                              padding: "9px",
                              color: "#000",
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ✓ Save
                          </motion.button>
                          <motion.button
                            type="button"
                            data-ocid={"rules.cancel_edit.button"}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEditingId(null)}
                            style={{
                              flex: 1,
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: 8,
                              padding: "9px",
                              color: "rgba(255,255,255,0.6)",
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: "#22c55e",
                                  lineHeight: 1.3,
                                }}
                              >
                                {rule.title}
                              </span>
                              {isMostPopular && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#000",
                                    background: "#fbbf24",
                                    borderRadius: 6,
                                    padding: "2px 7px",
                                    letterSpacing: "0.04em",
                                    flexShrink: 0,
                                  }}
                                >
                                  🔥 Most Popular
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                color: "rgba(255,255,255,0.3)",
                                display: "block",
                                marginTop: 2,
                              }}
                            >
                              {formatDate(rule.createdAt)}
                            </span>
                          </div>
                          {isAdmin && (
                            <div
                              style={{ display: "flex", gap: 6, flexShrink: 0 }}
                            >
                              <motion.button
                                type="button"
                                data-ocid={`rules.edit_button.${idx + 1}`}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => startEdit(rule)}
                                style={{
                                  background: "rgba(34,197,94,0.12)",
                                  border: "1px solid rgba(34,197,94,0.3)",
                                  borderRadius: 7,
                                  width: 30,
                                  height: 30,
                                  color: "#22c55e",
                                  fontSize: 14,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                ✏️
                              </motion.button>
                              <motion.button
                                type="button"
                                data-ocid={`rules.delete_button.${idx + 1}`}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(rule.id)}
                                style={{
                                  background: "rgba(239,68,68,0.12)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                  borderRadius: 7,
                                  width: 30,
                                  height: 30,
                                  color: "#f87171",
                                  fontSize: 14,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                🗑️
                              </motion.button>
                            </div>
                          )}
                        </div>

                        {rule.description && (
                          <p
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,0.72)",
                              margin: "0 0 12px",
                              lineHeight: 1.6,
                            }}
                          >
                            {rule.description}
                          </p>
                        )}

                        {/* Like button */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <motion.button
                            type="button"
                            data-ocid={`rules.like_button.${idx + 1}`}
                            whileTap={{ scale: 0.9 }}
                            animate={
                              likeAnim[rule.id]
                                ? { scale: [1, 1.35, 1] }
                                : { scale: 1 }
                            }
                            onClick={() => handleLike(rule.id)}
                            style={{
                              background: liked
                                ? "rgba(34,197,94,0.18)"
                                : "rgba(255,255,255,0.06)",
                              border: liked
                                ? "1px solid rgba(34,197,94,0.5)"
                                : "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 8,
                              padding: "5px 12px",
                              color: liked
                                ? "#22c55e"
                                : "rgba(255,255,255,0.45)",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: liked ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              fontFamily: "inherit",
                              transition: "all 0.2s",
                            }}
                          >
                            👍 {count > 0 && <span>{count}</span>}
                          </motion.button>
                          {liked && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "rgba(34,197,94,0.6)",
                              }}
                            >
                              You liked this
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
