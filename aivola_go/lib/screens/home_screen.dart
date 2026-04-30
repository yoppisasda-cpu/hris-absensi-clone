import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/product_provider.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/branch_provider.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import 'order_history_screen.dart';
import 'wallet_screen.dart';
import 'profile_screen.dart';
import 'merchant_selection_screen.dart';
import '../providers/branding_provider.dart';
import '../models/voucher.dart' as model;

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

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedCategoryId = 0; // 0 for "All"
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final brandingProvider = Provider.of<BrandingProvider>(context, listen: false);
      final branchProvider = Provider.of<BranchProvider>(context, listen: false);
      final productProvider = Provider.of<ProductProvider>(context, listen: false);
      
      if (productProvider.selectedCompanyId == null && brandingProvider.selectedMerchantId != null) {
        productProvider.setCompany(brandingProvider.selectedMerchantId!);
      }
      
      await branchProvider.loadBranches(companyId: productProvider.selectedCompanyId);
      
      if (branchProvider.branches.isNotEmpty) {
        await branchProvider.findNearestBranch();
      }
      
      if (mounted) {
        productProvider.loadData(branchId: branchProvider.selectedBranch?.id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final cartProvider = Provider.of<CartProvider>(context);
    final primaryColor = brandingProvider.primaryColor;
    final secondaryColor = brandingProvider.secondaryColor;

    final List<Widget> pages = [
      _buildHomeContent(),
      _buildMenuContent(),
      ProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: secondaryColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.storefront_outlined, color: Colors.white, size: 24),
          onPressed: () => _showSwitchBrandDialog(context, brandingProvider),
        ),
        title: GestureDetector(
          onTap: () => _showBranchPicker(context, Provider.of<BranchProvider>(context, listen: false)),
          child: Row(
            children: [
              if (brandingProvider.fullLogoUrl != null)
                Padding(
                  padding: const EdgeInsets.only(right: 12.0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(brandingProvider.fullLogoUrl!, height: 35, width: 35, fit: BoxFit.contain),
                  ),
                ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            Provider.of<BranchProvider>(context).selectedBranch?.name ?? "Select Branch", 
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)
                          ),
                        ),
                        Icon(Icons.keyboard_arrow_down_rounded, color: primaryColor, size: 20),
                      ],
                    ),
                    Text("Hi, Coffee Lover!", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: Icon(Icons.shopping_cart_outlined, color: Colors.white),
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (context) => CartScreen())),
              ),
              if (cartProvider.itemCount > 0)
                Positioned(right: 8, top: 8, child: Container(padding: EdgeInsets.all(2), decoration: BoxDecoration(color: Colors.redAccent, borderRadius: BorderRadius.circular(10)), constraints: BoxConstraints(minWidth: 16, minHeight: 16), child: Text("${cartProvider.itemCount}", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold), textAlign: TextAlign.center))),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(right: 15.0),
            child: CircleAvatar(backgroundColor: primaryColor.withOpacity(0.2), child: Icon(Icons.person_outline, color: primaryColor, size: 20)),
          )
        ],
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: Color(0xFF1E293B),
        selectedItemColor: primaryColor,
        unselectedItemColor: Color(0xFF94A3B8),
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: "Home"),
          BottomNavigationBarItem(icon: Icon(Icons.restaurant_menu_rounded), label: "Menu"),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), label: "Profile"),
        ],
      ),
    );
  }

  Widget _buildHomeContent() {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (brandingProvider.banners.isNotEmpty) ...[
            CarouselSlider(
              options: CarouselOptions(
                height: 180.0,
                autoPlay: true,
                enlargeCenterPage: true,
                aspectRatio: 21 / 9,
                viewportFraction: 0.95,
              ),
              items: brandingProvider.banners.map((banner) => Container(
                width: double.infinity,
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.network(banner.imageUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) => Center(child: Icon(Icons.broken_image, color: Colors.white24))),
                ),
              )).toList(),
            ),
          ],
          if (brandingProvider.vouchers.isNotEmpty) ...[
            SizedBox(height: 30),
            Text("Voucher Untukmu", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 15),
            Container(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: brandingProvider.vouchers.length,
                itemBuilder: (context, index) {
                  final v = brandingProvider.vouchers[index];
                  String title = v.discountType == 'PERCENTAGE' ? "${v.discountValue.toInt()}% OFF" : CurrencyFormat.convertToIdr(v.discountValue, 0);
                  return _buildVoucherCard(title, "Min. belanja ${CurrencyFormat.convertToIdr(v.minPurchase, 0)}", index % 2 == 0 ? Colors.orangeAccent : Colors.blueAccent);
                },
              ),
            ),
          ],
          SizedBox(height: 30),
          Text("Promo Spesial", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 15),
          _buildSpecialPromo("Beli 1 Gratis 1", "Setiap hari Senin", "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600"),
        ],
      ),
    );
  }

  Widget _buildMenuContent() {
    final productProvider = Provider.of<ProductProvider>(context);
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final filteredProducts = _selectedCategoryId == 0 ? productProvider.products : productProvider.products.where((p) => p.categoryId == _selectedCategoryId).toList();

    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.symmetric(horizontal: 15),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white.withOpacity(0.1))),
            child: TextField(style: TextStyle(color: Colors.white), decoration: InputDecoration(hintText: "Cari kopi favoritmu...", hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14), border: InputBorder.none, icon: Icon(Icons.search, color: Color(0xFF94A3B8)))),
          ),
          SizedBox(height: 20),
          SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [_buildCategoryChip("Semua", 0), ...productProvider.categories.map((cat) => _buildCategoryChip(cat.name, cat.id))])),
          SizedBox(height: 20),
          Expanded(
            child: productProvider.isLoading ? Center(child: CircularProgressIndicator(color: brandingProvider.primaryColor)) : (filteredProducts.isEmpty ? Center(child: Text("Produk tidak ditemukan", style: TextStyle(color: Color(0xFF94A3B8)))) : GridView.builder(gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 0.75, crossAxisSpacing: 15, mainAxisSpacing: 15), itemCount: filteredProducts.length, itemBuilder: (context, index) => _buildProductCard(filteredProducts[index]))),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, int id) {
    bool isSelected = _selectedCategoryId == id;
    final primaryColor = Provider.of<BrandingProvider>(context).primaryColor;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategoryId = id),
      child: Container(
        margin: EdgeInsets.only(right: 10),
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(color: isSelected ? primaryColor : Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(25), border: Border.all(color: isSelected ? primaryColor : Colors.white.withOpacity(0.1))),
        child: Text(label, style: TextStyle(color: isSelected ? Colors.white : Color(0xFF94A3B8), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final primaryColor = Provider.of<BrandingProvider>(context).primaryColor;
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (context) => ProductDetailScreen(product: product))),
      child: Container(
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(borderRadius: BorderRadius.vertical(top: Radius.circular(20)), color: Colors.white.withOpacity(0.02)),
                child: product.imageUrl != null 
                  ? ClipRRect(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                      child: CachedNetworkImage(
                        imageUrl: product.imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Center(child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor.withOpacity(0.3))),
                        errorWidget: (context, url, error) => Icon(Icons.broken_image_outlined, color: Colors.white10),
                      ),
                    ) 
                  : Center(child: Icon(Icons.coffee, size: 30, color: primaryColor.withOpacity(0.3))),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                Text(product.categoryName ?? "General", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                SizedBox(height: 6),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Expanded(child: FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(CurrencyFormat.convertToIdr(product.price, 0), style: GoogleFonts.outfit(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 14)))),
                  GestureDetector(
                    onTap: product.stock > 0 ? () {
                      Provider.of<CartProvider>(context, listen: false).addItem(product);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("${product.name} added!"), duration: Duration(seconds: 1)));
                    } : null,
                    child: Container(padding: EdgeInsets.all(4), decoration: BoxDecoration(color: product.stock > 0 ? primaryColor : Color(0xFF334155), borderRadius: BorderRadius.circular(8)), child: Icon(product.stock > 0 ? Icons.add : Icons.block_flipped, color: Colors.white, size: 18)),
                  )
                ]),
              ]),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildVoucherCard(String title, String desc, Color color) {
    return Container(
      width: 250,
      margin: EdgeInsets.only(right: 15),
      padding: EdgeInsets.all(15),
      decoration: BoxDecoration(gradient: LinearGradient(colors: [color, color.withOpacity(0.6)]), borderRadius: BorderRadius.circular(15)),
      child: Row(children: [
        Icon(Icons.confirmation_number_outlined, color: Colors.white, size: 40),
        SizedBox(width: 15),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(title, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          Text(desc, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 10)),
        ])),
      ]),
    );
  }

  Widget _buildSpecialPromo(String title, String subtitle, String imageUrl) {
    return Container(
      width: double.infinity,
      height: 150,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), image: DecorationImage(image: NetworkImage(imageUrl), fit: BoxFit.cover, colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.4), BlendMode.darken))),
      padding: EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
        Text(title, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 22)),
        Text(subtitle, style: TextStyle(color: Colors.white70, fontSize: 14)),
      ]),
    );
  }

  void _showBranchPicker(BuildContext context, BranchProvider branchProvider) {
    final brandingProvider = Provider.of<BrandingProvider>(context, listen: false);
    final primaryColor = brandingProvider.primaryColor;
    showModalBottomSheet(context: context, backgroundColor: brandingProvider.secondaryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(25))), builder: (context) => Container(padding: EdgeInsets.all(25), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text("Select Outlet", style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)), IconButton(onPressed: () async { await branchProvider.findNearestBranch(); if (mounted) { Provider.of<ProductProvider>(context, listen: false).loadData(branchId: branchProvider.selectedBranch?.id); Navigator.pop(context); }}, icon: Icon(Icons.my_location_rounded, color: primaryColor))]), SizedBox(height: 20), Flexible(child: ListView.builder(shrinkWrap: true, itemCount: branchProvider.branches.length, itemBuilder: (context, index) { final branch = branchProvider.branches[index]; bool isSelected = branchProvider.selectedBranch?.id == branch.id; return ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.store_rounded, color: isSelected ? primaryColor : Color(0xFF94A3B8)), title: Text(branch.name, style: TextStyle(color: isSelected ? Colors.white : Color(0xFF94A3B8), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)), trailing: isSelected ? Icon(Icons.check_circle, color: primaryColor) : null, onTap: () { branchProvider.selectBranch(branch); Provider.of<ProductProvider>(context, listen: false).loadData(branchId: branch.id); Navigator.pop(context); }); }))])));
  }

  void _showSwitchBrandDialog(BuildContext context, BrandingProvider brandingProvider) {
    showDialog(context: context, builder: (context) => AlertDialog(backgroundColor: Color(0xFF1E293B), title: Text("Switch Brand?", style: GoogleFonts.outfit(color: Colors.white)), content: Text("This will clear your current selection and return to the brand discovery ecosystem.", style: TextStyle(color: Color(0xFF94A3B8))), actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text("Cancel", style: TextStyle(color: Color(0xFF94A3B8)))), ElevatedButton(onPressed: () { brandingProvider.clearMerchant(); Navigator.pop(context); Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (context) => MerchantSelectionScreen())); }, style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent), child: Text("Switch", style: TextStyle(color: Colors.white)))]));
  }
}
