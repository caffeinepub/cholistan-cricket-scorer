import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (password: string) => boolean;
}

export function AdminLoginModal({
  open,
  onClose,
  onLogin,
}: AdminLoginModalProps) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    const ok = onLogin(pwd);
    if (ok) {
      setSuccess(true);
      setError(false);
      setPwd("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } else {
      setError(true);
    }
  }

  function handleClose() {
    setPwd("");
    setError(false);
    setSuccess(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="border-primary/30 mx-4 max-w-xs"
        style={{
          background: "linear-gradient(160deg,#0a0a0a,#001a0a)",
          border: "1px solid rgba(0,255,136,0.3)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-center font-bold tracking-widest text-lg"
            style={{ color: "#00ff88" }}
          >
            🔐 ADMIN LOGIN
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {success ? (
            <div
              className="text-center py-4 text-lg font-bold"
              style={{ color: "#00ff88" }}
              data-ocid="admin_login.success_state"
            >
              ✅ Admin Mode Active!
            </div>
          ) : (
            <>
              <p
                className="text-xs text-center"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Enter admin password to enable editing
              </p>
              <input
                data-ocid="admin_login.input"
                type="password"
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter password"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: error
                    ? "1px solid rgba(255,80,80,0.8)"
                    : "1px solid rgba(0,255,136,0.3)",
                  color: "#fff",
                }}
              />
              {error && (
                <p
                  className="text-xs text-center font-semibold"
                  style={{ color: "#ff5050" }}
                  data-ocid="admin_login.error_state"
                >
                  Incorrect Password
                </p>
              )}
            </>
          )}
        </div>
        {!success && (
          <DialogFooter className="flex gap-2">
            <button
              type="button"
              data-ocid="admin_login.cancel_button"
              onClick={handleClose}
              className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="admin_login.confirm_button"
              onClick={handleSubmit}
              className="flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer"
              style={{
                background: "rgba(0,255,136,0.2)",
                border: "1px solid rgba(0,255,136,0.5)",
                color: "#00ff88",
              }}
            >
              UNLOCK
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
