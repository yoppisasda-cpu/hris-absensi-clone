import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/branding_provider.dart';

class HelpCenterScreen extends StatelessWidget {
  final List<Map<String, String>> faqs = [
    {
      "q": "Bagaimana cara memesan?",
      "a": "Pilih menu favorit Anda, tambahkan ke keranjang, lalu lakukan checkout. Anda bisa memilih untuk ambil di tempat atau pengiriman."
    },
    {
      "q": "Bagaimana cara menggunakan poin?",
      "a": "Poin akan terkumpul secara otomatis setiap kali Anda melakukan transaksi. Poin dapat digunakan sebagai potongan harga saat checkout."
    },
    {
      "q": "Metode pembayaran apa saja yang tersedia?",
      "a": "Kami mendukung berbagai pembayaran digital (QRIS, E-Wallet) dan pembayaran tunai saat pengambilan di toko."
    },
    {
      "q": "Bagaimana jika pesanan saya bermasalah?",
      "a": "Jangan khawatir, Anda bisa langsung menghubungi tim bantuan kami melalui tombol WhatsApp di bawah ini."
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
        title: Text("Pusat Bantuan", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.all(25),
        children: [
          Text("Pertanyaan Sering Diajukan", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 20),
          ...faqs.map((faq) => _buildFaqItem(faq['q']!, faq['a']!, primaryColor)).toList(),
        ],
      ),
    );
  }

  Widget _buildFaqItem(String q, String a, Color primaryColor) {
    return Container(
      margin: EdgeInsets.only(bottom: 15),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: ExpansionTile(
        title: Text(q, style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
        iconColor: primaryColor,
        collapsedIconColor: Colors.white70,
        childrenPadding: EdgeInsets.only(left: 20, right: 20, bottom: 20),
        children: [
          Text(a, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }
}
