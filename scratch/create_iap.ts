import * as fs from 'fs';
import * as path from 'path';

const sourceDir = path.join(__dirname, '../src/app/modules/subscription');
const targetDir = path.join(__dirname, '../src/app/modules/in-app-purchase');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function processContent(content: string): string {
  // Replace Subscription -> InAppPurchase
  content = content.replace(/Subscription/g, 'InAppPurchase');
  // Replace subscription -> inAppPurchase
  content = content.replace(/subscription/g, 'inAppPurchase');
  // Replace subscription-plan -> in-app-purchase-package
  content = content.replace(/inAppPurchase-plan/g, 'in-app-purchase-package');
  content = content.replace(/inAppPurchasePlan/g, 'inAppPurchasePackage');
  
  // Replace specific strings for router
  content = content.replace(/inAppPurchaseValidation/g, 'inAppPurchaseValidation');
  
  return content;
}

const files = fs.readdirSync(sourceDir);
for (const file of files) {
  if (fs.statSync(path.join(sourceDir, file)).isFile()) {
    const sourceContent = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
    const processedContent = processContent(sourceContent);
    
    // rename file
    let targetFile = file.replace(/subscription/g, 'in-app-purchase');
    targetFile = targetFile.replace(/in-app-purchase-plan/g, 'in-app-purchase-package');
    
    fs.writeFileSync(path.join(targetDir, targetFile), processedContent);
    console.log(`Created ${targetFile}`);
  }
}
