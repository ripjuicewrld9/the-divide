import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DiscordLinkHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState('linking');

  useEffect(() => {
    const linkToken = searchParams.get('discord_link');
    
    if (!linkToken) return;

    const linkDiscordAccount = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/link-discord`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ linkToken })
        });

        if (response.ok) {
          const data = await response.json();
          updateUser({ 
            discordId: data.discordId,
            discordUsername: data.discordUsername
          });
          setStatus('success');
          
          // Clear the URL parameter and navigate back to profile
          setTimeout(() => {
            navigate('/profile', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Failed to link Discord:', error);
        setStatus('error');
      }
    };

    linkDiscordAccount();
  }, [searchParams, navigate, updateUser]);

  if (status === 'linking') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
        <div className="bg-[#1a1d29] rounded-lg p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-white mb-2">Linking Discord Account...</h3>
          <p className="text-gray-400">Please wait while we connect your Discord account.</p>
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
