const fs = require('fs');
let file = 'mobile/mobile-app/app/(resident)/profile/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the container
content = content.replace(
  '<View className="flex-row flex-wrap gap-2.5 pt-2 border-t border-border/50">',
  '<View className="flex-col gap-2.5 pt-2 border-t border-border/50">'
);

// Replace button styles
content = content.replace(
  /className="flex-1 min-w-\[130px\] h-11/g,
  'className="w-full h-11'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed button alignment');
