import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _tenantIdController = TextEditingController(
    text: '1',
  ); // Default PT Maju
  bool _isLoading = false;

  void _handleLogin() async {
    setState(() => _isLoading = true);

    // Simulasi penarikan Auth API yang sukses
    await Future.delayed(Duration(seconds: 1));

    String tenant = _tenantIdController.text;
    String dummyName = tenant == '1' ? 'Budi Santoso' : 'Andi Setiawan';
    int dummyId = tenant == '1' ? 1 : 2;

    await Provider.of<AuthProvider>(
      context,
      listen: false,
    ).login(tenant, 'user@company.com', dummyId, dummyName);

    setState(() => _isLoading = false);
    // Provider akan otomatis memindah layar ke HomeScreen berkat Consumer di main.dart
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.business_center, size: 80, color: Colors.blue[600]),
              SizedBox(height: 24),
              Text(
                'Aplikasi Karyawan',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              Text(
                'Masukkan ID Perusahaan (Tenant)',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600], fontSize: 16),
              ),
              SizedBox(height: 48),
              TextField(
                controller: _tenantIdController,
                decoration: InputDecoration(
                  labelText: 'Company ID',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: Icon(Icons.domain),
                ),
                keyboardType: TextInputType.number,
              ),
              SizedBox(height: 16),
              TextField(
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password (Abaikan dalam demo)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.blue[600],
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text('Login Sekarang', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
