"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface MigrationScriptProps {
  onComplete?: () => void;
}

export function UpdateUsernameReferencesScript({ onComplete }: MigrationScriptProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runMigration = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    
    try {
      addLog('Starting username references migration...');
      
      // Step 1: Update post schema to include username
      addLog('Updating post schema...');
      const postResponse = await fetch('/api/admin/migrations/update-post-usernames', {
        method: 'POST'
      });
      
      if (!postResponse.ok) {
        throw new Error(`Failed to update posts: ${(await postResponse.json()).error}`);
      }
      
      const postResult = await postResponse.json();
      addLog(`Post update complete. Updated ${postResult.updatedCount} posts.`);
      setProgress(50);
      
      // Step 2: Update comment schema to include username
      addLog('Updating comment schema...');
      const commentResponse = await fetch('/api/admin/migrations/update-comment-usernames', {
        method: 'POST'
      });
      
      if (!commentResponse.ok) {
        throw new Error(`Failed to update comments: ${(await commentResponse.json()).error}`);
      }
      
      const commentResult = await commentResponse.json();
      addLog(`Comment update complete. Updated ${commentResult.updatedCount} comments.`);
      setProgress(100);
      
      addLog('Migration completed successfully!');
      toast({
        title: 'Migration Complete',
        description: 'Username references have been updated in all posts and comments.'
      });
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Migration error:', error);
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      toast({
        title: 'Migration Failed',
        description: 'There was an error updating username references.',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-lg font-semibold">Username Reference Migration</h2>
      <p className="text-sm text-muted-foreground">
        This utility will update all posts and comments to include the username field
        for better database consistency and performance.
      </p>
      
      {progress > 0 && (
        <div className="w-full bg-muted rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      <div className="max-h-40 overflow-y-auto bg-muted p-2 rounded text-xs font-mono">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className="py-0.5">{log}</div>
          ))
        ) : (
          <div className="text-muted-foreground">No logs yet. Run the migration to see progress.</div>
        )}
      </div>
      
      <Button 
        onClick={runMigration} 
        disabled={isRunning}
      >
        {isRunning ? 'Running Migration...' : 'Run Migration'}
      </Button>
    </div>
  );
}