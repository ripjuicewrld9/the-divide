import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DiscordLinkHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser, refreshUser } = useAuth();
  const [status, setStatus] = useState('idle');
  const [hasLinked, setHasLinked] = useState(false);

  useEffect(() => {
    const linkToken = searchParams.get('discord_link');
    
    if (!linkToken || hasLinked) {
      setStatus('idle');
      return;
    }

    setStatus('linking');
    setHasLinked(true);

    const linkDiscordAccount = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Add timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const fetchPromise = fetch(`${import.meta.env.VITE_API_URL || ''}/api/link-discord`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ linkToken })
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (response.ok) {
          const data = await response.json();
          
          // Refresh user data from server to get Discord info
          await refreshUser();
          
          setStatus('success');
          
          // Clear the URL parameter and navigate back to profile
          setTimeout(() => {
            navigate('/profile', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        setStatus('error');
      }
    };

    linkDiscordAccount();
  }, [searchParams, navigate, updateUser, hasLinked, refreshUser]);

  // Show loading state while checking for token
  if (status === 'idle') {
    const linkToken = searchParams.get('discord_link');
    // If we're on /link-discord route but no token, show error
    if (window.location.pathname === '/link-discord' && !linkToken) {
      return (
        <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
          <div className="bg-[#1a1d29] rounded-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Link Token Found</h3>
            <p className="text-gray-400 mb-4">Please start the Discord linking process from your profile page.</p>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Profile
            </button>
          </div>
        </div>
      );
    }
    // Otherwise, render nothing (embedded in profile page)
    return null;
  }

  if (status === 'linking') {
    const isStandalonePage = window.location.pathname === '/link-discord';
    return (
      <div className={isStandalonePage ? "min-h-screen bg-[#0b0b0b] flex items-center justify-center" : "fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"}>
        <div className="bg-[#1a1d29] rounded-lg p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-white mb-2">Linking Discord Account...</h3>
          <p className="text-gray-400 mb-4">Please wait while we connect your Discord account.</p>
          <button
            onClick={() => {
              window.location.href = '/profile';
            }}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    const isStandalonePage = window.location.pathname === '/link-discord';
    return (
      <div className={isStandalonePage ? "min-h-screen bg-[#0b0b0b] flex items-center justify-center" : "fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"}>
        <div className="bg-[#1a1d29] rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Discord Linked Successfully!</h3>
          <p className="text-gray-400">You'll now be mentioned in support ticket threads.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    const isStandalonePage = window.location.pathname === '/link-discord';
    return (
      <div className={isStandalonePage ? "min-h-screen bg-[#0b0b0b] flex items-center justify-center" : "fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"}>
        <div className="bg-[#1a1d29] rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Failed to Link Discord</h3>
          <p className="text-gray-400 mb-4">Please try again later.</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return null;
}
