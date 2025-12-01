import React from 'react';

export default function UserAvatar({ user, size = 32 }) {
  // Generate a consistent color based on username
  const getColorFromUsername = (username) => {
    if (!username) return '#00ffff';
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const color = getColorFromUsername(user?.username);
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : '?';

  // Construct full image URL
  const getImageUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      return profileImage;
    }
    // Static frontend assets
    if (profileImage.startsWith('/profilesvg/')) {
      return profileImage;
    }
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = `${baseUrl}${profileImage}`;
    return fullUrl;
  };

  const imageUrl = getImageUrl(user?.profileImage);

  if (imageUrl) {
    return (
      <>
        <img
          src={imageUrl}
          alt={user.username}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(0, 255, 255, 0.3)'
          }}
        />
      </>
    );
  }

  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${size * 0.4}px`,
      fontWeight: 700,
      color: '#000',
      border: '2px solid rgba(0, 255, 255, 0.3)'
    }}>
      {initials}
    </div>
  );
}
