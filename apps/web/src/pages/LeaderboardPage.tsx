import { LeaderboardCard } from "../components/LeaderboardCard";

export default function LeaderboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Classement</h1>
      <p className="text-sm text-zinc-400 mb-5">Mis a jour en temps reel quand quelqu'un finit un quiz.</p>
      <LeaderboardCard />
    </div>
  );
}
