import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DiscordLinkHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser, refreshUser } = useAuth();
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const linkToken = searchParams.get('discord_link');
    
    console.log('[Discord Link] Component mounted, linkToken:', linkToken ? 'present' : 'none');
    console.log('[Discord Link] Current status:', status);
    
    if (!linkToken) {
      console.log('[Discord Link] No token, forcing idle state');
      setStatus('idle');
      return;
    }

    setStatus('linking');

    const linkDiscordAccount = async () => {
      try {
        const token = localStorage.getItem('token');
        
        console.log('[Discord Link] Attempting to link with token:', linkToken.substring(0, 20) + '...');
        
        // Add timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const fetchPromise = fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/link-discord`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ linkToken })
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        console.log('[Discord Link] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Discord Link] Success:', data);
          
          // Refresh user data from server to get Discord info
          await refreshUser();
          
          setStatus('success');
          
          // Clear the URL parameter and navigate back to profile
          setTimeout(() => {
            navigate('/profile', { replace: true });
          }, 2000);
        } else {
          const errorText = await response.text();
          console.error('[Discord Link] Failed:', response.status, errorText);
          setStatus('error');
        }
      } catch (error) {
        console.error('[Discord Link] Error:', error);
        setStatus('error');
      }
    };

    linkDiscordAccount();
  }, [searchParams, navigate, updateUser]);

  // Don't render anything if no discord_link param
  if (status === 'idle') {
    return null;
  }

  if (status === 'linking') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
        <div className="bg-[#1a1d29] rounded-lg p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-white mb-2">Linking Discord Account...</h3>
          <p className="text-gray-400 mb-4">Please wait while we connect your Discord account.</p>
          <button
            onClick={() => {
              console.log('[Discord Link] User cancelled');
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
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
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
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
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
