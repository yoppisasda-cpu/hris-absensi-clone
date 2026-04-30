class Branch {
  final int id;
  final String name;
  final String? location;
  final double? latitude;
  final double? longitude;

  Branch({
    required this.id,
    required this.name,
    this.location,
    this.latitude,
    this.longitude,
  });

  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id'],
      name: json['name'],
      location: json['location'],
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
    );
  }
}
