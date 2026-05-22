import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/branding_provider.dart';
import '../services/api_service.dart';

class SecurityScreen extends StatefulWidget {
  @override
  _SecurityScreenState createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  final _oldPasswordCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();
  bool _isLoading = false;
  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  Future<void> _changePassword(Color primaryColor) async {
    final oldPass = _oldPasswordCtrl.text;
    final newPass = _newPasswordCtrl.text;
    final confirmPass = _confirmPasswordCtrl.text;

    if (oldPass.isEmpty || newPass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Semua field wajib diisi")));
      return;
    }

    if (newPass != confirmPass) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Konfirmasi password tidak sesuai")));
      return;
    }

    if (newPass.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Password baru minimal 6 karakter")));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final res = await ApiService.patch('/auth/change-password', {
        "oldPassword": oldPass,
        "newPassword": newPass,
      });

      if (res.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text("Password berhasil diperbarui"),
          backgroundColor: Colors.green,
        ));
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res.data['error'] ?? "Gagal memperbarui password"),
          backgroundColor: Colors.redAccent,
        ));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Koneksi gagal")));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: Color(0xFF1E293B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Keamanan & Password", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(25),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: primaryColor.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: primaryColor.withOpacity(0.1)),
              ),
              child: Row(
                children: [
                  Icon(Icons.shield_outlined, color: primaryColor, size: 30),
                  SizedBox(width: 15),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Lindungi Akun Anda", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text("Gunakan password yang kuat dan unik untuk keamanan ekstra.", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      ],
                    ),
                  )
                ],
              ),
            ),
            SizedBox(height: 35),
            _buildPasswordField("Password Saat Ini", _oldPasswordCtrl, _obscureOld, () => setState(() => _obscureOld = !_obscureOld)),
            _buildPasswordField("Password Baru", _newPasswordCtrl, _obscureNew, () => setState(() => _obscureNew = !_obscureNew)),
            _buildPasswordField("Konfirmasi Password Baru", _confirmPasswordCtrl, _obscureConfirm, () => setState(() => _obscureConfirm = !_obscureConfirm)),
            SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : () => _changePassword(primaryColor),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  padding: EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  elevation: 0,
                ),
                child: _isLoading 
                  ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text("Perbarui Password", style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordField(String label, TextEditingController ctrl, bool obscure, VoidCallback onToggle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 25.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w500)),
          SizedBox(height: 10),
          TextField(
            controller: ctrl,
            obscureText: obscure,
            style: TextStyle(color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
              contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 18),
              suffixIcon: IconButton(
                icon: Icon(obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Color(0xFF64748B), size: 20),
                onPressed: onToggle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
