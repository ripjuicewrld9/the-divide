import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext.jsx";
import Divides from "./components/Divides.jsx";
import Home from "./pages/Home.jsx";
import AuthModal from "./components/AuthModal.jsx";
import KenoPage from "./pages/Keno.jsx";
import RuggedPage from "./pages/Rugged.jsx";
import BlackjackPage from "./games/blackjack/index.tsx";
import PlinkoPage from "./games/plinko/index.tsx";
import WheelPage from "./games/wheel/index.tsx";
import WheelLobby from "./games/wheel/WheelLobby.tsx";
import MobileMainLayout from "./components/MobileMainLayout.jsx";
import MobileChatOverlay from "./components/MobileChatOverlay.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import ProfilePage from "./pages/ProfileNew.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import DiscordLinkHandler from "./components/DiscordLinkHandler.jsx";
import OAuthLoginHandler from "./components/OAuthLoginHandler.jsx";
import ComingSoon from "./components/ComingSoon.jsx";

function ProtectedRoute({ children, requiredRole = null }) {
    const { user } = React.useContext(AuthContext);
    if (!user) return <Navigate to="/" />;
    if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />;
    return children;
}

// Mobile Rugged route - Coming Soon for non-admins, accessible for admins
function MobileRuggedRoute() {
    const { user } = React.useContext(AuthContext);
    if (user && user.role === 'admin') {
        return <RuggedPage />;
    }
    return <ComingSoon gameName="Rugged" />;
}

export default function MobileApp() {
    const [isChatOpen, setIsChatOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white">
            {/* OAuth handler - processes login tokens from URL params on ALL routes */}
            <OAuthLoginHandler />
            
            <Routes>
                {/* Home */}
                <Route path="/" element={<MobileMainLayout onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Games */}
                <Route path="/keno" element={<KenoPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/rugged" element={<MobileRuggedRoute />} />
                <Route path="/blackjack" element={<BlackjackPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/plinko" element={<PlinkoPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/wheel" element={<ComingSoon gameName="Wheel" />} />
                <Route path="/wheel/:gameId" element={<ComingSoon gameName="Wheel" />} />
                <Route path="/divides" element={<Divides onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Profile */}
                <Route path="/profile" element={<ProfilePage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/link-discord" element={<DiscordLinkHandler />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                        <React.Suspense fallback={<div>Loading...</div>}>
                            {React.createElement(React.lazy(() => import("./components/Admin")))}
                        </React.Suspense>
                    </ProtectedRoute>
                } />
                <Route path="/admin/finance" element={
                    <ProtectedRoute requiredRole="admin">
                        <React.Suspense fallback={<div>Loading...</div>}>
                            {React.createElement(React.lazy(() => import("./pages/AdminFinance")))}
                        </React.Suspense>
                    </ProtectedRoute>
                } />
                <Route path="/admin/ledger" element={
                    <ProtectedRoute requiredRole="admin">
                        <React.Suspense fallback={<div>Loading...</div>}>
                            {React.createElement(React.lazy(() => import("./pages/AdminLedger")))}
                        </React.Suspense>
                    </ProtectedRoute>
                } />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>

            {/* Chat Overlay */}
            <MobileChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            {/* Global Bottom Navigation */}
            <MobileBottomNav onOpenChat={() => setIsChatOpen(true)} />
        </div>
    );
}
