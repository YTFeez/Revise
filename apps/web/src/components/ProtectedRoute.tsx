import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function ProtectedRoute({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, fetchMe, loaded } = useAuth();
  useEffect(() => {
    if (!loaded) fetchMe();
  }, [loaded, fetchMe]);

  if (!loaded) return <div className="text-zinc-400 p-6">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
