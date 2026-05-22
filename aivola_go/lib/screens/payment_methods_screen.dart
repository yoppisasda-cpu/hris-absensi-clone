import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/branding_provider.dart';

class PaymentMethodsScreen extends StatelessWidget {
  final List<Map<String, dynamic>> methods = [
    {
      "category": "Pembayaran Instan",
      "items": [
        {"name": "QRIS", "desc": "Gopay, OVO, ShopeePay, Dana, dll", "icon": Icons.qr_code_scanner_rounded, "color": Colors.pinkAccent},
      ]
    },
    {
      "category": "E-Wallet",
      "items": [
        {"name": "GoPay", "desc": "Saldo Gojek", "icon": Icons.account_balance_wallet_outlined, "color": Colors.blue},
        {"name": "OVO", "desc": "Saldo OVO", "icon": Icons.account_balance_wallet_outlined, "color": Colors.deepPurple},
        {"name": "ShopeePay", "desc": "Saldo Shopee", "icon": Icons.account_balance_wallet_outlined, "color": Colors.orange},
      ]
    },
    {
      "category": "Transfer Bank (Virtual Account)",
      "items": [
        {"name": "BCA Virtual Account", "desc": "Verifikasi otomatis", "icon": Icons.account_balance_rounded, "color": Colors.blue.shade900},
        {"name": "Mandiri Virtual Account", "desc": "Verifikasi otomatis", "icon": Icons.account_balance_rounded, "color": Colors.yellow.shade800},
        {"name": "BNI Virtual Account", "desc": "Verifikasi otomatis", "icon": Icons.account_balance_rounded, "color": Colors.orange.shade900},
      ]
    }
  ];

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: Color(0xFF1E293B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Metode Pembayaran", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView.builder(
        padding: EdgeInsets.all(25),
        itemCount: methods.length,
        itemBuilder: (context, index) {
          final group = methods[index];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 5, bottom: 15, top: 10),
                child: Text(group['category'], style: GoogleFonts.outfit(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1)),
              ),
              ...group['items'].map<Widget>((item) => _buildMethodItem(item, primaryColor)).toList(),
              SizedBox(height: 20),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMethodItem(Map<String, dynamic> item, Color primaryColor) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: ListTile(
        contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 5),
        leading: Container(
          padding: EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: item['color'].withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(item['icon'], color: item['color'], size: 24),
        ),
        title: Text(item['name'], style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        subtitle: Text(item['desc'], style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
        trailing: Icon(Icons.chevron_right_rounded, color: Color(0xFF334155)),
        onTap: () {},
      ),
    );
  }
}
