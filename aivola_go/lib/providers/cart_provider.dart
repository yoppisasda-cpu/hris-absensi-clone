import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/voucher.dart';

class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, this.quantity = 1});
}

class CartProvider with ChangeNotifier {
  final Map<int, CartItem> _items = {};
  Voucher? _selectedVoucher;
  bool _isUsingPoints = false;
  int _availablePoints = 2450;

  Map<int, CartItem> get items => _items;
  Voucher? get selectedVoucher => _selectedVoucher;
  bool get isUsingPoints => _isUsingPoints;
  int get availablePoints => _availablePoints;

  int get itemCount => _items.length;

  double get subtotal {
    double total = 0.0;
    _items.forEach((key, cartItem) {
      total += cartItem.product.price * cartItem.quantity;
    });
    return total;
  }

  double get discountAmount {
    if (_selectedVoucher == null) return 0.0;
    
    // Check min purchase
    if (subtotal < _selectedVoucher!.minPurchase) {
      // Auto remove if min purchase no longer met
      _selectedVoucher = null;
      return 0.0;
    }

    double discount = 0.0;
    if (_selectedVoucher!.discountType == 'PERCENTAGE') {
      discount = subtotal * (_selectedVoucher!.discountValue / 100);
      if (_selectedVoucher!.maxDiscount != null && discount > _selectedVoucher!.maxDiscount!) {
        discount = _selectedVoucher!.maxDiscount!;
      }
    } else {
      discount = _selectedVoucher!.discountValue;
    }

    return discount;
  }

  double get pointsDiscount {
    if (!_isUsingPoints) return 0.0;
    return _availablePoints.toDouble(); // 1 point = Rp 1
  }

  double get totalAmount {
    double total = subtotal - discountAmount - pointsDiscount;
    return total < 0 ? 0 : total;
  }

  void addItem(Product product) {
    if (_items.containsKey(product.id)) {
      _items[product.id]!.quantity += 1;
    } else {
      _items[product.id] = CartItem(product: product);
    }
    notifyListeners();
  }

  void removeItem(int productId) {
    _items.remove(productId);
    notifyListeners();
  }

  void decrementItem(int productId) {
    if (!_items.containsKey(productId)) return;
    if (_items[productId]!.quantity > 1) {
      _items[productId]!.quantity -= 1;
    } else {
      _items.remove(productId);
    }
    notifyListeners();
  }

  void selectVoucher(Voucher? voucher) {
    _selectedVoucher = voucher;
    notifyListeners();
  }

  void toggleUsingPoints(bool value) {
    _isUsingPoints = value;
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    _selectedVoucher = null;
    notifyListeners();
  }
}
