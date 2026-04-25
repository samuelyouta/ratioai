import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { clearProfile, getProfile } from "@/lib/profile";

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
  const profile = getProfile()!;

  const handleReset = () => {
    if (confirm("This will erase your profile and meal history. Continue?")) {
      clearProfile();
      navigate("/app/welcome", { replace: true });
    }
  };

  const handleRedo = () => {
    navigate("/app/onboarding/goal");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </div>

      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="font-semibold text-foreground">RatioAi Athlete</p>
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
        <button
          onClick={handleReset}
          className="w-full bg-card border border-destructive/30 rounded-xl py-3 text-sm font-medium text-destructive"
        >
          Reset everything
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
