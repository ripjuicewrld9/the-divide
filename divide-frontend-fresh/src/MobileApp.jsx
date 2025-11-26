import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext.jsx";
import Divides from "./components/Divides.jsx";
import Home from "./pages/Home.jsx";
import AuthModal from "./components/AuthModal.jsx";
import KenoPage from "./pages/Keno.jsx";
import RuggedPage from "./pages/Rugged.jsx";
import ActiveBattlesPage from "./components/ActiveBattlesPage.jsx";
import CreateBattlePage from "./components/CreateBattlePage.jsx";
import CaseBattleDetail from "./components/CaseBattleDetail.jsx";
import BlackjackPage from "./games/blackjack/index.tsx";
import PlinkoPage from "./games/plinko/index.tsx";
import MobileMainLayout from "./components/MobileMainLayout.jsx";
import MobileChatOverlay from "./components/MobileChatOverlay.jsx";
import ProfilePage from "./pages/Profile.jsx";

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
            <Routes>
                {/* Home */}
                <Route path="/" element={<MobileMainLayout onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Games */}
                <Route path="/keno" element={<KenoPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/rugged" element={<RuggedPage />} />
                <Route path="/blackjack" element={<BlackjackPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/plinko" element={<PlinkoPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/divides" element={<Divides onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Case Battles */}
                <Route path="/case-battles" element={<ActiveBattlesPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/battles" element={<ActiveBattlesPage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/battles/create" element={<CreateBattlePage onOpenChat={() => setIsChatOpen(true)} />} />
                <Route path="/battles/:id" element={<CaseBattleDetail onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Profile */}
                <Route path="/profile" element={<ProfilePage onOpenChat={() => setIsChatOpen(true)} />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>

            {/* Chat Overlay */}
            <MobileChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    );
}
