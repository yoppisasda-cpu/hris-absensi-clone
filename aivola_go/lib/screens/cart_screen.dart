import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../providers/cart_provider.dart';
import '../providers/branch_provider.dart';
import '../providers/branding_provider.dart';
import '../services/api_service.dart';
import '../models/voucher.dart';

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

class CartScreen extends StatefulWidget {
  @override
  _CartScreenState createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  String _deliveryMethod = "Dine-in"; // Default
  String _paymentMethod = "Bayar di Kasir"; // Default
  List<Voucher> _claimedVouchers = [];
  bool _loadingVouchers = false;

  @override
  void initState() {
    super.initState();
    _fetchClaimedVouchers();
  }

  Future<void> _fetchClaimedVouchers() async {
    setState(() => _loadingVouchers = true);
    try {
      final data = await ApiService.fetchClaimedVouchers();
      setState(() {
        _claimedVouchers = data.map((v) => Voucher.fromJson(v)).toList();
      });
    } catch (e) {
      print("Error fetching vouchers: $e");
    } finally {
      setState(() => _loadingVouchers = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: brandingProvider.secondaryColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Checkout", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: cartProvider.items.isEmpty
          ? _buildEmptyState(context)
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: EdgeInsets.all(20),
                    children: [
                      _buildSectionTitle("Pesanan Anda"),
                      ...cartProvider.items.values.map((item) => _buildCartItem(item, cartProvider, primaryColor)).toList(),
                      SizedBox(height: 20),
                      _buildSectionTitle("Metode Pengambilan"),
                      _buildDeliveryOptions(primaryColor),
                      SizedBox(height: 25),
                      _buildPointsRedemption(cartProvider, primaryColor),
                      SizedBox(height: 25),
                      _buildVoucherSelector(cartProvider, brandingProvider, primaryColor),
                      SizedBox(height: 25),
                      _buildSectionTitle("Metode Pembayaran"),
                      _buildPaymentOptions(primaryColor),
                    ],
                  ),
                ),
                _buildSummaryPanel(cartProvider, brandingProvider, primaryColor),
              ],
            ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.shopping_cart_outlined, size: 80, color: Color(0xFF94A3B8).withOpacity(0.3)),
          SizedBox(height: 20),
          Text("Keranjang belanja kosong", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 16)),
          SizedBox(height: 30),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: Text("Cari Menu Sekarang", style: TextStyle(color: Colors.white)),
          )
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Text(title, style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildCartItem(CartItem item, CartProvider cartProvider, Color primaryColor) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: primaryColor.withOpacity(0.1)),
            child: item.product.imageUrl != null
                ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(item.product.imageUrl!, fit: BoxFit.cover))
                : Icon(Icons.coffee, color: primaryColor),
          ),
          SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.product.name, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                Text(CurrencyFormat.convertToIdr(item.product.price, 0), style: TextStyle(color: primaryColor, fontSize: 12)),
              ],
            ),
          ),
          Row(
            children: [
              _buildQtyBtn(Icons.remove, () => cartProvider.decrementItem(item.product.id)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10.0),
                child: Text("${item.quantity}", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              _buildQtyBtn(Icons.add, () => cartProvider.addItem(item.product)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildDeliveryOptions(Color primaryColor) {
    return Row(
      children: [
        _buildOptionChip("Dine-in", Icons.restaurant, primaryColor),
        SizedBox(width: 10),
        _buildOptionChip("Take-away", Icons.shopping_bag, primaryColor),
      ],
    );
  }

  Widget _buildOptionChip(String label, IconData icon, Color primaryColor) {
    bool isSelected = _deliveryMethod == label;
    return GestureDetector(
      onTap: () => setState(() => _deliveryMethod = label),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? primaryColor : Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? Colors.white : Color(0xFF94A3B8), size: 18),
            SizedBox(width: 8),
            Text(label, style: TextStyle(color: isSelected ? Colors.white : Color(0xFF94A3B8), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }  Widget _buildPointsRedemption(CartProvider cartProvider, Color primaryColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle("Loyalty Points"),
        Container(
          padding: EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: Colors.blueAccent.withOpacity(0.05),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: Colors.blueAccent.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.blueAccent.withOpacity(0.1), shape: BoxShape.circle),
                child: Icon(Icons.stars_rounded, color: Colors.blueAccent, size: 20),
              ),
              SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Gunakan ${cartProvider.availablePoints} Poin", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    Text("Hemat ${CurrencyFormat.convertToIdr(cartProvider.availablePoints, 0)}", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ],
                ),
              ),
              Switch(
                value: cartProvider.isUsingPoints,
                onChanged: (val) => cartProvider.toggleUsingPoints(val),
                activeColor: Colors.blueAccent,
                activeTrackColor: Colors.blueAccent.withOpacity(0.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVoucherSelector(CartProvider cartProvider, BrandingProvider brandingProvider, Color primaryColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle("Voucher Promo"),
        GestureDetector(
          onTap: () => _showVoucherPicker(context, cartProvider, brandingProvider),
          child: Container(
            padding: EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: Colors.orangeAccent.withOpacity(0.05),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: Colors.orangeAccent.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                Icon(Icons.confirmation_number_outlined, color: Colors.orangeAccent),
                SizedBox(width: 15),
                Expanded(
                  child: Text(
                    cartProvider.selectedVoucher != null ? "Voucher: ${cartProvider.selectedVoucher!.code}" : "Pilih atau masukkan voucher",
                    style: TextStyle(color: cartProvider.selectedVoucher != null ? Colors.white : Color(0xFF94A3B8)),
                  ),
                ),
                Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF94A3B8), size: 16),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showVoucherPicker(BuildContext context, CartProvider cartProvider, BrandingProvider brandingProvider) {
    final primaryColor = brandingProvider.primaryColor;
    showModalBottomSheet(
      context: context,
      backgroundColor: brandingProvider.secondaryColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(25))),
      builder: (context) => Container(
        padding: EdgeInsets.all(25),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Voucher Tersedia", style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 20),
            if (brandingProvider.vouchers.isEmpty)
              Center(child: Text("Tidak ada voucher tersedia saat ini", style: TextStyle(color: Color(0xFF94A3B8))))
            else
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: brandingProvider.vouchers.length,
                  itemBuilder: (context, index) {
                    final v = brandingProvider.vouchers[index];
                    bool isEligible = cartProvider.subtotal >= v.minPurchase;
                    bool isSelected = cartProvider.selectedVoucher?.id == v.id;
                    
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.stars_rounded, color: isEligible ? Colors.orangeAccent : Color(0xFF334155)),
                      title: Text(v.code, style: TextStyle(color: isEligible ? Colors.white : Color(0xFF64748B), fontWeight: FontWeight.bold)),
                      subtitle: Text(
                        "Min. belanja ${CurrencyFormat.convertToIdr(v.minPurchase, 0)}",
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      ),
                      trailing: isSelected 
                        ? Icon(Icons.check_circle, color: Colors.greenAccent)
                        : (isEligible ? Text("PAKAI", style: TextStyle(color: brandingProvider.primaryColor, fontWeight: FontWeight.bold)) : null),
                      onTap: isEligible ? () {
                        cartProvider.selectVoucher(v);
                        Navigator.pop(context);
                      } : null,
                    );
                  },
                ),
              ),
            if (cartProvider.selectedVoucher != null) ...[
              SizedBox(height: 10),
              TextButton(
                onPressed: () {
                  cartProvider.selectVoucher(null);
                  Navigator.pop(context);
                },
                child: Center(child: Text("Hapus Voucher", style: TextStyle(color: Colors.redAccent))),
              )
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryPanel(CartProvider cartProvider, BrandingProvider brandingProvider, Color primaryColor) {
    return Container(
      padding: EdgeInsets.all(25),
      decoration: BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, offset: Offset(0, -5))],
      ),
      child: Column(
        children: [
          _buildSummaryRow("Subtotal", CurrencyFormat.convertToIdr(cartProvider.subtotal, 0), Colors.white70),
          if (cartProvider.discountAmount > 0)
            _buildSummaryRow("Diskon Promo", "- ${CurrencyFormat.convertToIdr(cartProvider.discountAmount, 0)}", Colors.orangeAccent),
          if (cartProvider.isUsingPoints)
            _buildSummaryRow("Diskon Poin", "- ${CurrencyFormat.convertToIdr(cartProvider.pointsDiscount, 0)}", Colors.blueAccent),
          _buildSummaryRow("Biaya Layanan", "Rp0", Colors.greenAccent),
          Divider(color: Colors.white.withOpacity(0.05), height: 30),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Total Bayar", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
              Text(CurrencyFormat.convertToIdr(cartProvider.totalAmount, 0), style: GoogleFonts.outfit(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 24)),
            ],
          ),
          SizedBox(height: 25),
          SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton(
              onPressed: () => _handleCheckout(cartProvider, primaryColor),
              style: ElevatedButton.styleFrom(backgroundColor: primaryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)), elevation: 0),
              child: Text("BAYAR SEKARANG", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Color(0xFF94A3B8))),
          Text(value, style: TextStyle(color: valueColor, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Future<void> _handleCheckout(CartProvider cartProvider, Color primaryColor) async {
    showDialog(context: context, barrierDismissible: false, builder: (context) => Center(child: CircularProgressIndicator(color: primaryColor)));

    final items = cartProvider.items.values.map((item) => {"productId": item.product.id, "quantity": item.quantity, "price": item.product.price}).toList();
    final branchProvider = Provider.of<BranchProvider>(context, listen: false);
    final prefs = await SharedPreferences.getInstance();
    final customerId = prefs.getInt('userId');

    final success = await ApiService.createOrder(
      items: items,
      customerId: customerId,
      branchId: branchProvider.selectedBranch?.id,
      voucherId: cartProvider.selectedVoucher?.id, 
      deliveryMethod: _deliveryMethod,
      paymentMethod: _paymentMethod,
      pointsUsed: cartProvider.isUsingPoints ? cartProvider.availablePoints : 0,
    );

    Navigator.pop(context); // Close loading

    if (success) {
      cartProvider.clearCart();
      _showSuccessDialog(primaryColor);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Gagal memproses pesanan. Silakan coba lagi."), backgroundColor: Colors.redAccent));
    }
  }

  void _showSuccessDialog(Color primaryColor) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
        title: Column(children: [Icon(Icons.hourglass_empty_rounded, color: Colors.orangeAccent, size: 70), SizedBox(height: 20), Text("Pesanan Terkirim!", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))]),
        content: Text("Pesanan Anda sedang menunggu konfirmasi dari Toko. Mohon tunggu notifikasi selanjutnya ya!", textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8))),
        actions: [Center(child: TextButton(onPressed: () { Navigator.pop(context); Navigator.pop(context); }, child: Text("OK", style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 18))))],
      ),
    );
  }

  Widget _buildQtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(6),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: Icon(icon, color: Colors.white, size: 16),
      ),
    );
  }

  Widget _buildPaymentOptions(Color primaryColor) {
    return Column(
      children: [
        _buildPaymentItem("Bayar di Kasir", Icons.payments_outlined, primaryColor),
        SizedBox(height: 10),
        _buildPaymentItem("Transfer Bank", Icons.account_balance_outlined, primaryColor),
        SizedBox(height: 10),
        _buildPaymentItem("QRIS", Icons.qr_code_scanner_rounded, primaryColor),
      ],
    );
  }

  Widget _buildPaymentItem(String label, IconData icon, Color primaryColor) {
    bool isSelected = _paymentMethod == label;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = label),
      child: Container(
        padding: EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withOpacity(0.1) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: isSelected ? primaryColor : Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? primaryColor : Color(0xFF94A3B8)),
            SizedBox(width: 15),
            Text(label, style: TextStyle(color: isSelected ? Colors.white : Color(0xFF94A3B8), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
            Spacer(),
            if (isSelected) Icon(Icons.check_circle, color: primaryColor, size: 20),
          ],
        ),
      ),
    );
  }
}
