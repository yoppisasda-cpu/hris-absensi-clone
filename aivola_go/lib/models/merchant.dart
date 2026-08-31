import 'branch.dart';

class Merchant {
  final int id;
  final String name;
  final String? logoUrl;
  final String? primaryColor;
  final String? secondaryColor;
  final String? address;
  final List<Branch> branches;
  final String? openTime;
  final String? closeTime;
  final bool isOpenManual;
  final String? timezone;
  final bool allowDineIn;
  final bool allowPickUp;
  final bool allowDelivery;
  final bool allowOnlineOrder;
  final bool allowPreOrder;
  double? distance; // distance to nearest branch in km

  Merchant({
    required this.id,
    required this.name,
    this.logoUrl,
    this.primaryColor,
    this.secondaryColor,
    this.address,
    this.branches = const [],
    this.openTime,
    this.closeTime,
    this.isOpenManual = true,
    this.timezone,
    this.allowDineIn = true,
    this.allowPickUp = true,
    this.allowDelivery = true,
    this.allowOnlineOrder = true,
    this.allowPreOrder = false,
    this.distance,
  });

  factory Merchant.fromJson(Map<String, dynamic> json) {
    return Merchant(
      id: json['id'],
      name: json['name'],
      logoUrl: json['logoUrl'],
      primaryColor: json['primaryColor'],
      secondaryColor: json['secondaryColor'],
      address: json['address'],
      openTime: json['openTime'],
      closeTime: json['closeTime'],
      isOpenManual: json['isOpenManual'] ?? true,
      timezone: json['timezone'],
      allowDineIn: json['allowDineIn'] ?? true,
      allowPickUp: json['allowPickUp'] ?? true,
      allowDelivery: json['allowDelivery'] ?? true,
      allowOnlineOrder: json['allowOnlineOrder'] ?? true,
      allowPreOrder: json['allowPreOrder'] ?? false,
      branches: (json['branches'] as List?)?.map((b) => Branch.fromJson(b)).toList() ?? [],
    );
  }
}
