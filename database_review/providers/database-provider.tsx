"use client";

import { useEffect, createContext, useContext, useState, useCallback } from 'react';

// Create context for database status
interface DatabaseContextType {
  isDbConnected: boolean;
  useDemoMode: boolean;
  toggleDemoMode: () => void;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isDbConnected: false,
  useDemoMode: false,
  toggleDemoMode: () => {},
});

// Provider component
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [useDemoMode, setUseDemoMode] = useState<boolean>(false);
  
  // Check database connection on load
  useEffect(() => {
    const checkDbConnection = async () => {
      try {
        const res = await fetch('/api/health/database');
        const data = await res.json();
        setIsDbConnected(data.connected);
        
        // If database is not connected and we're not already in demo mode,
        // show a confirmation to enter demo mode
        if (!data.connected && !useDemoMode) {
          const shouldUseDemoMode = window.confirm(
            'Database connection failed. Would you like to use demo mode with local data instead?'
          );
          if (shouldUseDemoMode) {
            setUseDemoMode(true);
            localStorage.setItem('voiceflow_demo_mode', 'true');
          }
        }
      } catch (error) {
        console.error('Failed to check database connection:', error);
        setIsDbConnected(false);
      }
    };
    
    // Check for existing demo mode preference
    const savedDemoMode = localStorage.getItem('voiceflow_demo_mode');
    if (savedDemoMode === 'true') {
      setUseDemoMode(true);
    } else {
      checkDbConnection();
    }
  }, [useDemoMode]);
  
  // Toggle demo mode
  const toggleDemoMode = useCallback(() => {
    const newDemoMode = !useDemoMode;
    setUseDemoMode(newDemoMode);
    localStorage.setItem('voiceflow_demo_mode', newDemoMode ? 'true' : 'false');
  }, [useDemoMode]);
  
  return (
    <DatabaseContext.Provider value={{ isDbConnected, useDemoMode, toggleDemoMode }}>
      {children}
    </DatabaseContext.Provider>
  );
}

// Hook for using the database context
export function useDatabase() {
  return useContext(DatabaseContext);
}