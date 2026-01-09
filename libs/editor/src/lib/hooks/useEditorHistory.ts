'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/core';

export interface EditorHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  historyDepth: number;
  isHistoryEmpty: boolean;
}

export interface EditorHistoryActions {
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;
  getHistoryState: () => EditorHistoryState;
}

/**
 * Custom hook for managing Tiptap editor history state and actions
 * Provides real-time updates of undo/redo availability and history management
 */
export const useEditorHistory = (editor: Editor | null): EditorHistoryState & EditorHistoryActions => {
  const [historyState, setHistoryState] = useState<EditorHistoryState>({
    canUndo: false,
    canRedo: false,
    historyDepth: 0,
    isHistoryEmpty: true,
  });

  // Update history state based on editor state
  const updateHistoryState = useCallback(() => {
    if (!editor) {
      setHistoryState({
        canUndo: false,
        canRedo: false,
        historyDepth: 0,
        isHistoryEmpty: true,
      });
      return;
    }

    const canUndo = editor.can().undo();
    const canRedo = editor.can().redo();
    
    // For Tiptap v3, we'll use a simpler approach to track history state
    // The exact history depth isn't easily accessible, so we'll use boolean states
    const historyDepth = canUndo ? 1 : 0; // Simplified depth tracking
    const isHistoryEmpty = !canUndo && !canRedo;

    setHistoryState({
      canUndo,
      canRedo,
      historyDepth,
      isHistoryEmpty,
    });
  }, [editor]);

  // Set up event listeners for editor changes
  useEffect(() => {
    if (!editor) return;

    // Initial state update
    updateHistoryState();

    // Listen for all relevant editor events using proper Tiptap v3 event types
    editor.on('transaction', updateHistoryState);
    editor.on('update', updateHistoryState);
    editor.on('selectionUpdate', updateHistoryState);
    editor.on('focus', updateHistoryState);
    editor.on('blur', updateHistoryState);

    return () => {
      editor.off('transaction', updateHistoryState);
      editor.off('update', updateHistoryState);
      editor.off('selectionUpdate', updateHistoryState);
      editor.off('focus', updateHistoryState);
      editor.off('blur', updateHistoryState);
    };
  }, [editor, updateHistoryState]);

  // History action functions
  const undo = useCallback((): boolean => {
    if (!editor || !historyState.canUndo) return false;
    
    try {
      console.log('useEditorHistory - Attempting undo operation');
      const result = editor.chain().focus().undo().run();
      console.log('useEditorHistory - Undo result:', result);
      return result;
    } catch (error) {
      console.error('useEditorHistory - Undo operation failed:', error);
      return false;
    }
  }, [editor, historyState.canUndo]);

  const redo = useCallback((): boolean => {
    if (!editor || !historyState.canRedo) return false;
    
    try {
      console.log('useEditorHistory - Attempting redo operation');
      const result = editor.chain().focus().redo().run();
      console.log('useEditorHistory - Redo result:', result);
      return result;
    } catch (error) {
      console.error('useEditorHistory - Redo operation failed:', error);
      return false;
    }
  }, [editor, historyState.canRedo]);

  const clearHistory = useCallback((): void => {
    if (!editor) return;
    
    try {
      // Clear history by creating a new history state
      editor.commands.clearContent();
      updateHistoryState();
    } catch (error) {
      console.warn('Clear history operation failed:', error);
    }
  }, [editor, updateHistoryState]);

  const getHistoryState = useCallback((): EditorHistoryState => {
    return { ...historyState };
  }, [historyState]);

  return {
    ...historyState,
    undo,
    redo,
    clearHistory,
    getHistoryState,
  };
};

/**
 * Utility function to check if undo/redo actions are available
 */
export const canExecuteHistoryAction = (editor: Editor | null, action: 'undo' | 'redo'): boolean => {
  if (!editor) return false;
  
  return action === 'undo' ? editor.can().undo() : editor.can().redo();
};

/**
 * Utility function to execute history actions safely
 */
export const executeHistoryAction = (editor: Editor | null, action: 'undo' | 'redo'): boolean => {
  if (!editor || !canExecuteHistoryAction(editor, action)) return false;
  
  try {
    if (action === 'undo') {
      return editor.chain().focus().undo().run();
    } else {
      return editor.chain().focus().redo().run();
    }
  } catch (error) {
    console.warn(`${action} operation failed:`, error);
    return false;
  }
};

/**
 * Get keyboard shortcut text based on platform
 */
export const getHistoryShortcut = (action: 'undo' | 'redo'): string => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const cmdKey = isMac ? 'Cmd' : 'Ctrl';
  
  if (action === 'undo') {
    return `${cmdKey}+Z`;
  } else {
    return isMac ? `${cmdKey}+Shift+Z` : `${cmdKey}+Y`;
  }
};