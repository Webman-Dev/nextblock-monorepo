'use client';

import React, { useState } from 'react';
import { NotionEditor } from '../../NotionEditor';

/**
 * Test component to verify NotionEditor enhanced functionality
 * Tests:
 * 1. Undo/Redo buttons are visible in toolbar
 * 2. Drag handles appear on block hover
 * 3. Enhanced styling and spacing
 * 4. All existing features still work
 */
export const NotionEditorEnhancedTest: React.FC = () => {
  const [content, setContent] = useState(`
    <h1>Enhanced NotionEditor Test</h1>
    <p>This is a test of the enhanced NotionEditor with undo/redo buttons and improved drag handles.</p>
    <h2>Drag Handle UX Improvements:</h2>
    <ul>
      <li>✅ Drag handles appear when hovering anywhere on the content block (not just the handle area)</li>
      <li>✅ Drag handles are properly centered within each content section</li>
      <li>✅ Expanded hover detection covers entire paragraphs, headings, and lists</li>
      <li>✅ Enhanced visual feedback and smooth transitions</li>
      <li>✅ Responsive design works on mobile devices</li>
    </ul>
    <h3>Test Different Content Types:</h3>
    <p>Hover over this paragraph - the drag handle should appear when hovering anywhere on this text, not just where the handle is positioned.</p>
    <blockquote>
      <p>Hover over this blockquote to test drag handle visibility and centering.</p>
    </blockquote>
    <ol>
      <li>First ordered list item - test drag handle on lists</li>
      <li>Second item - drag handle should be centered vertically</li>
    </ol>
    <p>Try typing some text and then using the undo/redo buttons in the toolbar.</p>
  `);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">NotionEditor Enhanced Features Test</h1>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Drag Handle UX Test Instructions:</h3>
        <ol className="list-decimal list-inside text-blue-700 space-y-1">
          <li>🎯 <strong>Expanded Hover Area:</strong> Hover anywhere on a content block (not just the handle area) - drag handle should appear</li>
          <li>📍 <strong>Proper Centering:</strong> Verify drag handles are vertically centered within each content section</li>
          <li>🔄 <strong>Content Types:</strong> Test on paragraphs, headings, lists, and blockquotes</li>
          <li>📱 <strong>Mobile Responsive:</strong> Check that drag handles work properly on smaller screens</li>
          <li>✨ <strong>Visual Feedback:</strong> Notice smooth transitions and enhanced styling</li>
          <li>🖱️ <strong>Drag Functionality:</strong> Try dragging blocks to reorder them</li>
        </ol>
      </div>

      <div className="border border-gray-200 rounded-lg">
        <NotionEditor
          content={content}
          onChange={setContent}
          showToolbar={true}
          showCharacterCount={true}
          className="min-h-[600px]"
        />
      </div>

      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">Current Content (JSON):</h3>
        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default NotionEditorEnhancedTest;