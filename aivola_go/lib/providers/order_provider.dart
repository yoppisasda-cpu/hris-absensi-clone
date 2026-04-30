
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/order.dart';

class OrderProvider with ChangeNotifier {
  List<Order> _orders = [];
  bool _isLoading = false;

  List<Order> get orders => _orders;
  bool get isLoading => _isLoading;

  Future<void> loadOrders() async {
    _isLoading = true;
    notifyListeners();

    try {
      print("DEBUG: Loading orders...");
      final data = await ApiService.fetchOrders();
      print("DEBUG: Received ${data.length} orders from server");
      _orders = data.map((o) => Order.fromJson(o)).toList();
      print("DEBUG: Successfully parsed ${_orders.length} orders");
    } catch (e) {
      print("DEBUG: Failed to load orders error: $e");
    }

    _isLoading = false;
    notifyListeners();
  }
}
