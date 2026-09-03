import 'dart:io';

void main() {
  // Update api_service.dart
  var apiFile = File('aivola_go/lib/services/api_service.dart');
  var apiContent = apiFile.readAsStringSync();
  apiContent = apiContent.replaceAll(
    'String? paymentMethod,\n    int pointsUsed = 0,',
    'String? paymentMethod,\n    int pointsUsed = 0,\n    String saleType = "ONLINE",'
  );
  apiContent = apiContent.replaceAll(
    '"saleType": "ONLINE",',
    '"saleType": saleType,'
  );
  apiFile.writeAsStringSync(apiContent);

  // Update cart_screen.dart
  var cartFile = File('aivola_go/lib/screens/cart_screen.dart');
  var cartContent = cartFile.readAsStringSync();
  cartContent = cartContent.replaceAll(
    'pointsUsed: cartProvider.isUsingPoints ? cartProvider.availablePoints : 0,',
    'pointsUsed: cartProvider.isUsingPoints ? cartProvider.availablePoints : 0,\n      saleType: finalOrderType == "Pre-Order" ? "PRE_ORDER" : "ONLINE",'
  );
  cartFile.writeAsStringSync(cartContent);
}
