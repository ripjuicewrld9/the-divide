// src/components/OAuthLoginHandler.jsx
import { useEffect, useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function OAuthLoginHandler() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setToken } = useContext(AuthContext);
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
            // Update token state in AuthContext - this will trigger user load automatically
            setToken(token);
            setProcessed(true);
            console.log('✅ Token state updated, user will load automatically');
            // Small delay to ensure state updates, then navigate
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 100);
        };

        if (discordToken) {
            handleLogin(discordToken, 'Discord');
        } else if (googleToken) {
            handleLogin(googleToken, 'Google');
        }
    }, [searchParams, navigate, setToken, processed]);

    return null; // This component doesn't render anything
}
