/**
 * Helper to handle client-side only features safely in both 
 * server and client environments
 */

// Check if code is running on the server during build/SSR
const isServer = () => typeof window === 'undefined';

export function withClientSideRendering<P extends object>(Component: React.ComponentType<P>) {
  // This higher-order component ensures that the wrapped component
  // only renders on the client side, avoiding SSR issues with browser APIs
  
  function ClientSideOnly(props: P) {
    // If we're on the server, return null
    if (isServer()) {
      return null;
    }
    
    // Otherwise, render the component normally
    return <Component {...props} />;
  }
  
  // Copy display name for better debugging
  ClientSideOnly.displayName = `withClientSideRendering(${
    Component.displayName || Component.name || 'Component'
  })`;
  
  return ClientSideOnly;
}