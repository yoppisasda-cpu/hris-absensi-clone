const fs = require('fs');
let content = fs.readFileSync('mobile_app/lib/screens/pos_screen.dart', 'utf-8');

const oldCode = `      // Print receipt in background to not block UI
      _printerService.isAutoPrintEnabled().then((enabled) {
        if (enabled) {
          _printerService.printReceipt(saleData);
        }
      });`;

const newCode = `      // Print in background to not block UI
      _printerService.getAutoPrintSettings().then((settings) {
        if (settings['receipt'] == true) {
          _printerService.printReceipt(saleData);
        }
        if (settings['label'] == true) {
          _printerService.printStickerLabels(saleData);
        }
        if (settings['kitchen'] == true) {
          _printerService.printKitchenReceipt(saleData);
        }
      });`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('mobile_app/lib/screens/pos_screen.dart', content);
