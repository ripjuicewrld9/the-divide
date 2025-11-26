import React from 'react';

// Robust mobile detection that works on all devices including iPhones
function useIsMobile() {
  if (typeof window === 'undefined') return false;

  // Check both screen width and user agent for better mobile detection
  const isMobileWidth = window.innerWidth <= 768;
  const isMobileDevice = typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return isMobileWidth || isMobileDevice;
}

export default function ResponsiveLayout({ MobileComponent, DesktopComponent }) {
  const [isMobile, setIsMobile] = React.useState(useIsMobile());

  React.useEffect(() => {
    function handleResize() {
      const isMobileWidth = window.innerWidth <= 768;
      const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileWidth || isMobileDevice);
    }

    // Check immediately on mount to ensure correct initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const Mobile = MobileComponent;
  const Desktop = DesktopComponent;
  return isMobile ? <Mobile /> : <Desktop />;
}
