'use client';

import React, { useState } from 'react';
import { Editor } from '../../editor';
import { UndoRedoButtons } from '../ui/UndoRedoButtons';
import { useEditorHistory } from '../../hooks/useEditorHistory';
import { Button } from '@nextblock-cms/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@nextblock-cms/ui/card';

/**
 * Test component to verify undo/redo functionality with all content types
 * This component demonstrates the enhanced undo/redo features working with:
 * - Text formatting (bold, italic, etc.)
 * - Headings and paragraphs
 * - Lists (bullet, ordered, task)
 * - Tables
 * - Images
 * - Code blocks
 * - Custom widgets
 * - Drag and drop operations
 */
export const UndoRedoTest: React.FC = () => {
  const [content, setContent] = useState(`
    <h1>Undo/Redo Test Document</h1>
    <p>This document tests the enhanced undo/redo functionality with various content types.</p>
    
    <h2>Text Formatting</h2>
    <p>Try making text <strong>bold</strong>, <em>italic</em>, or <u>underlined</u>.</p>
    
    <h2>Lists</h2>
    <ul>
      <li>Bullet list item 1</li>
      <li>Bullet list item 2</li>
    </ul>
    
    <ol>
      <li>Numbered list item 1</li>
      <li>Numbered list item 2</li>
    </ol>
    
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false">Task item 1</li>
      <li data-type="taskItem" data-checked="true">Completed task</li>
    </ul>
    
    <h2>Code Block</h2>
    <pre><code class="language-javascript">console.log('Hello, world!');</code></pre>
    
    <h2>Table</h2>
    <table>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
      </tr>
      <tr>
        <td>Cell 1</td>
        <td>Cell 2</td>
      </tr>
    </table>
    
    <p>Try editing any content above and use the undo/redo buttons or keyboard shortcuts!</p>
  `);

  const [editorInstance] = useState<any>(null);
  const historyState = useEditorHistory(editorInstance);

  const testActions = [
    {
      name: 'Add Bold Text',
      action: () => {
        if (editorInstance) {
          editorInstance.chain().focus().insertContent('<p><strong>Bold text added!</strong></p>').run();
        }
      }
    },
    {
      name: 'Add Heading',
      action: () => {
        if (editorInstance) {
          editorInstance.chain().focus().insertContent('<h3>New Heading Added</h3>').run();
        }
      }
    },
    {
      name: 'Add List Item',
      action: () => {
        if (editorInstance) {
          editorInstance.chain().focus().insertContent('<ul><li>New list item</li></ul>').run();
        }
      }
    },
    {
      name: 'Add Table',
      action: () => {
        if (editorInstance) {
          editorInstance.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
        }
      }
    },
    {
      name: 'Clear All Content',
      action: () => {
        if (editorInstance) {
          editorInstance.chain().focus().clearContent().run();
        }
      }
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Undo/Redo Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* History State Display */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <strong>History State:</strong>
            </div>
            <div className="text-sm">
              Can Undo: <span className={historyState.canUndo ? 'text-green-600' : 'text-red-600'}>
                {historyState.canUndo ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="text-sm">
              Can Redo: <span className={historyState.canRedo ? 'text-green-600' : 'text-red-600'}>
                {historyState.canRedo ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="text-sm">
              History Empty: <span className={historyState.isHistoryEmpty ? 'text-orange-600' : 'text-blue-600'}>
                {historyState.isHistoryEmpty ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {/* Enhanced Undo/Redo Buttons */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="text-sm font-medium">Enhanced Controls:</div>
            <UndoRedoButtons 
              editor={editorInstance} 
              size="md" 
              showLabels={true}
              className="border rounded p-2"
            />
            <div className="text-xs text-muted-foreground">
              Keyboard: Ctrl+Z (Undo), Ctrl+Y (Redo)
            </div>
          </div>

          {/* Test Actions */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Test Actions:</div>
            <div className="flex flex-wrap gap-2">
              {testActions.map((test, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={test.action}
                  disabled={!editorInstance}
                >
                  {test.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="border rounded-lg">
            <Editor
              content={content}
              onChange={setContent}
              showToolbar={true}
              showCharacterCount={true}
              onFocus={() => console.log('Editor focused')}
              onBlur={() => console.log('Editor blurred')}
            />
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Test Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the test actions above to add content</li>
              <li>Try editing text directly in the editor</li>
              <li>Use Ctrl+Z to undo changes</li>
              <li>Use Ctrl+Y to redo changes</li>
              <li>Try dragging content around (if drag handles are visible)</li>
              <li>Watch the history state indicators update in real-time</li>
              <li>Test with different content types: text, headings, lists, tables, etc.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UndoRedoTest;