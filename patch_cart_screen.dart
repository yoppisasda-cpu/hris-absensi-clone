import 'dart:io';

void main() {
  var file = File('aivola_go/lib/screens/cart_screen.dart');
  var content = file.readAsStringSync();
  
  content = content.replaceAll(
    'final apiCall = (finalOrderType == "Pre-Order") ? ApiService.createPreOrder : ApiService.createOrder;',
    'final apiCall = ApiService.createOrder;'
  );
  
  file.writeAsStringSync(content);
}
