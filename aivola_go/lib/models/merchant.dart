import 'branch.dart';

class Merchant {
  final int id;
  final String name;
  final String? logoUrl;
  final String? primaryColor;
  final String? secondaryColor;
  final String? address;
  final List<Branch> branches;
  double? distance; // distance to nearest branch in km

  Merchant({
    required this.id,
    required this.name,
    this.logoUrl,
    this.primaryColor,
    this.secondaryColor,
    this.address,
    this.branches = const [],
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
      branches: json['branches'] != null 
          ? (json['branches'] as List).map((b) => Branch.fromJson(b)).toList()
          : [],
    );
  }
}
