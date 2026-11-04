import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TimeZonePicker from "@/components/app/TimeZonePicker";
import { confirmTimeZone, formatDayLong, todayKey } from "@/lib/dayKey";
import { getProfile, saveProfile, type Profile as ProfileData } from "@/lib/profile";
import ProfileEditSheet from "@/components/app/ProfileEditSheet";
import { deleteAccount } from "@/lib/account";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import LanguagePicker from "@/components/LanguagePicker";
import { useT } from "@/i18n";

const Profile = () => {
  const navigate = useNavigate();
  const { t, rich } = useT();
  const { restore } = useSubscription();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(() => getProfile()!);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [today, setToday] = useState(() => todayKey());

  const handleSaveProfile = (next: ProfileData) => {
    saveProfile(next);
    setProfile(next);
    setEditOpen(false);
    toast.success(t("profile.updated"), { description: t("profile.updatedDesc") });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      toast.success(t("profile.deleted"), {
        description: t("profile.deletedDesc"),
      });
      navigate("/app/welcome", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(t("profile.deleteFail"), {
        description: e instanceof Error ? e.message : t("profile.tryAgain"),
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    const ok = await restore();
    if (ok) {
      toast.success(t("profile.restored"), {
        description: t("profile.restoredDesc"),
      });
    } else {
      toast.message(t("profile.restore"), {
        description: t("profile.noPurchases"),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 safe-top pb-4">
        <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>
      </div>

      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl p-5 relative">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="absolute top-4 right-4 text-xs font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full px-3 py-1"
          >
            {t("profile.edit")}
          </button>
          <p className="font-semibold text-foreground pr-14">
            {profile.name?.trim() || t("profile.athlete")}
          </p>
          {user?.email ? (
            <p className="text-xs text-primary mt-1">{user.email}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{t("profile.signedIn")}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t("profile.summary", { gender: t(`gender.${profile.gender}`), age: profile.age, height: profile.heightCm, weight: profile.weightKg })}
          </p>
        </div>
      </div>

      <div className="px-6 mb-5 grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t("profile.dailyTarget")}</p>
          <p className="text-lg font-bold text-foreground">{profile.calorieTarget}</p>
          <p className="text-xs text-muted-foreground">{t("profile.calPerDay")}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t("profile.goal")}</p>
          <p className="text-lg font-bold text-foreground">{t(`goal.${profile.goal}`)}</p>
          <p className="text-xs text-muted-foreground">{t("profile.currentGoal")}</p>
        </div>
      </div>

      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">{t("profile.activity")}</span>
            <span className="text-sm text-muted-foreground">{t(`activity.${profile.activity}`)}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">{t("profile.proteinTarget")}</span>
            <span className="text-sm text-muted-foreground">{profile.proteinTarget}g</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">{t("profile.carbsTarget")}</span>
            <span className="text-sm text-muted-foreground">{profile.carbsTarget}g</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-foreground">{t("profile.fatTarget")}</span>
            <span className="text-sm text-muted-foreground">{profile.fatTarget}g</span>
          </div>
        </div>
      </div>

      <div className="px-6 mb-5">
        <LanguagePicker variant="row" />
      </div>

      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground">{t("profile.dayZone")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            {rich("profile.zoneExplain", { today: <span className="text-foreground">{formatDayLong(today)}</span> })}
          </p>
          <TimeZonePicker
            onChange={() => {
              confirmTimeZone();
              setToday(todayKey());
              toast.success(t("profile.zoneUpdated"), {
                description: t("profile.zoneUpdatedDesc"),
              });
            }}
          />
        </div>
      </div>

      <div className="px-6 space-y-2">
        <button
          onClick={() => setEditOpen(true)}
          className="w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground"
        >
          {t("profile.editTargets")}
        </button>

        <MedicalDisclaimer className="mb-3" />

        <a
          href="/support"
          className="block w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground text-center"
        >
          {t("profile.support")}
        </a>
        <a
          href="/privacy"
          className="block w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground text-center"
        >
          {t("profile.privacy")}
        </a>
        <a
          href="/terms"
          className="block w-full bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground text-center"
        >
          {t("profile.terms")}
        </a>

        <button
          onClick={() => setDeleteOpen(true)}
          className="w-full bg-card border border-destructive/40 rounded-xl py-3 text-sm font-semibold text-destructive flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {t("profile.delete")}
        </button>

        {/* App Store compliance: restore purchases footer link */}
        <div className="pt-3 text-center">
          <button
            onClick={handleRestore}
            className="text-[11px] text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
          >
            {t("profile.restore")}
          </button>
        </div>
      </div>

      <BottomNav />

      <ProfileEditSheet
        open={editOpen}
        profile={profile}
        onSave={handleSaveProfile}
        onClose={() => setEditOpen(false)}
      />

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
                aria-label={t("common.close")}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{t("profile.deleteTitle")}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t("profile.deleteBody")}
              </p>

              <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
                {rich("profile.typeDelete", { word: <span className="text-destructive font-semibold">DELETE</span> })}
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
                  {t("common.cancel")}
                </button>
                <button
                  disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-destructive text-destructive-foreground font-semibold text-sm py-3 rounded-xl disabled:opacity-40"
                >
                  {deleting ? t("profile.deleting") : t("profile.permDelete")}
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
