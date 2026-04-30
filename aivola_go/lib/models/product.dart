class CustomizationOption {
  final int id;
  final String name;
  final double price;

  CustomizationOption({required this.id, required this.name, required this.price});

  factory CustomizationOption.fromJson(Map<String, dynamic> json) {
    return CustomizationOption(
      id: json['id'],
      name: json['name'],
      price: (json['price'] as num).toDouble(),
    );
  }
}

class CustomizationGroup {
  final int id;
  final String name;
  final bool isRequired;
  final int minSelection;
  final int maxSelection;
  final List<CustomizationOption> options;

  CustomizationGroup({
    required this.id,
    required this.name,
    required this.isRequired,
    required this.minSelection,
    required this.maxSelection,
    required this.options,
  });

  factory CustomizationGroup.fromJson(Map<String, dynamic> json) {
    var optionsList = json['options'] as List? ?? [];
    return CustomizationGroup(
      id: json['id'],
      name: json['name'],
      isRequired: json['isRequired'] ?? false,
      minSelection: json['minSelection'] ?? 0,
      maxSelection: json['maxSelection'] ?? 1,
      options: optionsList.map((o) => CustomizationOption.fromJson(o)).toList(),
    );
  }
}

class Category {
  final int id;
  final String name;

  Category({required this.id, required this.name});

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'],
      name: json['name'],
    );
  }
}

class Product {
  final int id;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final String? categoryName;
  final int categoryId;
  final bool showInPos;
  final double stock;
  final List<CustomizationGroup> customizations;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    this.categoryName,
    required this.categoryId,
    required this.showInPos,
    this.stock = 0,
    this.customizations = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    String? imageUrl = json['imageUrl'];
    if (imageUrl != null) {
      if (imageUrl.startsWith('/uploads/')) {
        imageUrl = "http://10.0.2.2:5000$imageUrl";
      } else if (imageUrl.contains('localhost')) {
        imageUrl = imageUrl.replaceAll('localhost', '10.0.2.2');
      }
    }

    var customList = json['customizations'] as List? ?? [];

    return Product(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      price: (json['price'] as num).toDouble(),
      imageUrl: imageUrl,
      categoryName: json['category'] != null ? json['category']['name'] : null,
      categoryId: json['categoryId'] ?? 0,
      showInPos: json['showInPos'] ?? false,
      stock: (json['stock'] as num?)?.toDouble() ?? 0,
      customizations: customList.map((c) {
        // Handle junction table structure if necessary
        if (c['CustomizationGroup'] != null) {
          return CustomizationGroup.fromJson(c['CustomizationGroup']);
        }
        return CustomizationGroup.fromJson(c);
      }).toList(),
    );
  }
}
