import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CoursesPage from "./pages/CoursesPage";
import SubjectPage from "./pages/SubjectPage";
import CoursePage from "./pages/CoursePage";
import QuizListPage from "./pages/QuizListPage";
import QuizPlayPage from "./pages/QuizPlayPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ShopPage from "./pages/ShopPage";
import AvatarPage from "./pages/AvatarPage";
import AdminPage from "./pages/AdminPage";
import FriendsPage from "./pages/FriendsPage";
import InventoryPage from "./pages/InventoryPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="cours" element={<CoursesPage />} />
        <Route path="cours/:subjectSlug" element={<SubjectPage />} />
        <Route path="cours/:subjectSlug/:courseSlug" element={<CoursePage />} />
        <Route path="quiz" element={<QuizListPage type="QUIZ" />} />
        <Route path="eval" element={<QuizListPage type="EVAL" />} />
        <Route
          path="jouer/:quizId"
          element={
            <ProtectedRoute>
              <QuizPlayPage />
            </ProtectedRoute>
          }
        />
        <Route path="classement" element={<LeaderboardPage />} />
        <Route
          path="amis"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route path="boutique" element={<ShopPage />} />
        <Route
          path="inventaire"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="avatar"
          element={
            <ProtectedRoute>
              <AvatarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div className="card p-6">Page introuvable.</div>} />
      </Route>
    </Routes>
  );
}
