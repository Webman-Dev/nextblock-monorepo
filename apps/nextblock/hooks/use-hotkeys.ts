import { useEffect, type DependencyList } from 'react';

/**
 * Hook to handle keyboard shortcuts.
 * Currently optimized for 'ctrl+s' / 'meta+s'.
 * 
 * @param key The key combination to listen for (e.g. 'ctrl+s')
 * @param callback The function to call when the key combination is pressed
 * @param deps Dependencies array for the effect
 */
export function useHotkeys(
  key: string,
  callback: (event: KeyboardEvent) => void,
  deps: DependencyList = [],
) {
  useEffect(() => {
    const normalizedShortcut = key.toLowerCase();

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey; // cmd on mac, ctrl on windows
      const keyLower = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const isSaveKey = keyLower === 's' || event.code === 'KeyS';

      // Check for ctrl+s / cmd+s
      if ((normalizedShortcut === 'ctrl+s' || normalizedShortcut === 'meta+s') && isCtrl && isSaveKey) {
        event.preventDefault();
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, ...deps]); // callback should be stable or included in deps if handled by caller
}
