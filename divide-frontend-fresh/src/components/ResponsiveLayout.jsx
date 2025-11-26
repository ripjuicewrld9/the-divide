import React from 'react';

// Simple hook to detect mobile screen size
function useIsMobile() {
  return window.innerWidth <= 768;
}

export default function ResponsiveLayout({ MobileComponent, DesktopComponent }) {
  const [isMobile, setIsMobile] = React.useState(useIsMobile());

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const Mobile = MobileComponent;
  const Desktop = DesktopComponent;
  return isMobile ? <Mobile /> : <Desktop />;
}
