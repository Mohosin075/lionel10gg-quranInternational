import * as fs from 'fs';
import * as path from 'path';

const targetDir = path.join(__dirname, '../src/app/modules/in-app-purchase');

function processContent(content: string): string {
  content = content.replace(/inAppPurchase\.controller/g, 'in-app-purchase.controller');
  content = content.replace(/inAppPurchase\.interface/g, 'in-app-purchase.interface');
  content = content.replace(/inAppPurchase\.model/g, 'in-app-purchase.model');
  content = content.replace(/inAppPurchase\.route/g, 'in-app-purchase.route');
  content = content.replace(/inAppPurchase\.service/g, 'in-app-purchase.service');
  content = content.replace(/inAppPurchase\.validation/g, 'in-app-purchase.validation');
  content = content.replace(/inAppPurchasePackage\.model/g, 'in-app-purchase-package.model');
  content = content.replace(/in-app-purchasePackage\.model/g, 'in-app-purchase-package.model');
  return content;
}

const files = fs.readdirSync(targetDir);
for (const file of files) {
  if (fs.statSync(path.join(targetDir, file)).isFile()) {
    const filePath = path.join(targetDir, file);
    const sourceContent = fs.readFileSync(filePath, 'utf-8');
    const processedContent = processContent(sourceContent);
    fs.writeFileSync(filePath, processedContent);
  }
}
