import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";

interface Comment {
  id: string;
  authorName: string;
  text: string;
  timestamp: number;
}

const ADMIN_PASSWORD = "Shahzad@99";
const LIKE_KEY = "ccb_ann_liked";
const IMAGE_KEY = "ccb_ann_image_v2";
const CAPTION_KEY = "ccb_ann_caption";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnouncementSection() {
  const { actor } = useActor();

  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(IMAGE_KEY);
    } catch {
      return null;
    }
  });
  const [caption, setCaption] = useState<string>(() => {
    try {
      return localStorage.getItem(CAPTION_KEY) || "";
    } catch {
      return "";
    }
  });
  const [captionInput, setCaptionInput] = useState("");
  const [seenCount, setSeenCount] = useState<number>(0);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [liked, setLiked] = useState(
    () => localStorage.getItem(LIKE_KEY) === "1",
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [backendReady, setBackendReady] = useState(false);
  const seenTracked = useRef(false);

  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminPwdError, setAdminPwdError] = useState(false);
  const [adminAction, setAdminAction] = useState<
    "upload" | "delete" | "delComment" | null
  >(null);
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<
    string | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!actor) return;
    try {
      const [ann, seen, likes] = await Promise.all([
        actor.getAnnouncement(0n),
        actor.getSeenCount(),
        actor.getLikeCount(),
      ]);

      setSeenCount(Number(seen));
      setLikeCount(Number(likes));

      if (ann) {
        let parsedComments: Comment[] = [];
        try {
          const parsed = JSON.parse(ann.text);
          if (Array.isArray(parsed)) parsedComments = parsed;
        } catch {
          /* plain text */
        }
        setComments(parsedComments);
      }
    } catch (e) {
      console.error("Failed to load announcement:", e);
    } finally {
      setBackendReady(true);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor || seenTracked.current) return;
    seenTracked.current = true;
    actor
      .saveSeenCount(0n)
      .then((count) => setSeenCount(Number(count)))
      .catch(() => {});
    loadData();
  }, [actor, loadData]);

  // If actor never loads, mark backend ready after timeout so UI is not stuck
  useEffect(() => {
    const t = setTimeout(() => setBackendReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  async function handleLike() {
    if (liked || !actor) return;
    try {
      const newCount = await actor.addLike(0n);
      setLikeCount(Number(newCount));
      setLiked(true);
      localStorage.setItem(LIKE_KEY, "1");
    } catch (e) {
      console.error("Like failed:", e);
    }
  }

  async function saveCommentsToBackend(updated: Comment[]) {
    if (!actor) throw new Error("Backend not available");
    await actor.createOrUpdateAnnouncement(
      ADMIN_PASSWORD,
      0n,
      JSON.stringify(updated),
    );
  }

  async function handleCommentSubmit() {
    if (!commentName.trim() || !commentText.trim()) return;
    if (!actor) {
      setCommentError("Connection unavailable. Please refresh and try again.");
      return;
    }
    setCommentError("");
    setSubmitting(true);
    try {
      const newComment: Comment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        authorName: commentName.trim(),
        text: commentText.trim(),
        timestamp: Date.now(),
      };
      const updated = [...comments, newComment];
      await saveCommentsToBackend(updated);
      setComments(updated);
      setCommentName("");
      setCommentText("");
    } catch (e) {
      console.error("Comment submit failed:", e);
      setCommentError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function requestAdmin(
    action: "upload" | "delete" | "delComment",
    commentId?: string,
  ) {
    setAdminPwd("");
    setAdminPwdError(false);
    setAdminAction(action);
    if (commentId) setPendingDeleteCommentId(commentId);
    setShowAdminDialog(true);
  }

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function verifyAdmin() {
    if (adminPwd !== ADMIN_PASSWORD) {
      setAdminPwdError(true);
      return;
    }
    setShowAdminDialog(false);
    setCaptionInput("");
    if (adminAction === "upload") setShowUploadModal(true);
    if (adminAction === "delete") handleDeleteImage();
    if (adminAction === "delComment" && pendingDeleteCommentId)
      handleDeleteComment(pendingDeleteCommentId);
  }

  function publishPost() {
    if (!captionInput.trim() && !imageUrl) {
      setShowUploadModal(false);
      return;
    }
    localStorage.setItem(CAPTION_KEY, captionInput);
    setCaption(captionInput);
    setShowUploadModal(false);
    setCaptionInput("");
  }

  function handleDeleteImage() {
    localStorage.removeItem(IMAGE_KEY);
    localStorage.removeItem(CAPTION_KEY);
    setImageUrl(null);
    setCaption("");
  }

  async function handleDeleteComment(id: string) {
    const updated = comments.filter((c) => c.id !== id);
    try {
      await saveCommentsToBackend(updated);
      setComments(updated);
    } catch (e) {
      console.error("Delete comment failed:", e);
    } finally {
      setPendingDeleteCommentId(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          localStorage.setItem(IMAGE_KEY, dataUrl);
          setImageUrl(dataUrl);
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-sm mx-auto px-4 mb-0 mt-4">
        <div className="rounded-2xl border-2 border-orange-500 bg-gradient-to-b from-black/90 to-green-950/70 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-orange-500/30 bg-orange-950/20">
            <span className="text-orange-400 font-bold text-xs tracking-widest uppercase">
              📢 ANNOUNCEMENTS
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-ocid="announcement.upload_button"
                onClick={() => requestAdmin("upload")}
                className="text-orange-400 hover:text-orange-300 text-xs border border-orange-500/50 rounded-md px-2 py-0.5 bg-transparent cursor-pointer transition-colors hover:bg-orange-500/10"
              >
                ✏️ Post
              </button>
              {(imageUrl || caption) && (
                <button
                  type="button"
                  data-ocid="announcement.delete_button"
                  onClick={() => requestAdmin("delete")}
                  className="text-red-400 hover:text-red-300 text-xs border border-red-500/50 rounded-md px-2 py-0.5 bg-transparent cursor-pointer transition-colors hover:bg-red-500/10"
                >
                  🗑️ Del
                </button>
              )}
            </div>
          </div>

          {uploading && (
            <div className="px-4 py-2 bg-orange-950/30">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full animate-pulse w-3/4" />
                </div>
                <span className="text-orange-300 text-xs">Processing...</span>
              </div>
            </div>
          )}

          {imageUrl ? (
            <div className="w-full bg-black" data-ocid="announcement.card">
              <img
                src={imageUrl}
                alt="Tournament Announcement"
                className="w-full object-contain"
                style={{ maxHeight: 300, display: "block" }}
              />
            </div>
          ) : !caption ? (
            <div className="px-4 py-6 text-center bg-black/20">
              <button
                type="button"
                data-ocid="announcement.upload_big.button"
                onClick={() => requestAdmin("upload")}
                className="w-full py-6 rounded-2xl border-2 border-dashed border-orange-500/40 bg-transparent cursor-pointer hover:bg-orange-500/10 hover:border-orange-500/70 transition-all flex flex-col items-center gap-3 group"
              >
                <span className="text-5xl group-hover:scale-110 transition-transform">
                  📷
                </span>
                <div>
                  <p className="text-orange-300 font-bold text-base">
                    Upload Photo / Post
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    Tap to add announcement text or photo
                  </p>
                </div>
              </button>
            </div>
          ) : null}

          {caption && (
            <div className="px-4 py-3 bg-orange-950/30 border-t border-orange-500/20">
              <p className="text-orange-200 text-sm leading-relaxed whitespace-pre-wrap">
                {caption}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center px-4 py-2.5 border-t border-white/10 bg-black/50 gap-3 flex-wrap">
            <div
              className="flex items-center gap-1.5"
              data-ocid="announcement.panel"
              title="Views"
            >
              <span className="text-white/50 text-sm">👁️</span>
              <span className="text-white/60 text-xs font-mono tabular-nums">
                {seenCount.toLocaleString()}
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <button
              type="button"
              data-ocid="announcement.toggle"
              onClick={handleLike}
              disabled={liked || !actor}
              className={`flex items-center gap-1.5 transition-all select-none ${
                liked || !actor
                  ? "cursor-default opacity-60"
                  : "cursor-pointer hover:scale-110 active:scale-95"
              }`}
              title={liked ? "You liked this" : "Like"}
            >
              <span
                className={`text-base transition-all duration-300 ${
                  liked ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : ""
                }`}
              >
                {liked ? "❤️" : "🤍"}
              </span>
              <span
                className={`text-xs font-mono tabular-nums transition-colors ${
                  liked ? "text-red-400" : "text-white/60"
                }`}
              >
                {likeCount.toLocaleString()}
              </span>
            </button>

            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center gap-1.5" title="Comments">
              <span className="text-white/50 text-sm">💬</span>
              <span className="text-white/60 text-xs font-mono tabular-nums">
                {comments.length}
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <button
              type="button"
              data-ocid="announcement.copy_link.button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 1500);
                } catch {
                  /* ignore */
                }
              }}
              className="flex items-center gap-1 cursor-pointer hover:scale-110 active:scale-95 transition-all select-none"
              title="Copy link"
            >
              <span className="text-white/50 text-sm">
                {copiedLink ? "✅" : "🔗"}
              </span>
              <span
                className={`text-xs transition-colors ${
                  copiedLink ? "text-green-400" : "text-white/60"
                }`}
              >
                {copiedLink ? "COPIED!" : "Copy"}
              </span>
            </button>

            <div className="w-px h-4 bg-white/10" />

            <button
              type="button"
              data-ocid="announcement.share.button"
              onClick={async () => {
                const text = caption
                  ? `📢 CCB Announcement\n${caption}\n${window.location.href}`
                  : `📢 CCB SCORING PRO\n${window.location.href}`;
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: "CCB Announcement",
                      text,
                      url: window.location.href,
                    });
                  } else {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(text)}`,
                      "_blank",
                    );
                  }
                } catch {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(text)}`,
                    "_blank",
                  );
                }
              }}
              className="flex items-center gap-1.5 cursor-pointer hover:scale-110 active:scale-95 transition-all select-none ml-auto"
              title="Share this announcement"
            >
              <span className="text-white/50 text-sm">📤</span>
              <span className="text-white/60 text-xs">Share</span>
            </button>
          </div>

          {/* Comment Form */}
          <div className="px-4 py-3 border-t border-white/10 bg-black/30">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2 font-semibold">
              Leave a Comment
            </p>
            {!backendReady && (
              <p className="text-white/30 text-xs text-center py-2">
                Connecting to server...
              </p>
            )}
            {backendReady && !actor && (
              <p className="text-yellow-400/60 text-xs text-center py-1 mb-2 border border-yellow-400/20 rounded-lg">
                ⚠ Comments require a connection. Please refresh if this
                persists.
              </p>
            )}
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="Your Name"
              data-ocid="announcement.input"
              maxLength={40}
              disabled={!actor}
              className="w-full bg-black/50 text-white border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400/70 mb-2 placeholder-white/20 transition-colors disabled:opacity-40"
            />
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              data-ocid="announcement.textarea"
              rows={2}
              maxLength={300}
              disabled={!actor}
              className="w-full bg-black/50 text-white border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400/70 resize-none placeholder-white/20 mb-2 transition-colors disabled:opacity-40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCommentSubmit();
                }
              }}
            />
            {commentError && (
              <p className="text-red-400 text-xs mb-2">⚠ {commentError}</p>
            )}
            <button
              type="button"
              data-ocid="announcement.submit_button"
              onClick={handleCommentSubmit}
              disabled={
                submitting ||
                !commentName.trim() ||
                !commentText.trim() ||
                !actor
              }
              className="w-full py-2 rounded-lg bg-orange-500 text-black font-bold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:bg-orange-400 active:bg-orange-600"
            >
              {submitting ? "Posting..." : "Post Comment 💬"}
            </button>
          </div>

          {/* Comments List */}
          {comments.length > 0 ? (
            <div
              className="border-t border-white/10 max-h-64 overflow-y-auto"
              data-ocid="announcement.list"
            >
              {comments.map((c, i) => (
                <div
                  key={c.id}
                  data-ocid={`announcement.item.${i + 1}`}
                  className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 bg-black/10 hover:bg-black/25 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-orange-400 uppercase">
                    {c.authorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className="text-orange-300 text-xs font-semibold truncate">
                        {c.authorName}
                      </span>
                      <span className="text-white/25 text-xs flex-shrink-0">
                        {formatTime(c.timestamp)}
                      </span>
                    </div>
                    <p className="text-white/75 text-sm leading-relaxed break-words">
                      {c.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid={`announcement.delete_button.${i + 1}`}
                    onClick={() => requestAdmin("delComment", c.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 text-xs cursor-pointer flex-shrink-0 mt-1 transition-all px-1"
                    title="Admin: Delete comment"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="px-4 py-5 text-center border-t border-white/5"
              data-ocid="announcement.empty_state"
            >
              <p className="text-white/25 text-xs">
                No comments yet. Be the first to comment!
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload / Post Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4"
          data-ocid="announcement.upload_modal.dialog"
        >
          <div className="bg-zinc-950 border-2 border-orange-500 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-orange-400 font-bold text-lg mb-1 text-center">
              ✏️ New Announcement
            </h3>
            <p className="text-white/40 text-xs text-center mb-4">
              Add text, upload a photo, or both
            </p>

            <label
              htmlFor="ann-caption"
              className="block text-orange-300 text-xs font-semibold mb-1.5"
            >
              📝 Announcement Text
            </label>
            <textarea
              id="ann-caption"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Write your announcement text here..."
              data-ocid="announcement.textarea"
              rows={5}
              className="w-full bg-black text-white border border-orange-500/50 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-orange-400 resize-none placeholder-white/30"
            />

            <p className="block text-orange-300 text-xs font-semibold mb-1">
              📷 Photo (Optional)
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 mb-3 rounded-xl border border-dashed border-orange-500/50 text-orange-300 text-sm bg-transparent cursor-pointer hover:bg-orange-500/10 transition-colors"
              data-ocid="announcement.upload_button"
            >
              {uploading
                ? "Processing..."
                : imageUrl
                  ? "📷 Change Photo"
                  : "📷 Upload Photo from Gallery"}
            </button>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                data-ocid="announcement.cancel_button"
                onClick={() => {
                  setShowUploadModal(false);
                  setCaptionInput("");
                }}
                className="flex-1 py-2 rounded-xl border border-white/20 text-white/60 text-sm bg-transparent cursor-pointer hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="announcement.publish.primary_button"
                onClick={publishPost}
                disabled={!captionInput.trim() && !imageUrl}
                className="flex-1 py-2 rounded-xl bg-orange-500 text-black font-bold text-sm cursor-pointer hover:bg-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Publish Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Dialog */}
      {showAdminDialog && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4"
          data-ocid="announcement.modal"
        >
          <div className="bg-zinc-950 border-2 border-orange-500 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-orange-400 font-bold text-lg mb-1 text-center">
              🔒 Admin Verification
            </h3>
            <p className="text-white/40 text-xs text-center mb-4">
              {adminAction === "upload" && "Enter password to create a post"}
              {adminAction === "delete" && "Enter password to delete post"}
              {adminAction === "delComment" &&
                "Enter password to delete comment"}
            </p>

            <input
              type="password"
              value={adminPwd}
              onChange={(e) => {
                setAdminPwd(e.target.value);
                setAdminPwdError(false);
              }}
              placeholder="Password"
              data-ocid="announcement.input"
              className="w-full bg-black text-white border border-orange-500/50 rounded-lg px-3 py-2.5 text-base mb-2 outline-none focus:border-orange-400 text-center tracking-widest"
              onKeyDown={(e) => e.key === "Enter" && verifyAdmin()}
            />
            {adminPwdError && (
              <p
                className="text-red-400 text-xs text-center mb-2"
                data-ocid="announcement.error_state"
              >
                ❌ Wrong Password
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                data-ocid="announcement.cancel_button"
                onClick={() => setShowAdminDialog(false)}
                className="flex-1 py-2 rounded-xl border border-white/20 text-white/60 text-sm bg-transparent cursor-pointer hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="announcement.confirm_button"
                onClick={verifyAdmin}
                className="flex-1 py-2 rounded-xl bg-orange-500 text-black font-bold text-sm cursor-pointer hover:bg-orange-400 transition-colors"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
