import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getProfile } from "@/lib/profile";
import { deleteAccount } from "@/lib/account";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const goalLabels: Record<string, string> = {
  lose: "Lose Fat",
  muscle: "Build Muscle",
  maintain: "Recomp",
  endurance: "Endurance",
};
const activityLabels: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  very: "Very Active",
};

const Profile = () => {
  const navigate = useNavigate();
  const { restore } = useSubscription();
  const profile = getProfile()!;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleRedo = () => navigate("/app/onboarding/goal");

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      toast.success("Account deleted", {
        description: "Your account and cloud data have been permanently removed.",
      });
      navigate("/app/welcome", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not delete account", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    const ok = await restore();
    if (ok) {
      toast.success("Subscription restored", {
        description: "Your RatioAi Pro access is active.",
      });
    } else {
      toast.message("Restore Purchases", {
        description: "No active purchases were found on this account.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </div>

      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="font-semibold text-foreground">
            {profile.name?.trim() || "RatioAi Athlete"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {profile.gender} · {profile.age} yrs · {profile.heightCm}cm · {profile.weightKg}kg
          </p>
        </div>
      </div>

      <div className="px-6 mb-5 grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Daily target</p>
          <p className="text-lg font-bold text-foreground">{profile.calorieTarget}</p>
          <p className="text-xs text-muted-foreground">cal / day</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Goal</p>
          <p className="text-lg font-bold text-foreground">{goalLabels[profile.goal]}</p>
          <p className="text-xs text-muted-foreground">current goal</p>
        </div>
      </div>

      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">Activity</span>
            <span className="text-sm text-muted-foreground">{activityLabels[profile.activity]}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">Protein target</span>
            <span className="text-sm text-muted-foreground">{profile.proteinTarget}g</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">Carbs target</span>
            <span className="text-sm text-muted-foreground">{profile.carbsTarget}g</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">Fat target</span>
            <span className="text-sm text-muted-foreground">{profile.fatTarget}g</span>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-2">
        <button
          onClick={handleRedo}
          className="w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground"
        >
          Recalculate targets
        </button>

        <a
          href="/privacy"
          className="block w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground text-center"
        >
          Privacy policy
        </a>
        <a
          href="/terms"
          className="block w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground text-center"
        >
          Terms & conditions
        </a>

        <button
          onClick={() => setDeleteOpen(true)}
          className="w-full bg-card border border-destructive/40 rounded-xl py-3 text-sm font-semibold text-destructive flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Delete Account
        </button>

        {/* App Store compliance: restore purchases footer link */}
        <div className="pt-3 text-center">
          <button
            onClick={handleRestore}
            className="text-[11px] text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
          >
            Restore Purchases
          </button>
        </div>
      </div>

      <BottomNav />

      {/* Delete account verification modal */}
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteOpen(false)}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 relative"
            >
              <button
                onClick={() => setDeleteOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete account?</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                This action will permanently delete your account and wipe all biological, macro
                tracking, and weight history from the database.
              </p>

              <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
                Type <span className="text-destructive font-semibold">DELETE</span> to confirm
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full mt-2 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-destructive transition-colors"
              />

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 bg-secondary text-foreground font-semibold text-sm py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-destructive text-destructive-foreground font-semibold text-sm py-3 rounded-xl disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
