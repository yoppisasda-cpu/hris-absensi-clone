import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../providers/branding_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'login_screen.dart';

class MyVouchersScreen extends StatefulWidget {
  @override
  _MyVouchersScreenState createState() => _MyVouchersScreenState();
}

class _MyVouchersScreenState extends State<MyVouchersScreen> {
  List<dynamic> _vouchers = [];
  bool _isLoading = true;
  bool _isGuest = false;

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  Future<void> _loadVouchers() async {
    setState(() => _isLoading = true);

    final token = await ApiService.getToken();
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _isGuest = true;
          _vouchers = [];
          _isLoading = false;
        });
      }
      return;
    }

    // Only show vouchers claimed by this user
    final claimedData = await ApiService.fetchClaimedVouchers();
    if (mounted) {
      setState(() {
        _isGuest = false;
        _vouchers = claimedData;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: brandingProvider.secondaryColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Voucher Saya", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : _isGuest
              ? _buildGuestState(primaryColor)
              : _vouchers.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      color: primaryColor,
                      onRefresh: _loadVouchers,
                      child: ListView.builder(
                        padding: EdgeInsets.all(20),
                        itemCount: _vouchers.length,
                        itemBuilder: (context, index) {
                          final v = _vouchers[index];
                          return _buildVoucherCard(v, primaryColor);
                        },
                      ),
                    ),
    );
  }

  Widget _buildGuestState(Color primaryColor) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Icon(Icons.lock_outline_rounded, size: 64, color: Colors.white54),
            ),
            SizedBox(height: 24),
            Text(
              "Belum Masuk Akun",
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),
            Text(
              "Masuk ke akun Anda untuk melihat voucher yang sudah Anda klaim dan menikmati berbagai diskon menarik.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.5),
            ),
            SizedBox(height: 28),
            ElevatedButton(
              onPressed: () async {
                await Navigator.push(context, MaterialPageRoute(builder: (context) => LoginScreen()));
                _loadVouchers();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                padding: EdgeInsets.symmetric(horizontal: 36, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: Text("Masuk / Daftar", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.confirmation_number_outlined, size: 80, color: Colors.white10),
          SizedBox(height: 20),
          Text("Belum Ada Voucher Diklaim", style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          SizedBox(height: 6),
          Text("Klaim voucher promo di halaman beranda", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildVoucherCard(dynamic v, Color primaryColor) {
    final currencyFormat = NumberFormat.currency(locale: 'id', symbol: 'Rp', decimalDigits: 0);
    String discountLabel = v['discountType'] == 'PERCENTAGE' 
        ? "${v['discountValue']}% OFF" 
        : currencyFormat.format(v['discountValue'] ?? 0);

    return Container(
      margin: EdgeInsets.only(bottom: 15),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: IntrinsicHeight(
          child: Row(
            children: [
              Container(
                width: 105,
                color: primaryColor.withOpacity(0.12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(discountLabel, style: GoogleFonts.outfit(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 18), textAlign: TextAlign.center),
                    SizedBox(height: 2),
                    Text("Promo", style: TextStyle(color: primaryColor.withOpacity(0.7), fontSize: 10)),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(15.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(v['code'] ?? "PROMO CODE", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      SizedBox(height: 5),
                      Text("Min. belanja ${currencyFormat.format(v['minPurchase'] ?? 0)}", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Berlaku s/d ${v['validUntil'] != null ? DateFormat('dd MMM yyyy').format(DateTime.parse(v['validUntil'])) : 'Selesai'}", 
                            style: TextStyle(color: Colors.orangeAccent.withOpacity(0.85), fontSize: 10)
                          ),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: Colors.greenAccent.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                            child: Text("DIKLAIM", style: TextStyle(color: Colors.greenAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                          )
                        ],
                      )
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
