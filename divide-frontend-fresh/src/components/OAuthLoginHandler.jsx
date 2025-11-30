// src/components/OAuthLoginHandler.jsx
import { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function OAuthLoginHandler() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useContext(AuthContext);

    useEffect(() => {
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
            navigate('/', { replace: true });
            return;
        }

        if (discordToken) {
            console.log('✅ Discord token received, logging in...');
            // Store token and refresh user
            localStorage.setItem('token', discordToken);
            refreshUser();
            navigate('/', { replace: true });
        } else if (googleToken) {
            console.log('✅ Google token received, logging in...');
            // Store token and refresh user
            localStorage.setItem('token', googleToken);
            refreshUser();
            navigate('/', { replace: true });
        }
    }, [searchParams, navigate, refreshUser]);

    return null; // This component doesn't render anything
}
