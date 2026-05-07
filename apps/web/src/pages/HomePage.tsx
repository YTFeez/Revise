import { useEffect, useState } from "react";
import { ProfileCard } from "../components/ProfileCard";
import { ProgressionGenerale } from "../components/ProgressionGenerale";
import { SubjectsGrid, type SubjectProgressItem } from "../components/SubjectsGrid";
import { LeaderboardCard } from "../components/LeaderboardCard";
import { useAuth } from "../store/auth";
import { api } from "../lib/api";
import { Link } from "react-router-dom";

export default function HomePage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectProgressItem[]>([]);

  useEffect(() => {
    if (!user) return;
    api<SubjectProgressItem[]>("/subjects/progress").then(setSubjects).catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Revise<span className="text-brand-400">+</span></h1>
        <p className="text-zinc-400 mb-6">
          Reviser tes cours, fais des quiz, gagne de l'XP, monte de niveau et debloque des cosmetiques pour ton avatar.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/login" className="btn-ghost">Connexion</Link>
          <Link to="/register" className="btn-primary">Creer un compte</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileCard user={user} />
      <ProgressionGenerale level={user.level} />
      <SubjectsGrid subjects={subjects} />
      <LeaderboardCard compact />
    </div>
  );
}
