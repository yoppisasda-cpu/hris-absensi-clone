const fs = require('fs');
let content = fs.readFileSync('mobile_app/lib/services/printer_service.dart', 'utf-8');

// Add new pref keys
content = content.replace("static const String _prefAutoPrint = 'auto_print_receipt';", "static const String _prefAutoPrint = 'auto_print_receipt';\n  static const String _prefAutoPrintLabel = 'auto_print_label';\n  static const String _prefAutoPrintKitchen = 'auto_print_kitchen';");

// Add getAutoPrintSettings method
const methodStr = `  Future<Map<String, bool>> getAutoPrintSettings() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'receipt': prefs.getBool(_prefAutoPrint) ?? false,
      'label': prefs.getBool(_prefAutoPrintLabel) ?? false,
      'kitchen': prefs.getBool(_prefAutoPrintKitchen) ?? false,
    };
  }

  Future<void> saveAutoPrintSettings(bool receipt, bool label, bool kitchen) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefAutoPrint, receipt);
    await prefs.setBool(_prefAutoPrintLabel, label);
    await prefs.setBool(_prefAutoPrintKitchen, kitchen);
  }`;

// Find a good place to insert (e.g. before printReceipt)
content = content.replace("Future<bool> printReceipt", methodStr + "\n\n  Future<bool> printReceipt");

fs.writeFileSync('mobile_app/lib/services/printer_service.dart', content);
