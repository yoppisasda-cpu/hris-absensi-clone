import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/branding_provider.dart';
import 'order_history_screen.dart';
import 'edit_profile_screen.dart';
import 'inbox_screen.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _userName = "Coffee Lover";
  String _userEmail = "customer@aivola.id";
  String? _userAvatar;
  int _points = 2450;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userName = prefs.getString('userName') ?? "Coffee Lover";
      _userEmail = "customer@aivola.id"; 
      _userAvatar = prefs.getString('userAvatar');
    });
  }

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return SingleChildScrollView(
      child: Column(
        children: [
          _buildHeader(primaryColor),
          _buildLoyaltyCard(primaryColor),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10),
            child: Column(
              children: [
                _buildMenuSection("Aktivitas Saya", [
                  _buildMenuItem(Icons.shopping_bag_outlined, "Riwayat Pesanan", "Pantau semua pesanan Anda", () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => OrderHistoryScreen()));
                  }),
                  _buildMenuItem(Icons.inbox_outlined, "Kotak Masuk", "Pesan dan promo terbaru", () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => InboxScreen()));
                  }),
                ]),
                SizedBox(height: 25),
                _buildMenuSection("Pengaturan Akun", [
                  _buildMenuItem(Icons.person_outline_rounded, "Edit Profil", "Ubah nama, email, dan telepon", () async {
                    final updated = await Navigator.push(context, MaterialPageRoute(builder: (context) => EditProfileScreen()));
                    if (updated == true) _loadUserData();
                  }),
                  _buildMenuItem(Icons.location_on_outlined, "Alamat Saya", "Kelola alamat pengiriman", () {}),
                  _buildMenuItem(Icons.lock_outline_rounded, "Keamanan & Password", "Ubah kata sandi akun", () {}),
                ]),
                SizedBox(height: 25),
                _buildMenuSection("Dukungan", [
                  _buildMenuItem(Icons.help_outline_rounded, "Pusat Bantuan", "Tanya jawab dan bantuan", () {}),
                  _buildMenuItem(Icons.info_outline_rounded, "Tentang Aivola GO", "Versi 1.0.7", () {}),
                ]),
                SizedBox(height: 40),
                _buildLogoutButton(context),
                SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(Color primaryColor) {
    return Container(
      padding: EdgeInsets.fromLTRB(25, 60, 25, 40),
      decoration: BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(30)),
      ),
      child: Row(
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: primaryColor, width: 2),
              image: DecorationImage(
                image: (_userAvatar != null && _userAvatar!.isNotEmpty)
                    ? CachedNetworkImageProvider(
                        _userAvatar!.startsWith('http') 
                            ? _userAvatar! 
                            : "http://10.0.2.2:5000${_userAvatar!}"
                      )
                    : NetworkImage("https://ui-avatars.com/api/?name=$_userName&background=random") as ImageProvider,
                fit: BoxFit.cover,
              ),
            ),
          ),
          SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_userName, style: GoogleFonts.outfit(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                Text(_userEmail, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.settings_outlined, color: Colors.white),
            onPressed: () async {
              final updated = await Navigator.push(context, MaterialPageRoute(builder: (context) => EditProfileScreen()));
              if (updated == true) _loadUserData();
            },
          )
        ],
      ),
    );
  }

  Widget _buildLoyaltyCard(Color primaryColor) {
    return Transform.translate(
      offset: Offset(0, -25),
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 20),
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [primaryColor, primaryColor.withOpacity(0.8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: primaryColor.withOpacity(0.3), blurRadius: 15, offset: Offset(0, 8)),
          ],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Total Poin", style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                    SizedBox(height: 4),
                    Text("$_points Poin", style: GoogleFonts.outfit(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                  ],
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      Icon(Icons.stars_rounded, color: Colors.white, size: 16),
                      SizedBox(width: 6),
                      Text("Gold Member", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                )
              ],
            ),
            Divider(color: Colors.white.withOpacity(0.2), height: 30),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildLoyaltyAction(Icons.confirmation_number_outlined, "Voucher Saya"),
                _buildLoyaltyAction(Icons.history_rounded, "Riwayat Poin"),
                _buildLoyaltyAction(Icons.qr_code_2_rounded, "ID Member"),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildLoyaltyAction(IconData icon, String label) {
    return InkWell(
      onTap: () {},
      child: Column(
        children: [
          Icon(icon, color: Colors.white.withOpacity(0.9), size: 22),
          SizedBox(height: 6),
          Text(label, style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildMenuSection(String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Column(children: items),
        ),
      ],
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return ListTile(
      onTap: onTap,
      contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 5),
      leading: Container(
        padding: EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: Colors.white70, size: 22),
      ),
      title: Text(title, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(subtitle, style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
      trailing: Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF334155), size: 14),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        onPressed: () async {
          final prefs = await SharedPreferences.getInstance();
          await prefs.clear();
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
        },
        style: TextButton.styleFrom(
          padding: EdgeInsets.symmetric(vertical: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15), side: BorderSide(color: Colors.redAccent.withOpacity(0.3))),
        ),
        child: Text("Keluar Akun", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
