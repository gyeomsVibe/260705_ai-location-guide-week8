const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  id: 'project-diagnostic',
  name: 'Project Structure and Code Integrity Diagnostic',
  layer: 'SYSTEM',
  linkedTask: 'TASK-001',

  async run(ctx) {
    const rootPath = ctx.cwd || process.cwd();
    const serverPath = path.join(rootPath, 'server.js');
    const htmlPath = path.join(rootPath, 'public', 'index.html');

    // 1. Check server.js existence and code check
    if (!fs.existsSync(serverPath)) {
      return { status: 'ERROR', details: 'server.js file is missing at project root.' };
    }

    const serverContent = fs.readFileSync(serverPath, 'utf8');
    if (!serverContent.includes('express')) {
      return { status: 'ERROR', details: 'server.js does not seem to use Express.' };
    }
    if (!serverContent.includes('disable("x-powered-by")')) {
      return { status: 'WARNING', details: 'server.js should disable "x-powered-by" header for security.' };
    }
    if (!serverContent.includes('process.env.PORT')) {
      return { status: 'WARNING', details: 'server.js should bind dynamically to process.env.PORT.' };
    }

    // 2. Check public/index.html existence
    if (!fs.existsSync(htmlPath)) {
      return { status: 'ERROR', details: 'public/index.html is missing.' };
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 3. Check Kakao Maps SDK script existence
    if (!htmlContent.includes('dapi.kakao.com/v2/maps/sdk.js')) {
      return { status: 'ERROR', details: 'Kakao Maps SDK script tag is missing in index.html.' };
    }

    // 4. Validate ZONES_DATA integrity (expecting exactly 89 detailed locations)
    const zonesDataMatch = htmlContent.match(/const\s+ZONES_DATA\s*=\s*\{([\s\S]*?)\};/);
    if (!zonesDataMatch) {
      return { status: 'ERROR', details: 'ZONES_DATA object is missing or malformed in index.html.' };
    }

    // A simple parsing to verify count of entries safely without eval/Function
    try {
      const matchText = zonesDataMatch[1];
      // Count how many 'lat:' keys are present in the ZONES_DATA block
      const latOccurrences = (matchText.match(/lat\s*:/g) || []).length;

      if (latOccurrences !== 89) {
        return { 
          status: 'WARNING', 
          details: `ZONES_DATA has ${latOccurrences} items (counted via 'lat:'), but documentation mentions 89 detailed locations.` 
        };
      }
    } catch (e) {
      return { status: 'ERROR', details: `Failed to parse ZONES_DATA: ${e.message}` };
    }

    return { status: 'OK', details: 'Server configuration, HTML files, and ZONES_DATA are fully verified.' };
  }
};
