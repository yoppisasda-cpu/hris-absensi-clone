const fs = require('fs');
let content = fs.readFileSync('mobile_app/lib/screens/printer_settings_screen.dart', 'utf-8');

// 1. Add state variables
content = content.replace(
  "bool _autoPrint = false;", 
  "bool _autoPrint = false;\n  bool _autoPrintLabel = false;\n  bool _autoPrintKitchen = false;"
);

// 2. Load settings
content = content.replace(
  "final ap = await _printerService.isAutoPrintEnabled();",
  "final ap = await _printerService.isAutoPrintEnabled();\n    final autoSettings = await _printerService.getAutoPrintSettings();"
);

content = content.replace(
  "_autoPrint = ap;",
  "_autoPrint = autoSettings['receipt'] ?? false;\n      _autoPrintLabel = autoSettings['label'] ?? false;\n      _autoPrintKitchen = autoSettings['kitchen'] ?? false;"
);

// 3. Save settings
const saveMethod = `  Future<void> _saveSettings() async {
    await _printerService.saveAutoPrintSettings(_autoPrint, _autoPrintLabel, _autoPrintKitchen);`;
    
content = content.replace(
  "Future<void> _saveSettings() async {",
  saveMethod
);

// 4. UI for Auto Print Receipt (which is currently just "Otomatis Cetak Struk")
// Let's find where SwitchListTile is.
const oldSwitch = `          SwitchListTile(
            title: Text('Otomatis Cetak Struk'),
            subtitle: Text('Langsung cetak struk setelah bayar'),
            value: _autoPrint,
            onChanged: (val) {
              setState(() => _autoPrint = val);
            },
          ),`;

const newSwitches = `          SwitchListTile(
            title: Text('Otomatis Cetak Struk'),
            subtitle: Text('Langsung cetak struk setelah bayar'),
            value: _autoPrint,
            onChanged: (val) {
              setState(() => _autoPrint = val);
            },
          ),
          SwitchListTile(
            title: Text('Otomatis Cetak Label Sticker'),
            subtitle: Text('Langsung cetak label setelah bayar'),
            value: _autoPrintLabel,
            onChanged: (val) {
              setState(() => _autoPrintLabel = val);
            },
          ),
          SwitchListTile(
            title: Text('Otomatis Cetak Dapur'),
            subtitle: Text('Langsung cetak ke dapur setelah bayar'),
            value: _autoPrintKitchen,
            onChanged: (val) {
              setState(() => _autoPrintKitchen = val);
            },
          ),`;

content = content.replace(oldSwitch, newSwitches);

fs.writeFileSync('mobile_app/lib/screens/printer_settings_screen.dart', content);
