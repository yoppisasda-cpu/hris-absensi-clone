import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/product.dart';

class ProductProvider with ChangeNotifier {
  List<Product> _products = [];
  List<Category> _categories = [];
  bool _isLoading = false;
  int? _selectedCompanyId;

  List<Product> get products => _products;
  List<Category> get categories => _categories;
  bool get isLoading => _isLoading;
  int? get selectedCompanyId => _selectedCompanyId;

  void setCompany(int companyId) {
    _selectedCompanyId = companyId;
    // We don't call notifyListeners here because we usually loadData immediately after
  }

  Future<void> loadData({int? branchId}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final productData = await ApiService.fetchProducts(
        branchId: branchId, 
        companyId: _selectedCompanyId
      );
      final categoryData = await ApiService.fetchCategories(
        companyId: _selectedCompanyId
      );

      _products = productData
          .map((p) => Product.fromJson(p))
          .where((product) => product.showInPos)
          .toList();
      _categories = categoryData.map((c) => Category.fromJson(c)).toList();
    } catch (e) {
      print("Failed to load data: $e");
    }

    _isLoading = false;
    notifyListeners();
  }
}
