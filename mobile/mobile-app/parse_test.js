const { parse } = require('./node_modules/@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('./app/(auth)/accept-invite.tsx', 'utf-8');
try {
  parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  console.log('Parsed successfully!');
} catch (e) {
  console.error('Parse error:', e.message);
}
