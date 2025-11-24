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

// ✅ Define ProtectedRoute inside this file (so no undefined errors)
function ProtectedRoute({ children, requiredRole = null }) {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/" />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [isRegister, setIsRegister] = React.useState(false);
  const { user } = React.useContext(AuthContext);
  const [showAdminModal, setShowAdminModal] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  return (
    <div className="h-screen bg-[#0b0b0b] text-white flex flex-col overflow-hidden">
      {/* Global header */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main 
          className="flex-1 overflow-y-auto p-4 relative no-scrollbar"
          style={{
            marginRight: isChatOpen ? '320px' : '0',
            transition: 'margin-right 0.3s ease'
          }}
        >
          <div className="mx-auto max-w-7xl h-full">
            <Routes>
              {/* 🏠 Home page */}
              <Route path="/" element={<Home />} />

              {/* Legacy route for Divides */}
              <Route path="/divides" element={<Divides />} />

              {/* 💼 Case Battles */}
              <Route path="/case-battles" element={<ActiveBattlesPage />} />
              <Route path="/case-battles/create" element={<CreateBattlePage />} />
              <Route path="/case-battles/:battleId" element={<CaseBattleDetail />} />

              {/* 🧠 Admin page — protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* 🧾 Admin finance summary */}
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

              {/* 🎯 Keno page */}
              <Route path="/keno" element={<KenoPage />} />

              {/* 🃏 Blackjack */}
              <Route path="/blackjack" element={<BlackjackPage />} />

              {/*  Plinko */}
              <Route path="/plinko" element={<PlinkoPage />} />

              {/* DuckOrBuck removed */}
              {/* 💎 Rugged (Divide Coin) */}
              <Route path="/rugged" element={<RuggedPage />} />

              {/* Redirect unknown paths back to home */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>

        {/* Right Chat Sidebar */}
        <ChatSidebar isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      </div>

      {/* 🪟 Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          isRegister={isRegister}
          setIsRegister={setIsRegister}
        />
      )}

      {/* 🛠️ Admin modal (admins only) */}
      {showAdminModal && user?.role === 'admin' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 'min(960px, 95%)', maxHeight: '90vh', overflowY: 'auto', background: '#0b0b0b', borderRadius: 8, padding: 20 }}>
            <Admin onClose={() => setShowAdminModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
