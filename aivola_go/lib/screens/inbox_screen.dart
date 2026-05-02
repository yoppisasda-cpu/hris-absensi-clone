import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/branding_provider.dart';

class InboxScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: brandingProvider.secondaryColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Kotak Masuk", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.all(20),
        children: [
          _buildNotificationItem(
            context,
            "Promo Spesial",
            "Diskon 50% khusus untukmu! Gunakan kode promo MAKANHEMAT hari ini.",
            "Baru saja",
            Icons.local_offer_outlined,
            Colors.orangeAccent,
            isUnread: true,
          ),
          _buildNotificationItem(
            context,
            "Status Pesanan",
            "Pesanan #SLS/2026/04/ID1-0UA0 telah selesai. Terima kasih sudah mampir!",
            "1 jam yang lalu",
            Icons.check_circle_outline_rounded,
            Colors.greenAccent,
          ),
          _buildNotificationItem(
            context,
            "Loyalty Point",
            "Selamat! Kamu mendapatkan 85 poin dari pesanan terakhirmu.",
            "Kemarin",
            Icons.stars_rounded,
            Colors.blueAccent,
          ),
          _buildNotificationItem(
            context,
            "Sistem Update",
            "Kami melakukan pembaruan sistem untuk meningkatkan kenyamanan Anda berbelanja.",
            "2 hari yang lalu",
            Icons.system_update_alt_rounded,
            Colors.purpleAccent,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(
    BuildContext context,
    String title,
    String message,
    String time,
    IconData icon,
    Color iconColor, {
    bool isUnread = false,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 15),
      padding: EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: isUnread ? Colors.white.withOpacity(0.08) : Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isUnread ? iconColor.withOpacity(0.3) : Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(color: iconColor.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(title, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    Text(time, style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  ],
                ),
                SizedBox(height: 5),
                Text(
                  message,
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                ),
              ],
            ),
          ),
          if (isUnread)
            Container(
              margin: EdgeInsets.only(left: 10, top: 5),
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: iconColor, shape: BoxShape.circle),
            )
        ],
      ),
    );
  }
}
