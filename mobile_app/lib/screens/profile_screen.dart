import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _userProfile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final profile = await _apiService.getMyFullProfile();
      setState(() {
        _userProfile = profile;
        _isLoading = false;
      });
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Gagal mengambil profil: $e')));
      setState(() => _isLoading = false);
    }
  }

  void _showChangePasswordDialog() {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ubah Kata Sandi'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: oldPasswordController,
              decoration: InputDecoration(labelText: 'Kata Sandi Lama'),
              obscureText: true,
            ),
            TextField(
              controller: newPasswordController,
              decoration: InputDecoration(labelText: 'Kata Sandi Baru'),
              obscureText: true,
            ),
            TextField(
              controller: confirmPasswordController,
              decoration: InputDecoration(labelText: 'Konfirmasi Kata Sandi'),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (newPasswordController.text !=
                  confirmPasswordController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Konfirmasi password tidak cocok')),
                );
                return;
              }
              if (newPasswordController.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Password minimal 6 karakter')),
                );
                return;
              }
              try {
                final success = await _apiService.changePassword(
                  oldPasswordController.text,
                  newPasswordController.text,
                );
                if (success) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Password berhasil diubah')),
                  );
                }
              } catch (e) {
                final msg = e.toString().replaceFirst('Exception: ', '');
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('Gagal: $msg')));
              }
            },
            child: Text('Simpan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Profil Saya', style: TextStyle(color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchProfile,
              child: SingleChildScrollView(
                physics: AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 50,
                            backgroundColor: Colors.blue[600],
                            child: Text(
                              auth.userName?[0] ?? '?',
                              style: TextStyle(
                                fontSize: 40,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            _userProfile?['name'] ?? auth.userName,
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            _userProfile?['jobTitle'] ?? 'Karyawan',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 32),
                    _buildInfoTile(
                      Icons.email_outlined,
                      'Email',
                      _userProfile?['email'] ?? '-',
                    ),
                    _buildInfoTile(
                      Icons.business_outlined,
                      'Perusahaan',
                      _userProfile?['company']?['name'] ?? '-',
                    ),
                    _buildInfoTile(
                      Icons.groups_outlined,
                      'Divisi',
                      _userProfile?['division'] ?? '-',
                    ),
                    _buildInfoTile(
                      Icons.calendar_today_outlined,
                      'Tanggal Bergabung',
                      _userProfile?['joinDate'] != null
                          ? _userProfile!['joinDate'].toString().split('T')[0]
                          : '-',
                    ),

                    SizedBox(height: 32),
                    Divider(),
                    SizedBox(height: 16),
                    Text(
                      'Pengaturan Bahasa',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    ListTile(
                      leading: Icon(Icons.language, color: Colors.blue[800]),
                      title: Text('Bahasa Aplikasi'),
                      subtitle: Text(
                        auth.language == 'id' ? 'Bahasa Indonesia' : 'English',
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (String lang) => auth.setLanguage(lang),
                        itemBuilder: (BuildContext context) =>
                            <PopupMenuEntry<String>>[
                              const PopupMenuItem<String>(
                                value: 'id',
                                child: Text('Bahasa Indonesia'),
                              ),
                              const PopupMenuItem<String>(
                                value: 'en',
                                child: Text('English'),
                              ),
                            ],
                      ),
                    ),

                    SizedBox(height: 16),
                    Text(
                      'Keamanan',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    ListTile(
                      leading: Icon(
                        Icons.lock_outline,
                        color: Colors.blue[800],
                      ),
                      title: Text('Ubah Kata Sandi'),
                      trailing: Icon(Icons.chevron_right),
                      onTap: _showChangePasswordDialog,
                    ),
                    ListTile(
                      leading: Icon(Icons.logout, color: Colors.red),
                      title: Text(
                        'Keluar Aplikasi',
                        style: TextStyle(color: Colors.red),
                      ),
                      onTap: () {
                        auth.logout();
                        Navigator.pop(context);
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildInfoTile(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: Colors.grey[400], size: 20),
          SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 11, color: Colors.grey[500]),
              ),
              Text(
                value,
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
