// This is a special layout file that does not use any client-side hooks
// for compatibility with static export when used in Pages Router

import React from 'react';

export default function StaticLayout({ children }) {
  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      {children}
    </div>
  );
}