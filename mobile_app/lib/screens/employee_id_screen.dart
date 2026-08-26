import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:async';
import '../services/api_service.dart';

class EmployeeIdScreen extends StatefulWidget {
  @override
  _EmployeeIdScreenState createState() => _EmployeeIdScreenState();
}

class _EmployeeIdScreenState extends State<EmployeeIdScreen> {
  final ApiService _apiService = ApiService();
  String? _token;
  int _timeLeft = 0;
  bool _isLoading = true;
  String _error = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchToken();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchToken() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final data = await _apiService.getEmployeeQrToken();
      if (data is String) {
        throw Exception("Server mengembalikan teks (Pastikan Anda menggunakan server lokal).");
      }
      final token = data['token'];
      final expiresAtStr = data['expiresAt'];
      
      final expiresAt = DateTime.parse(expiresAtStr).millisecondsSinceEpoch;
      final now = DateTime.now().millisecondsSinceEpoch;
      final remaining = ((expiresAt - now) / 1000).floor();

      setState(() {
        _token = token;
        _timeLeft = remaining > 0 ? remaining : 0;
        _isLoading = false;
      });

      _startTimer();
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      if (_timeLeft <= 0) {
        timer.cancel();
        if (_token != null) {
          _fetchToken();
        }
      } else {
        setState(() {
          _timeLeft--;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Aivola ID', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black87),
        centerTitle: true,
      ),
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: Color(0xFFF8FAFC), // slate-50
        ),
        child: Column(
          children: [
            SizedBox(height: 20),
            Text(
              'Aivola ID',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A), // slate-900
                letterSpacing: -0.5,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Tunjukkan QR ini di Kasir untuk klaim diskon Anda.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B), // slate-500
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 40),
            
            Expanded(
              child: Container(
                margin: EdgeInsets.symmetric(horizontal: 24),
                padding: EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 20,
                      offset: Offset(0, 10),
                    )
                  ],
                ),
                child: _isLoading && _token == null
                    ? Center(child: CircularProgressIndicator())
                    : _error.isNotEmpty
                        ? _buildErrorState()
                        : _buildQrState(),
              ),
            ),
            SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
        SizedBox(height: 16),
        Text(
          _error,
          style: TextStyle(color: Colors.red[600], fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 24),
        ElevatedButton(
          onPressed: _fetchToken,
          style: ElevatedButton.styleFrom(
            backgroundColor: Color(0xFF0F172A), // slate-900
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          child: Text('Coba Lagi', style: TextStyle(color: Colors.white)),
        )
      ],
    );
  }

  Widget _buildQrState() {
    return Column(
      children: [
        Container(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.green[50],
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.verified_user, size: 16, color: Colors.green[600]),
              SizedBox(width: 8),
              Text(
                'Anti-Fraud Active',
                style: TextStyle(
                  color: Colors.green[700],
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 32),
        
        Container(
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Color(0xFFE2E8F0), width: 2, style: BorderStyle.solid),
          ),
          child: _token != null
              ? QrImageView(
                  data: _token!,
                  version: QrVersions.auto,
                  size: 200.0,
                  backgroundColor: Colors.white,
                )
              : SizedBox(width: 200, height: 200),
        ),
        
        SizedBox(height: 32),
        
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'BERLAKU SELAMA',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 1.2,
              ),
            ),
            Text(
              '$_timeLeft Detik',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: _timeLeft < 10 ? Colors.red[600] : Colors.blue[600],
              ),
            ),
          ],
        ),
        SizedBox(height: 8),
        LinearProgressIndicator(
          value: _timeLeft / 60.0,
          backgroundColor: Color(0xFFF1F5F9), // slate-100
          valueColor: AlwaysStoppedAnimation<Color>(
            _timeLeft < 10 ? Colors.red[500]! : Colors.blue[500]!,
          ),
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
        ),
        SizedBox(height: 16),
        Text(
          'QR Code dinamis ini berubah setiap menit untuk keamanan. Jangan berikan screenshot kepada siapapun.',
          style: TextStyle(
            fontSize: 10,
            color: Color(0xFF94A3B8), // slate-400
          ),
          textAlign: TextAlign.center,
        ),
        
        Spacer(),
        
        TextButton.icon(
          onPressed: _isLoading ? null : _fetchToken,
          icon: _isLoading 
              ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : Icon(Icons.refresh, size: 18),
          label: Text('Perbarui Sekarang'),
          style: TextButton.styleFrom(
            foregroundColor: Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}
