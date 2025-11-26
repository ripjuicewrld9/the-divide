import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext.jsx";
import Divides from "./components/Divides.jsx";
import Home from "./pages/Home.jsx";
import Admin from "./components/Admin.jsx";
import AdminFinance from "./pages/AdminFinance.jsx";
import AdminLedger from "./pages/AdminLedger.jsx";
import AdminItems from "./components/AdminItems.jsx";
import AdminCases from "./components/AdminCases.jsx";
import AuthModal from "./components/AuthModal.jsx";
import KenoPage from "./pages/Keno.jsx";
import RuggedPage from "./pages/Rugged.jsx";
import ActiveBattlesPage from "./components/ActiveBattlesPage.jsx";
import CreateBattlePage from "./components/CreateBattlePage.jsx";
import CaseBattleDetail from "./components/CaseBattleDetail.jsx";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ChatSidebar from "./components/ChatSidebar.jsx";
import BlackjackPage from "./games/blackjack/index.tsx";
import PlinkoPage from "./games/plinko/index.tsx";

function ProtectedRoute({ children, requiredRole = null }) {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/" />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />;
  return children;
}

export default function DesktopApp() {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [isRegister, setIsRegister] = React.useState(false);
  const { user } = React.useContext(AuthContext);
  const [showAdminModal, setShowAdminModal] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  return (
    <div className="h-screen bg-[#0b0b0b] text-white flex flex-col overflow-hidden">
      {/* Global header */}
      <Header
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/divides" element={<Divides />} />
            <Route path="/keno" element={<KenoPage />} />
            <Route path="/rugged" element={<RuggedPage />} />
            <Route path="/blackjack" element={<BlackjackPage />} />
            <Route path="/plinko" element={<PlinkoPage />} />
            <Route path="/battles" element={<ActiveBattlesPage />} />
            <Route path="/battles/create" element={<CreateBattlePage />} />
            <Route path="/battles/:id" element={<CaseBattleDetail />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminFinance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ledger"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLedger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/items"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminItems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cases"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminCases />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        {/* Right chat sidebar */}
        {isChatOpen && (
          <ChatSidebar onClose={() => setIsChatOpen(false)} />
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isRegister={isRegister}
          onClose={() => setShowAuthModal(false)}
          onToggleMode={() => setIsRegister(!isRegister)}
        />
      )}

      {/* Admin Modal */}
      {showAdminModal && user?.role === 'admin' && (
        <Admin onClose={() => setShowAdminModal(false)} />
      )}

      {/* Chat toggle button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-4 right-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-lg z-50"
        aria-label="Toggle chat"
      >
        💬
      </button>
    </div>
  );
}
