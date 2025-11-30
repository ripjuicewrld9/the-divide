// src/components/OAuthLoginHandler.jsx
import { useEffect, useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function OAuthLoginHandler() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useContext(AuthContext);
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        // Prevent processing multiple times
        if (processed) return;

        const discordToken = searchParams.get('discord_login');
        const googleToken = searchParams.get('google_login');
        const error = searchParams.get('error');

        console.log('🔵 OAuthLoginHandler - Query params:', {
            discordToken: !!discordToken,
            googleToken: !!googleToken,
            error: error
        });

        if (error) {
            console.error('❌ OAuth error:', error);
            alert(`Login failed: ${error}`);
            setProcessed(true);
            navigate('/', { replace: true });
            return;
        }

        const handleLogin = async (token, provider) => {
            console.log(`✅ ${provider} token received, logging in...`);
            // Store token
            localStorage.setItem('token', token);
            // Wait for user refresh to complete
            await refreshUser();
            console.log('✅ User refreshed, navigating to home');
            setProcessed(true);
            // Small delay to ensure state updates
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 100);
        };

        if (discordToken) {
            handleLogin(discordToken, 'Discord');
        } else if (googleToken) {
            handleLogin(googleToken, 'Google');
        }
    }, [searchParams, navigate, refreshUser, processed]);

    return null; // This component doesn't render anything
}
