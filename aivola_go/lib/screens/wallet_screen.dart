import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/branding_provider.dart';

class WalletScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildBalanceCard(primaryColor),
          SizedBox(height: 30),
          _buildActionGrid(primaryColor),
          SizedBox(height: 30),
          _buildLoyaltySection(primaryColor),
          SizedBox(height: 30),
          _buildRecentTransactions(),
        ],
      ),
    );
  }

  Widget _buildBalanceCard(Color primaryColor) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(25),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [primaryColor, primaryColor.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(25),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withOpacity(0.3),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Aivola Pay Balance", style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
              Icon(Icons.wifi_tethering, color: Colors.white.withOpacity(0.5)),
            ],
          ),
          SizedBox(height: 10),
          Text("Rp 1.250.000", style: GoogleFonts.outfit(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          SizedBox(height: 30),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("**** **** **** 4252", style: TextStyle(color: Colors.white.withOpacity(0.6), letterSpacing: 2)),
              Text("05/28", style: TextStyle(color: Colors.white.withOpacity(0.6))),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildActionGrid(Color primaryColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildActionItem(Icons.add_circle_outline, "Top Up", primaryColor),
        _buildActionItem(Icons.send_outlined, "Transfer", primaryColor),
        _buildActionItem(Icons.qr_code_scanner_rounded, "Scan QR", primaryColor),
        _buildActionItem(Icons.history, "History", primaryColor),
      ],
    );
  }

  Widget _buildActionItem(IconData icon, String label, Color primaryColor) {
    return Column(
      children: [
        Container(
          padding: EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
        SizedBox(height: 10),
        Text(label, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
      ],
    );
  }

  Widget _buildLoyaltySection(Color primaryColor) {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.orangeAccent.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.orangeAccent.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.orangeAccent.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(Icons.stars_rounded, color: Colors.orangeAccent, size: 30),
          ),
          SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Membership Points", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                Text("2,450 Points", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          TextButton(
            onPressed: () {},
            child: Text("Redeem", style: TextStyle(color: Colors.orangeAccent, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  Widget _buildRecentTransactions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Recent Transactions", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        SizedBox(height: 15),
        _buildTransactionItem("Coffee Order #8821", "- Rp 45.000", "Yesterday", Icons.shopping_bag_outlined, Colors.redAccent),
        _buildTransactionItem("Top Up via Bank Transfer", "+ Rp 500.000", "28 Apr", Icons.account_balance_wallet_outlined, Colors.greenAccent),
        _buildTransactionItem("Voucher Cashback", "+ Rp 5.000", "27 Apr", Icons.confirmation_number_outlined, Colors.orangeAccent),
      ],
    );
  }

  Widget _buildTransactionItem(String title, String amount, String date, IconData icon, Color amountColor) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: Colors.white70, size: 20),
          ),
          SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500, fontSize: 14)),
                Text(date, style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              ],
            ),
          ),
          Text(amount, style: TextStyle(color: amountColor, fontWeight: FontWeight.bold, fontSize: 14)),
        ],
      ),
    );
  }
}
