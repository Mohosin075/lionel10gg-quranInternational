const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const targetFile = process.argv[3];
const replacementFile = process.argv[4];

if (!filePath || !targetFile || !replacementFile) {
  console.error("Usage: node edit_file.js <file_to_edit> <target_file> <replacement_file>");
  process.exit(1);
}

const targetContent = fs.readFileSync(targetFile, 'utf8');
const replacementContent = fs.readFileSync(replacementFile, 'utf8');

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error("File not found:", absolutePath);
  process.exit(1);
}

let content = fs.readFileSync(absolutePath, 'utf8');

// Normalize newlines to handle Windows (CRLF) vs Unix (LF) differences
const normalize = str => str.replace(/\r\n/g, '\n');

if (!normalize(content).includes(normalize(targetContent))) {
  console.error("Error: Target content not found in target file!");
  process.exit(1);
}

// Perform replacement
const normalizedContent = normalize(content);
const normalizedTarget = normalize(targetContent);
const normalizedReplacement = normalize(replacementContent);

const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);

fs.writeFileSync(absolutePath, newContent, 'utf8');
console.log("Successfully edited file:", absolutePath);
