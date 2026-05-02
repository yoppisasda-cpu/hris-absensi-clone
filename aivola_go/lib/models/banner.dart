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
    String imageUrl = json['imageUrl'] ?? '';
    
    // Handle local development URLs for Android Emulator
    if (imageUrl.startsWith('/uploads/')) {
      imageUrl = "http://10.0.2.2:5000$imageUrl";
    } else if (imageUrl.contains('localhost')) {
      imageUrl = imageUrl.replaceAll('localhost', '10.0.2.2');
    }

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
