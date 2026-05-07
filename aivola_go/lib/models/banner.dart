import '../services/api_service.dart';

class PromoBanner {
  final int id;
  final String? title;
  final String imageUrl;
  final String? linkUrl;
  final bool isActive;
  final int order;

  PromoBanner({
    required this.id,
    this.title,
    required this.imageUrl,
    this.linkUrl,
    required this.isActive,
    required this.order,
  });

  factory PromoBanner.fromJson(Map<String, dynamic> json) {
    String imageUrl = ApiService.resolveUrl(json['imageUrl']);

    return PromoBanner(
      id: json['id'],
      title: json['title'],
      imageUrl: imageUrl,
      linkUrl: json['linkUrl'],
      isActive: json['isActive'] ?? true,
      order: json['order'] ?? 0,
    );
  }
}
