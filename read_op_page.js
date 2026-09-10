const fs = require('fs');

const opPath = 'D:/Mohosin/projects/dashboard/quran-dashboard/app/(dashboard)/offline-packs/page.tsx';
const content = fs.readFileSync(opPath, 'utf8');
console.log(content.slice(2800, 6000));
