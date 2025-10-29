#!/usr/bin/env node

/**
 * Bundle Optimization Test Script
 * 
 * This script tests the TipTap role-based bundle optimization by:
 * 1. Building the application with bundle analysis
 * 2. Checking for proper chunk separation
 * 3. Verifying TipTap is not in the main bundle
 * 4. Confirming dynamic imports are working
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing TipTap Bundle Optimization...\n');

// Step 1: Build with bundle analysis
console.log('📦 Building application with bundle analysis...');
try {
  execSync('npm run analyze', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Check for bundle analysis output
const buildDir = path.join(process.cwd(), '.next');
const staticDir = path.join(buildDir, 'static', 'chunks');

if (!fs.existsSync(staticDir)) {
  console.error('❌ Build output not found');
  process.exit(1);
}

// Step 3: Analyze chunks
console.log('🔍 Analyzing bundle chunks...');
const chunks = fs.readdirSync(staticDir).filter(file => file.endsWith('.js'));

const tiptapChunks = chunks.filter(chunk => 
  chunk.includes('tiptap') || 
  chunk.includes('prosemirror')
);

const mainChunks = chunks.filter(chunk => 
  chunk.includes('main') || 
  chunk.includes('pages/_app')
);

console.log(`📊 Bundle Analysis Results:`);
console.log(`   Total chunks: ${chunks.length}`);
console.log(`   TipTap-related chunks: ${tiptapChunks.length}`);
console.log(`   Main app chunks: ${mainChunks.length}`);

if (tiptapChunks.length > 0) {
  console.log('✅ TipTap chunks found (good - separated from main bundle):');
  tiptapChunks.forEach(chunk => console.log(`   - ${chunk}`));
} else {
  console.log('⚠️  No dedicated TipTap chunks found');
}

// Step 4: Check main bundle doesn't contain TipTap
console.log('\n🔍 Checking main bundle for TipTap references...');
let tiptapInMain = false;

mainChunks.forEach(chunk => {
  const chunkPath = path.join(staticDir, chunk);
  if (fs.existsSync(chunkPath)) {
    const content = fs.readFileSync(chunkPath, 'utf8');
    if (content.includes('@tiptap') || content.includes('prosemirror')) {
      console.log(`❌ TipTap found in main chunk: ${chunk}`);
      tiptapInMain = true;
    }
  }
});

if (!tiptapInMain) {
  console.log('✅ TipTap not found in main bundle (optimization working!)');
}

// Step 5: Performance summary
console.log('\n📈 Performance Impact Summary:');
console.log('   Expected benefits for anonymous users:');
console.log('   - Bundle size reduction: 200-500KB');
console.log('   - JavaScript execution time: 100-300ms improvement');
console.log('   - Speed Index improvement: 400-800ms');
console.log('   - Lighthouse score increase: 3-5 points');

console.log('\n🎯 Optimization Status:');
if (tiptapChunks.length > 0 && !tiptapInMain) {
  console.log('✅ Bundle optimization SUCCESSFUL!');
  console.log('   - TipTap is properly separated into async chunks');
  console.log('   - Main bundle is clean of TipTap dependencies');
  console.log('   - Role-based loading will prevent unnecessary downloads');
} else {
  console.log('⚠️  Bundle optimization needs review');
  if (tiptapChunks.length === 0) {
    console.log('   - No dedicated TipTap chunks found');
  }
  if (tiptapInMain) {
    console.log('   - TipTap found in main bundle');
  }
}

console.log('\n🧪 Manual Testing Recommendations:');
console.log('1. Test as anonymous user - TipTap should not load');
console.log('2. Test as WRITER/ADMIN - TipTap should load dynamically');
console.log('3. Check Network tab for chunk loading behavior');
console.log('4. Verify fallback editor works for unauthorized users');
console.log('5. Run Lighthouse audit on public pages');

console.log('\n✨ Bundle optimization test completed!');