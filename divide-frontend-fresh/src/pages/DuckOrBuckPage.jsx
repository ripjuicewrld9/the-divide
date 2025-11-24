import React from 'react';
import DuckOrBuckGame from '../components/DuckOrBuckGame';

export default function DuckOrBuckPage() {
  return (
    <div style={{ maxWidth: 980, margin: '12px auto', padding: 12 }}>
      <h2>Duck or Buck</h2>
      <p style={{ color: '#aaa' }}>A provably-fair quick bet: shoot a duck (common, low multiplier) or a buck (rare, high multiplier). Use client seed + nonce for verification.</p>
      <DuckOrBuckGame />
    </div>
  );
}
