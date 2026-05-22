import 'package:hive_flutter/hive_flutter.dart';

class PosLocalDbService {
  static const String _productsBoxName = 'pos_products_box';
  static const String _categoriesBoxName = 'pos_categories_box';
  static const String _accountsBoxName = 'pos_accounts_box';
  static const String _offlineSalesBoxName = 'offline_sales_box';

  static Future<void> init() async {
    await Hive.initFlutter();
    
    // Open necessary boxes
    await Hive.openBox(_productsBoxName);
    await Hive.openBox(_categoriesBoxName);
    await Hive.openBox(_accountsBoxName);
    await Hive.openBox(_offlineSalesBoxName);
  }

  // --- PRODUCTS ---
  static List<dynamic> getCachedProducts() {
    final box = Hive.box(_productsBoxName);
    return box.get('products', defaultValue: []) as List<dynamic>;
  }

  static Future<void> cacheProducts(List<dynamic> productsJson) async {
    final box = Hive.box(_productsBoxName);
    await box.put('products', productsJson);
  }

  // --- CATEGORIES ---
  static List<dynamic> getCachedCategories() {
    final box = Hive.box(_categoriesBoxName);
    return box.get('categories', defaultValue: []) as List<dynamic>;
  }

  static Future<void> cacheCategories(List<dynamic> categoriesJson) async {
    final box = Hive.box(_categoriesBoxName);
    await box.put('categories', categoriesJson);
  }

  // --- ACCOUNTS ---
  static List<dynamic> getCachedAccounts() {
    final box = Hive.box(_accountsBoxName);
    return box.get('accounts', defaultValue: []) as List<dynamic>;
  }

  static Future<void> cacheAccounts(List<dynamic> accountsJson) async {
    final box = Hive.box(_accountsBoxName);
    await box.put('accounts', accountsJson);
  }

  // --- OFFLINE SALES ---
  static List<dynamic> getOfflineSales() {
    final box = Hive.box(_offlineSalesBoxName);
    return box.get('sales', defaultValue: []) as List<dynamic>;
  }

  static Future<void> saveOfflineSale(Map<String, dynamic> saleJson) async {
    final box = Hive.box(_offlineSalesBoxName);
    final List<dynamic> currentSales = List.from(getOfflineSales());
    currentSales.add(saleJson);
    await box.put('sales', currentSales);
  }

  static Future<void> clearOfflineSales() async {
    final box = Hive.box(_offlineSalesBoxName);
    await box.put('sales', []);
  }

  static Future<void> removeOfflineSale(String localInvoiceNumber) async {
    final box = Hive.box(_offlineSalesBoxName);
    final List<dynamic> currentSales = List.from(getOfflineSales());
    currentSales.removeWhere((item) => item['localInvoiceNumber'] == localInvoiceNumber);
    await box.put('sales', currentSales);
  }

  // --- UTILS ---
  static Future<void> clearAllCache() async {
    await Hive.box(_productsBoxName).clear();
    await Hive.box(_categoriesBoxName).clear();
    await Hive.box(_accountsBoxName).clear();
    await Hive.box(_offlineSalesBoxName).clear();
  }
}
