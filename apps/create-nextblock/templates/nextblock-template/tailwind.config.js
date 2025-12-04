const { existsSync } = require('fs');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../libs/ui/tailwind.config.js')],
  content: (() => {
    const projectGlobs = [
      join(
        __dirname,
        '{src,pages,components,app,lib}/**/*!(*.stories|*.spec).{ts,tsx,js,jsx,md,mdx,html}',
      ),
    ];
    const libsDir = join(__dirname, '../../libs');
    if (existsSync(libsDir)) {
      projectGlobs.push(join(libsDir, '**/*.{ts,tsx,js,jsx,md,mdx,html,sql}'));
    }
    return projectGlobs;
  })(),
  theme: {
    extend: {},
  },
  plugins: [],
};
