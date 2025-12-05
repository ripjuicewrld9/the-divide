import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext.jsx";
import Divides from "./components/Divides.jsx";
import DivideDetailPage from "./pages/DivideDetailPage.jsx";
import AdminFinance from "./pages/AdminFinance.jsx";
import AdminLedger from "./pages/AdminLedger.jsx";
import AuthModal from "./components/AuthModal.jsx";
import Header from "./components/Header.jsx";
import ChatSidebar from "./components/ChatSidebar.jsx";
import ProfilePage from "./pages/ProfileNew.jsx";
import Support from "./pages/Support.jsx";
import SupportDashboard from "./pages/SupportDashboard.jsx";
import SupportTickets from "./pages/SupportTickets.jsx";
import SupportInbox from "./pages/SupportInbox.jsx";
import SupportTeams from "./pages/SupportTeams.jsx";
import SupportAnalytics from "./pages/SupportAnalytics.jsx";
import SupportSettings from "./pages/SupportSettings.jsx";
import ModeratorPanel from "./pages/ModeratorPanel.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import DiscordLinkHandler from "./components/DiscordLinkHandler.jsx";
import OAuthLoginHandler from "./components/OAuthLoginHandler.jsx";
import SocialFeed from "./components/SocialFeed.jsx";

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
      {/* OAuth handler - processes login tokens from URL params on ALL routes */}
      <OAuthLoginHandler />
      
      {/* Global header */}
      <Header
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Divides />} />
            <Route path="/divides" element={<Divides />} />
            <Route path="/divide/:id" element={<DivideDetailPage />} />
            <Route path="/feed" element={<SocialFeed />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Support Routes - Moderators get full dashboard, users get simple view */}
            <Route path="/support" element={<SupportDashboard />} />
            <Route path="/support/tickets" element={<SupportTickets />} />
            <Route path="/support/tickets/:id" element={<TicketDetail />} />
            <Route path="/support/inbox" element={<SupportInbox />} />
            <Route path="/support/moderation" element={<ModeratorPanel />} />
            <Route path="/support/teams" element={<SupportTeams />} />
            <Route path="/support/analytics" element={<SupportAnalytics />} />
            <Route path="/support/settings" element={<SupportSettings />} />
            
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/link-discord" element={<DiscordLinkHandler />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Navigate to="/admin/finance" replace />
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
          </Routes>
        </main>

        {/* Right chat sidebar */}
        <ChatSidebar isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isRegister={isRegister}
          onClose={() => setShowAuthModal(false)}
          onToggleMode={() => setIsRegister(!isRegister)}
        />
      )}
    </div>
  );
}
