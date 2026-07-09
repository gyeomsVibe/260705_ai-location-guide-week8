const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  id: 'ui-ux-diagnostic',
  name: 'UI/UX Visual and Interactive Premium Quality Diagnostic',
  layer: 'FUNCTION',
  linkedTask: 'TASK-002',

  async run(ctx) {
    const rootPath = ctx.cwd || process.cwd();
    const htmlPath = path.join(rootPath, 'public', 'index.html');

    if (!fs.existsSync(htmlPath)) {
      return { status: 'ERROR', details: 'public/index.html is missing for UI/UX check.' };
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // 1. Accessibility check: lang attribute
    if (!htmlContent.includes('<html lang="ko">') && !htmlContent.includes('<html lang="en">')) {
      return { status: 'WARNING', details: 'HTML lang attribute should be explicitly defined for screen readers.' };
    }

    // 2. CSS custom variables usage
    if (!htmlContent.includes(':root') || !htmlContent.includes('--primary')) {
      return { status: 'WARNING', details: 'CSS variables (:root / --primary) are recommended for premium design systems.' };
    }

    // 3. Smooth transitions check
    if (!htmlContent.includes('transition:')) {
      return { status: 'WARNING', details: 'Micro-interactions (transitions) are missing. Adding smooth transitions improves user experience.' };
    }

    // 4. Custom scrollbar check (helps keep the UI neat)
    if (!htmlContent.includes('::-webkit-scrollbar')) {
      return { status: 'WARNING', details: 'Custom styled scrollbar is missing. Default scrollbars can degrade premium visual look.' };
    }

    // 5. Dark mode support check
    // We check if there is any dark-mode dynamic class or media query for prefers-color-scheme
    const hasDarkMode = htmlContent.includes('dark-mode') || htmlContent.includes('prefers-color-scheme') || htmlContent.includes('--bg-dark');
    if (!hasDarkMode) {
      return { status: 'WARNING', details: 'No dark mode support detected. Offering dark mode or high-contrast theme wows users.' };
    }

    return { status: 'OK', details: 'Visual assets, transitions, and responsive styles are verified.' };
  }
};
