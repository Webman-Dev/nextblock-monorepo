import { useEffect } from 'react';

/**
 * Hook to handle keyboard shortcuts.
 * Currently optimized for 'ctrl+s' / 'meta+s'.
 * 
 * @param key The key combination to listen for (e.g. 'ctrl+s')
 * @param callback The function to call when the key combination is pressed
 * @param deps Dependencies array for the effect
 */
export function useHotkeys(key: string, callback: (event: KeyboardEvent) => void, deps: any[] = []) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey; // cmd on mac, ctrl on windows
      const keyLower = event.key.toLowerCase();

      // Check for ctrl+s / cmd+s
      if ((key === 'ctrl+s' || key === 'meta+s') && isCtrl && keyLower === 's') {
        event.preventDefault();
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, ...deps]); // callback should be stable or included in deps if handled by caller
}
