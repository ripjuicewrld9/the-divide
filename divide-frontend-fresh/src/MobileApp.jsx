import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext.jsx";
import Divides from "./components/Divides.jsx";
import MobileChatOverlay from "./components/MobileChatOverlay.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import ProfilePage from "./pages/ProfileNew.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import DiscordLinkHandler from "./components/DiscordLinkHandler.jsx";
import OAuthLoginHandler from "./components/OAuthLoginHandler.jsx";
import SocialFeed from "./components/SocialFeed.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import WalletPage from "./pages/WalletPage.jsx";

function ProtectedRoute({ children, requiredRole = null }) {
    const { user } = React.useContext(AuthContext);
    if (!user) return <Navigate to="/" />;
    if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />;
    return children;
}

export default function MobileApp() {
    const [isChatOpen, setIsChatOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white">
            {/* OAuth handler - processes login tokens from URL params on ALL routes */}
            <OAuthLoginHandler />
            
            <Routes>
                {/* Divides - Default landing page */}
                <Route path="/" element={<Divides onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/divides" element={<Divides onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/feed" element={<SocialFeed />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/wallet" element={<WalletPage onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Profile */}
                <Route path="/profile" element={<ProfilePage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/link-discord" element={<DiscordLinkHandler />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                        <Navigate to="/admin/finance" replace />
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
