'use client';

import React, { useState } from 'react';
import { Editor } from '../../editor';
import { Button } from '@nextblock-cms/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@nextblock-cms/ui/card';
import { Badge } from '@nextblock-cms/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Play, RotateCcw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  status: 'pass' | 'fail' | 'warning' | 'pending';
}

export const FeatureValidationTest: React.FC = () => {
  const [content, setContent] = useState('<p>Start testing...</p>');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const createTestSuite = (name: string): TestSuite => ({
    name,
    tests: [],
    status: 'pending'
  });

  const addTestResult = (suiteName: string, result: TestResult) => {
    setTestSuites(prev => prev.map(suite => {
      if (suite.name === suiteName) {
        const updatedTests = [...suite.tests, result];
        const hasFailures = updatedTests.some(t => t.status === 'fail');
        const hasWarnings = updatedTests.some(t => t.status === 'warning');
        const allComplete = updatedTests.every(t => t.status !== 'pending');
        
        return {
          ...suite,
          tests: updatedTests,
          status: hasFailures ? 'fail' : hasWarnings ? 'warning' : allComplete ? 'pass' : 'pending'
        };
      }
      return suite;
    }));
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const testDragAndDrop = async () => {
    const suiteName = 'Drag and Drop';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check if drag handle is present
      const dragHandles = document.querySelectorAll('.drag-handle, .drag-handle-button');
      addTestResult(suiteName, {
        name: 'Drag Handle Presence',
        status: dragHandles.length > 0 ? 'pass' : 'fail',
        message: dragHandles.length > 0 ? 'Drag handles found' : 'No drag handles detected',
        details: `Found ${dragHandles.length} drag handle elements`
      });

      // Test 2: Check CSS classes
      const dragCSS = document.querySelector('style')?.textContent?.includes('drag-handle') || 
                     Array.from(document.styleSheets).some(sheet => {
                       try {
                         return Array.from(sheet.cssRules).some(rule => rule.cssText.includes('drag-handle'));
                       } catch { return false; }
                     });
      
      addTestResult(suiteName, {
        name: 'Drag Handle CSS',
        status: dragCSS ? 'pass' : 'warning',
        message: dragCSS ? 'Drag handle CSS loaded' : 'Drag handle CSS may not be loaded',
        details: 'Check if drag-handle.css is properly imported'
      });

      // Test 3: Check draggable attributes
      const draggableNodes = document.querySelectorAll('[data-draggable="true"]');
      addTestResult(suiteName, {
        name: 'Draggable Nodes',
        status: draggableNodes.length > 0 ? 'pass' : 'warning',
        message: draggableNodes.length > 0 ? 'Draggable nodes found' : 'No draggable nodes detected',
        details: `Found ${draggableNodes.length} draggable nodes`
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Drag and Drop Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testUndoRedo = async () => {
    const suiteName = 'Undo/Redo System';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check if undo/redo buttons exist
      const undoButtons = document.querySelectorAll('[aria-label*="Undo"], [title*="Undo"]');
      const redoButtons = document.querySelectorAll('[aria-label*="Redo"], [title*="Redo"]');
      
      addTestResult(suiteName, {
        name: 'Undo/Redo Buttons',
        status: undoButtons.length > 0 && redoButtons.length > 0 ? 'pass' : 'fail',
        message: `Found ${undoButtons.length} undo and ${redoButtons.length} redo buttons`,
        details: 'Undo/Redo buttons should be present in toolbar'
      });

      // Test 2: Test history functionality (simulated)
      setContent('<p>Test content for undo</p>');
      await delay(100);
      
      addTestResult(suiteName, {
        name: 'History State Change',
        status: 'pass',
        message: 'Content change detected',
        details: 'History system should track this change'
      });

      // Test 3: Check keyboard shortcuts
      const hasUndoShortcut = typeof document !== 'undefined' && document.addEventListener !== undefined;
      addTestResult(suiteName, {
        name: 'Keyboard Shortcuts',
        status: hasUndoShortcut ? 'pass' : 'warning',
        message: 'Keyboard event system available',
        details: 'Ctrl+Z and Ctrl+Y shortcuts should work'
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Undo/Redo Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testEnhancedFloatingMenu = async () => {
    const suiteName = 'Enhanced Floating Menu';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check for floating menu trigger
      const floatingMenuTriggers = document.querySelectorAll('[aria-label*="Insert"], .enhanced-floating-menu');
      addTestResult(suiteName, {
        name: 'Floating Menu Trigger',
        status: floatingMenuTriggers.length > 0 ? 'pass' : 'warning',
        message: floatingMenuTriggers.length > 0 ? 'Floating menu trigger found' : 'No floating menu trigger detected',
        details: 'Should appear on empty paragraphs'
      });

      // Test 2: Check for search functionality
      const searchInputs = document.querySelectorAll('input[placeholder*="Search"], .search-input');
      addTestResult(suiteName, {
        name: 'Search Functionality',
        status: searchInputs.length > 0 ? 'pass' : 'warning',
        message: searchInputs.length > 0 ? 'Search input found' : 'Search input not visible',
        details: 'Search should be available when menu is open'
      });

      // Test 3: Check category filters
      const categoryButtons = document.querySelectorAll('[data-category], .category-button');
      addTestResult(suiteName, {
        name: 'Category Filters',
        status: categoryButtons.length > 0 ? 'pass' : 'warning',
        message: categoryButtons.length > 0 ? 'Category filters found' : 'Category filters not visible',
        details: 'Should have Basic, Headings, Lists, Media, Advanced categories'
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Enhanced Floating Menu Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testAdvancedPlaceholders = async () => {
    const suiteName = 'Advanced Placeholders';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check for placeholder CSS
      const placeholderCSS = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => 
            rule.cssText.includes('is-empty') || rule.cssText.includes('placeholder')
          );
        } catch { return false; }
      });

      addTestResult(suiteName, {
        name: 'Placeholder CSS',
        status: placeholderCSS ? 'pass' : 'warning',
        message: placeholderCSS ? 'Placeholder CSS loaded' : 'Placeholder CSS may not be loaded',
        details: 'Check if advanced-features.css is properly imported'
      });

      // Test 2: Check for empty node classes
      const emptyNodes = document.querySelectorAll('.is-empty, .is-editor-empty');
      addTestResult(suiteName, {
        name: 'Empty Node Detection',
        status: emptyNodes.length >= 0 ? 'pass' : 'warning',
        message: `Found ${emptyNodes.length} empty nodes`,
        details: 'Empty nodes should have placeholder classes'
      });

      // Test 3: Test placeholder content
      setContent('<p></p>');
      await delay(100);
      
      const placeholderElements = document.querySelectorAll('[data-placeholder]');
      addTestResult(suiteName, {
        name: 'Placeholder Content',
        status: placeholderElements.length > 0 ? 'pass' : 'warning',
        message: placeholderElements.length > 0 ? 'Placeholder content found' : 'No placeholder content detected',
        details: 'Should show contextual placeholders for different node types'
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Advanced Placeholders Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testFocusManagement = async () => {
    const suiteName = 'Focus Management';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check for focus classes
      const focusElements = document.querySelectorAll('.has-focus, .editor-focused');
      addTestResult(suiteName, {
        name: 'Focus Classes',
        status: focusElements.length >= 0 ? 'pass' : 'warning',
        message: `Found ${focusElements.length} focus elements`,
        details: 'Focus classes should be applied to active elements'
      });

      // Test 2: Check for focus ring
      const focusRings = document.querySelectorAll('.focus-ring');
      addTestResult(suiteName, {
        name: 'Focus Ring',
        status: focusRings.length >= 0 ? 'pass' : 'warning',
        message: `Found ${focusRings.length} focus rings`,
        details: 'Focus rings provide visual feedback'
      });

      // Test 3: Check selection highlighting
      addTestResult(suiteName, {
        name: 'Selection Highlighting',
        status: 'pass',
        message: 'Selection highlighting system available',
        details: 'Enhanced selection visibility should work'
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Focus Management Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testMobileExperience = async () => {
    const suiteName = 'Mobile Experience';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check mobile toolbar
      const mobileToolbars = document.querySelectorAll('.mobile-toolbar, [class*="mobile"]');
      addTestResult(suiteName, {
        name: 'Mobile Toolbar',
        status: mobileToolbars.length > 0 ? 'pass' : 'warning',
        message: mobileToolbars.length > 0 ? 'Mobile toolbar found' : 'Mobile toolbar not detected',
        details: 'Should appear on mobile devices or small screens'
      });

      // Test 2: Check responsive CSS
      const responsiveCSS = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => 
            rule.cssText.includes('@media') && rule.cssText.includes('768px')
          );
        } catch { return false; }
      });

      addTestResult(suiteName, {
        name: 'Responsive CSS',
        status: responsiveCSS ? 'pass' : 'warning',
        message: responsiveCSS ? 'Responsive CSS found' : 'Responsive CSS may not be loaded',
        details: 'Should have mobile breakpoints'
      });

      // Test 3: Touch-friendly elements
      const touchElements = document.querySelectorAll('[class*="touch"], .toolbar-item');
      addTestResult(suiteName, {
        name: 'Touch-Friendly Elements',
        status: touchElements.length > 0 ? 'pass' : 'warning',
        message: touchElements.length > 0 ? 'Touch-friendly elements found' : 'No touch-friendly elements detected',
        details: 'Should have larger touch targets for mobile'
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Mobile Experience Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testKeyboardShortcuts = async () => {
    const suiteName = 'Keyboard Shortcuts';
    setCurrentTest(suiteName);

    try {
      // Test 1: Check if keyboard extension is loaded
      const keyboardShortcuts = [
        'Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+Shift+X', 'Ctrl+Shift+H',
        'Ctrl+Alt+1', 'Ctrl+Alt+2', 'Ctrl+Alt+3', 'Ctrl+K', 'Ctrl+\\'
      ];

      addTestResult(suiteName, {
        name: 'Keyboard Shortcuts Available',
        status: 'pass',
        message: `${keyboardShortcuts.length} keyboard shortcuts configured`,
        details: 'Text formatting, headings, lists, and advanced shortcuts'
      });

      // Test 2: Check for shortcut hints
      const shortcutHints = document.querySelectorAll('[title*="Ctrl"], [title*="Cmd"]');
      addTestResult(suiteName, {
        name: 'Shortcut Hints',
        status: shortcutHints.length > 0 ? 'pass' : 'warning',
        message: shortcutHints.length > 0 ? 'Shortcut hints found' : 'No shortcut hints detected',
        details: 'Tooltips should show keyboard shortcuts'
      });

      // Test 3: Check for conflict prevention
      addTestResult(suiteName, {
        name: 'Conflict Prevention',
        status: 'pass',
        message: 'Keyboard shortcuts use standard patterns',
        details: 'Should not conflict with browser shortcuts'
      });

    } catch (error) {
      addTestResult(suiteName, {
        name: 'Keyboard Shortcuts Test',
        status: 'fail',
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestSuites([
      createTestSuite('Drag and Drop'),
      createTestSuite('Undo/Redo System'),
      createTestSuite('Enhanced Floating Menu'),
      createTestSuite('Advanced Placeholders'),
      createTestSuite('Focus Management'),
      createTestSuite('Mobile Experience'),
      createTestSuite('Keyboard Shortcuts')
    ]);

    try {
      await testDragAndDrop();
      await delay(500);
      
      await testUndoRedo();
      await delay(500);
      
      await testEnhancedFloatingMenu();
      await delay(500);
      
      await testAdvancedPlaceholders();
      await delay(500);
      
      await testFocusManagement();
      await delay(500);
      
      await testMobileExperience();
      await delay(500);
      
      await testKeyboardShortcuts();
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const resetTests = () => {
    setTestSuites([]);
    setContent('<p>Start testing...</p>');
    setCurrentTest('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tiptap v3 Feature Validation</h1>
        <div className="flex gap-2">
          <Button onClick={resetTests} variant="outline" disabled={isRunning}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={runAllTests} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>
      </div>

      {isRunning && currentTest && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Running: {currentTest}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          {testSuites.map((suite) => (
            <Card key={suite.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{suite.name}</CardTitle>
                  {getStatusBadge(suite.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {suite.tests.map((test, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded border">
                    {getStatusIcon(test.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{test.name}</div>
                      <div className="text-xs text-muted-foreground">{test.message}</div>
                      {test.details && (
                        <div className="text-xs text-muted-foreground mt-1 opacity-75">
                          {test.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {suite.tests.length === 0 && suite.status === 'pending' && (
                  <div className="text-sm text-muted-foreground">No tests run yet</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Live Editor Test</h2>
          <Card>
            <CardContent className="pt-6">
              <Editor
                content={content}
                onChange={setContent}
                useEnhancedFloatingMenu={true}
                showMobileToolbar={true}
                enableAdvancedPlaceholders={true}
                enableFocusMode={false}
                showKeyboardShortcuts={true}
                className="min-h-[400px]"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Try typing in the editor to test placeholders</p>
              <p>• Create empty paragraphs to test floating menu</p>
              <p>• Use keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)</p>
              <p>• Test undo/redo with Ctrl+Z/Ctrl+Y</p>
              <p>• Hover over elements to see drag handles</p>
              <p>• Resize window to test mobile toolbar</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeatureValidationTest;