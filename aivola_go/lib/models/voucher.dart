class Voucher {
  final int id;
  final String code;
  final String discountType;
  final double discountValue;
  final double minPurchase;
  final double? maxDiscount;
  final DateTime? validUntil;
  final bool isActive;

  Voucher({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    required this.minPurchase,
    this.maxDiscount,
    this.validUntil,
    required this.isActive,
  });

  factory Voucher.fromJson(Map<String, dynamic> json) {
    return Voucher(
      id: json['id'],
      code: json['code'],
      discountType: json['discountType'],
      discountValue: (json['discountValue'] as num).toDouble(),
      minPurchase: (json['minPurchase'] as num).toDouble(),
      maxDiscount: json['maxDiscount'] != null ? (json['maxDiscount'] as num).toDouble() : null,
      validUntil: json['validUntil'] != null ? DateTime.parse(json['validUntil']) : null,
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'discountType': discountType,
      'discountValue': discountValue,
      'minPurchase': minPurchase,
      'maxDiscount': maxDiscount,
      'validUntil': validUntil?.toIso8601String(),
      'isActive': isActive,
    };
  }
}
