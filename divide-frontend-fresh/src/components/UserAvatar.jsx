import React from 'react';

export default function UserAvatar({ user, size = 32, onClick, className = '' }) {
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
  const isClickable = typeof onClick === 'function';

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    border: '2px solid rgba(0, 255, 255, 0.3)',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  };

  const hoverStyle = isClickable ? {
    transform: 'scale(1.05)',
    borderColor: 'rgba(0, 255, 255, 0.6)'
  } : {};

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={user.username}
        onClick={onClick}
        className={className}
        style={containerStyle}
        onMouseEnter={(e) => isClickable && Object.assign(e.currentTarget.style, hoverStyle)}
        onMouseLeave={(e) => isClickable && Object.assign(e.currentTarget.style, { transform: 'scale(1)', borderColor: 'rgba(0, 255, 255, 0.3)' })}
        title={isClickable ? `View ${user.username}'s profile` : user.username}
      />
    );
  }

  return (
    <div 
      onClick={onClick}
      className={className}
      style={{
        ...containerStyle,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.4}px`,
        fontWeight: 700,
        color: '#000',
      }}
      onMouseEnter={(e) => isClickable && Object.assign(e.currentTarget.style, hoverStyle)}
      onMouseLeave={(e) => isClickable && Object.assign(e.currentTarget.style, { transform: 'scale(1)', borderColor: 'rgba(0, 255, 255, 0.3)' })}
      title={isClickable ? `View ${user.username}'s profile` : user.username}
    >
      {initials}
    </div>
  );
}
