import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/branding_provider.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';

class CurrencyFormat {
  static String convertToIdr(dynamic number, int decimalDigit) {
    NumberFormat currencyFormatter = NumberFormat.currency(
      locale: 'id',
      symbol: 'Rp',
      decimalDigits: decimalDigit,
    );
    return currencyFormatter.format(number);
  }
}

class ProductDetailScreen extends StatefulWidget {
  final Product product;

  ProductDetailScreen({required this.product});

  @override
  _ProductDetailScreenState createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final Map<int, CustomizationOption> _selectedOptions = {};
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    // Pre-select required single-choice options
    for (var group in widget.product.customizations) {
      if (group.isRequired && group.maxSelection == 1 && group.options.isNotEmpty) {
        _selectedOptions[group.id] = group.options.first;
      }
    }
  }

  double get _totalPrice {
    double total = widget.product.price;
    _selectedOptions.forEach((groupId, option) {
      total += option.price;
    });
    return total * _quantity;
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: brandingProvider.secondaryColor,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: brandingProvider.secondaryColor,
            leading: CircleAvatar(
              backgroundColor: Colors.black26,
              child: IconButton(
                icon: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: widget.product.imageUrl != null
                  ? CachedNetworkImage(
                      imageUrl: widget.product.imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(color: Colors.black12),
                      errorWidget: (context, url, error) => Icon(Icons.broken_image_outlined, color: Colors.white10),
                    )
                  : Center(child: Icon(Icons.restaurant_rounded, size: 100, color: primaryColor.withOpacity(0.3))),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              padding: EdgeInsets.all(25),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.product.categoryName ?? "General",
                    style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  SizedBox(height: 10),
                  Text(
                    widget.product.name,
                    style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  SizedBox(height: 10),
                  Text(
                    CurrencyFormat.convertToIdr(widget.product.price, 0),
                    style: GoogleFonts.outfit(fontSize: 22, color: primaryColor, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 20),
                  Text(
                    widget.product.description ?? "Nikmati hidangan lezat buatan kami dengan bahan-bahan premium pilihan.",
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14, height: 1.5),
                  ),
                  Divider(color: Colors.white.withOpacity(0.1), height: 50),
                  
                  // Customizations
                  if (widget.product.customizations.isNotEmpty)
                    ...widget.product.customizations.map((group) => _buildCustomizationGroup(group, primaryColor)),

                  SizedBox(height: 120),
                ],
              ),
            ),
          )
        ],
      ),
      bottomSheet: _buildBottomBar(primaryColor, cartProvider),
    );
  }

  Widget _buildCustomizationGroup(CustomizationGroup group, Color primaryColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(group.name, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            if (group.isRequired)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Text("Wajib", style: TextStyle(color: primaryColor, fontSize: 10, fontWeight: FontWeight.bold)),
              )
          ],
        ),
        SizedBox(height: 15),
        ...group.options.map((option) {
          bool isSelected = _selectedOptions[group.id]?.id == option.id;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10.0),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedOptions[group.id] = option;
                });
              },
              child: Container(
                padding: EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: isSelected ? primaryColor.withOpacity(0.1) : Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isSelected ? primaryColor : Colors.white.withOpacity(0.05)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(option.name, style: TextStyle(color: isSelected ? Colors.white : Color(0xFFCBD5E1))),
                    Row(
                      children: [
                        if (option.price > 0)
                          Text("+${CurrencyFormat.convertToIdr(option.price, 0)} ", style: TextStyle(color: primaryColor, fontSize: 12)),
                        Icon(
                          isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: isSelected ? primaryColor : Color(0xFF334155),
                          size: 20,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        SizedBox(height: 30),
      ],
    );
  }


  Widget _buildBottomBar(Color primaryColor, CartProvider cartProvider) {
    return Container(
      padding: EdgeInsets.all(25),
      decoration: BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: Offset(0, -5))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  _buildQtyBtn(Icons.remove, () {
                    if (_quantity > 1) setState(() => _quantity--);
                  }),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    child: Text("$_quantity", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  _buildQtyBtn(Icons.add, () => setState(() => _quantity++)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text("Total Harga", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  Text(CurrencyFormat.convertToIdr(_totalPrice, 0), style: GoogleFonts.outfit(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                ],
              )
            ],
          ),
          SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton(
              onPressed: () {
                // In a real app, we'd add items with customizations to cart
                cartProvider.addItem(widget.product); 
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("${widget.product.name} berhasil ditambah!"), backgroundColor: primaryColor),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: primaryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
              child: Text("TAMBAH KE KERANJANG", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildQtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }
}
