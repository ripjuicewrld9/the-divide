import React from 'react';
import ResponsiveLayout from './components/ResponsiveLayout.jsx';
import MobileApp from './MobileApp.jsx';
import DesktopApp from './DesktopApp.jsx';

export default function App() {
  return (
    <ResponsiveLayout
      MobileComponent={MobileApp}
      DesktopComponent={DesktopApp}
    />
  );
}
