import React from 'react';
import ResponsiveLayout from './components/ResponsiveLayout.jsx';
import MobileMainLayout from './components/MobileMainLayout.jsx';
import DesktopApp from './DesktopApp.jsx'; // This should be your current desktop layout

export default function App() {
  return (
    <ResponsiveLayout
      MobileComponent={MobileMainLayout}
      DesktopComponent={DesktopApp}
    />
  );
}
