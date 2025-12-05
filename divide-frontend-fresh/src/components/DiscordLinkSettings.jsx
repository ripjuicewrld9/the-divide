import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DiscordLinkSettings() {
  const { user, updateUser } = useAuth();
  const [discordId, setDiscordId] = useState(user?.discordId || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ discordId: discordId.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        updateUser({ discordId: discordId.trim() });
        setMessage({ type: 'success', text: 'Discord ID linked successfully!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to update Discord ID' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#1a1d29] rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Discord Integration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Discord User ID
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Link your Discord account to receive support ticket notifications. 
            <br />
            To find your Discord ID: Enable Developer Mode in Discord Settings → Right-click your name → Copy User ID
          </p>
          
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="123456789012345678"
                className="w-full bg-[#0f1218] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDiscordId(user?.discordId || '');
                    setMessage(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#0f1218] border border-gray-700 rounded-lg px-4 py-2 text-gray-400">
                {user?.discordId || 'Not linked'}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {user?.discordId ? 'Change' : 'Link'}
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/50 text-green-400'
              : 'bg-red-500/10 border border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {user?.discordId && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
            <p className="text-sm text-blue-400 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
              Discord linked! You'll be mentioned in support ticket threads so you can respond directly in Discord.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
