
class Order {
  final int id;
  final String invoiceNumber;
  final DateTime date;
  final double totalAmount;
  final String status;
  final String? branchName;
  final String? saleType;
  final String? voucherCode;
  final double voucherDiscountAmount;
  final List<OrderItem> items;

  Order({
    required this.id,
    required this.invoiceNumber,
    required this.date,
    required this.totalAmount,
    required this.status,
    this.branchName,
    this.saleType,
    this.voucherCode,
    this.voucherDiscountAmount = 0,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    var itemsList = json['SaleItem'] as List? ?? [];
    List<OrderItem> items = itemsList.map((i) => OrderItem.fromJson(i)).toList();

    return Order(
      id: json['id'] ?? 0,
      invoiceNumber: json['invoiceNumber'] ?? "INV-UNKNOWN",
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? "UNKNOWN",
      branchName: json['branch'] != null ? json['branch']['name'] : null,
      saleType: json['saleType'],
      voucherCode: json['voucherCode'],
      voucherDiscountAmount: (json['voucherDiscountAmount'] as num?)?.toDouble() ?? 0.0,
      items: items,
    );
  }
}

class OrderItem {
  final int id;
  final String productName;
  final int quantity;
  final double price;
  final double total;

  OrderItem({
    required this.id,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.total,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? 0,
      productName: json['product'] != null ? json['product']['name'] : "Product",
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
