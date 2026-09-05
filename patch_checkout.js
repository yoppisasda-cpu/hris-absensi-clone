const fs = require('fs');
let content = fs.readFileSync('aivola_go/lib/screens/cart_screen.dart', 'utf-8');

const oldCode = "if (response['qrisUrl'] != null && response['qrisUrl'].toString().isNotEmpty) {";
const newCode = "if (_paymentMethod != \"Bayar di Kasir\" && response['qrisUrl'] != null && response['qrisUrl'].toString().isNotEmpty) {";

content = content.replace(oldCode, newCode);

fs.writeFileSync('aivola_go/lib/screens/cart_screen.dart', content);
