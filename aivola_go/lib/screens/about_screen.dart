import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/branding_provider.dart';
import 'content_screen.dart';

class AboutScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: Color(0xFF1E293B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Tentang Aivola GO", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: 40),
            Center(
              child: Container(
                width: 120,
                height: 120,
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(color: primaryColor.withOpacity(0.3), blurRadius: 20, offset: Offset(0, 10))
                  ]
                ),
                child: Image.network(
                  brandingProvider.logoUrl ?? "",
                  errorBuilder: (_, __, ___) => Icon(Icons.shopping_bag_rounded, color: primaryColor, size: 50),
                ),
              ),
            ),
            SizedBox(height: 25),
            Text("Aivola GO", style: GoogleFonts.outfit(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            Text("Versi 1.0.7", style: TextStyle(color: Color(0xFF94A3B8))),
            SizedBox(height: 40),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 30.0),
              child: Text(
                "Aivola GO adalah platform ekosistem bisnis modern yang menghubungkan pelanggan dengan berbagai brand favorit dalam satu aplikasi. Temukan promo menarik, kumpulkan poin, dan nikmati kemudahan bertransaksi.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, height: 1.6, fontSize: 14),
              ),
            ),
            SizedBox(height: 50),
            _buildListTile(Icons.description_outlined, "Syarat & Ketentuan", primaryColor, () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => ContentScreen(
                title: "Syarat & Ketentuan",
                content: "1. Penggunaan Aplikasi\nDengan menggunakan Aivola GO, Anda setuju untuk mematuhi seluruh aturan yang berlaku...\n\n2. Akun Pengguna\nAnda bertanggung jawab penuh atas keamanan akun dan password Anda...\n\n3. Transaksi\nSeluruh transaksi yang sudah berhasil tidak dapat dibatalkan kecuali terjadi kesalahan pada sistem kami.",
              )));
            }),
            _buildListTile(Icons.privacy_tip_outlined, "Kebijakan Privasi", primaryColor, () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => ContentScreen(
                title: "Kebijakan Privasi",
                content: "Kami menghargai privasi Anda. Data yang kami kumpulkan hanya digunakan untuk meningkatkan layanan kami kepada Anda...\n\nKami tidak akan membagikan data pribadi Anda kepada pihak ketiga tanpa izin tertulis dari Anda.",
              )));
            }),
            _buildListTile(Icons.star_outline_rounded, "Beri Rating Aplikasi", primaryColor, () {}),
            SizedBox(height: 60),
            Text("© 2026 Aivola Indonesia. All Rights Reserved.", style: TextStyle(color: Color(0xFF475569), fontSize: 12)),
            SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildListTile(IconData icon, String title, Color primaryColor, VoidCallback onTap) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 25, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(15),
      ),
      child: ListTile(
        leading: Icon(icon, color: primaryColor),
        title: Text(title, style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
        trailing: Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
        onTap: onTap,
      ),
    );
  }
}
