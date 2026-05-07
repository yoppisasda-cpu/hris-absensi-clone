import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../providers/branding_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

class MyVouchersScreen extends StatefulWidget {
  @override
  _MyVouchersScreenState createState() => _MyVouchersScreenState();
}

class _MyVouchersScreenState extends State<MyVouchersScreen> {
  List<dynamic> _vouchers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  Future<void> _loadVouchers() async {
    // We already have vouchers in BrandingProvider, but we can also fetch claimed ones to mark them
    final claimedData = await ApiService.fetchClaimedVouchers();
    final brandingProvider = Provider.of<BrandingProvider>(context, listen: false);
    
    setState(() {
      _vouchers = brandingProvider.vouchers.map((v) {
        // Check if this voucher is already claimed
        bool isClaimed = claimedData.any((c) => c['id'] == v.id);
        return {
          ...v.toJson(),
          'isClaimed': isClaimed
        };
      }).toList();
      _isLoading = false;
    });
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
          : _vouchers.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: EdgeInsets.all(20),
                  itemCount: _vouchers.length,
                  itemBuilder: (context, index) {
                    final v = _vouchers[index];
                    return _buildVoucherCard(v, primaryColor);
                  },
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
          Text("Belum ada voucher", style: TextStyle(color: Colors.white70, fontSize: 16)),
          Text("Klaim voucher di halaman utama", style: TextStyle(color: Colors.white38, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildVoucherCard(dynamic v, Color primaryColor) {
    final currencyFormat = NumberFormat.currency(locale: 'id', symbol: 'Rp', decimalDigits: 0);
    String discountLabel = v['discountType'] == 'PERCENTAGE' 
        ? "${v['discountValue']}% OFF" 
        : currencyFormat.format(v['discountValue']);

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
                width: 100,
                color: primaryColor.withOpacity(0.1),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(discountLabel, style: GoogleFonts.outfit(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 18), textAlign: TextAlign.center),
                    Text("Promo", style: TextStyle(color: primaryColor.withOpacity(0.6), fontSize: 10)),
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
                      Text("Min. belanja ${currencyFormat.format(v['minPurchase'])}", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Berlaku s/d ${v['validUntil'] != null ? DateFormat('dd MMM yyyy').format(DateTime.parse(v['validUntil'])) : 'Selesai'}", style: TextStyle(color: Colors.orangeAccent.withOpacity(0.8), fontSize: 10)),
                          if (v['isClaimed'] == true)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: Colors.greenAccent.withOpacity(0.1), borderRadius: BorderRadius.circular(5)),
                              child: Text("DIKLAIM", style: TextStyle(color: Colors.greenAccent, fontSize: 8, fontWeight: FontWeight.bold)),
                            )
                          else
                            Icon(Icons.arrow_forward_rounded, color: Colors.white24, size: 16),
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
