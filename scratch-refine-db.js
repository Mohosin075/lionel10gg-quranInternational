const fs = require('fs');
const file = 'D:\\Mohosin\\projects\\app\\Quran-International\\lib\\service\\database_helper.dart';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "final hasContent = b['content'] != null && (b['content'] as String).trim().isNotEmpty;",
  "final hasContent = map['content'] != null && (map['content'] as String).trim().isNotEmpty;"
);

c = c.replace(
  "b['id'], b['bookId'], b['title'], b['author'],\n          b['id'], b['bookId'],\n          b['lang'], b['version'], b['isActive']",
  "map['id'], map['bookId'], map['title'], map['author'],\n          map['id'], map['bookId'],\n          map['lang'], map['version'], map['isActive']"
);

fs.writeFileSync(file, c, 'utf8');
console.log('✅ Cleaned up database_helper.dart map references.');
