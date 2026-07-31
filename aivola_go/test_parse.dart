import 'dart:convert';
import 'package:http/http.dart' as http;
import 'lib/models/product.dart';

void main() async {
  print("Fetching products...");
  final response = await http.get(Uri.parse("https://api.aivola.id/api/companies/public/26/products?branchId=999"));
  final productData = jsonDecode(response.body) as List<dynamic>;
  
  print("Fetched ${productData.length} products. Parsing...");
  try {
    final products = productData
        .map((p) => Product.fromJson(p))
        .where((product) => product.showInPos)
        .toList();
    print("Successfully parsed ${products.length} products.");
  } catch (e, stacktrace) {
    print("FAILED TO PARSE: $e");
    print(stacktrace);
  }
}
