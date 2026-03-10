import 'package:flutter/material.dart';
import '../services/api_service.dart';

class VentScreen extends StatefulWidget {
  @override
  _VentScreenState createState() => _VentScreenState();
}

class _VentScreenState extends State<VentScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _controller = TextEditingController();
  bool _isAnonymous = false;
  bool _isLoading = false;

  void _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Tuliskan apa yang Anda rasakan...')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final result = await _apiService.submitVent(text, _isAnonymous);
      
      String moodEmoji = '✨';
      if (result['mood'] == 'Senang') moodEmoji = '😊';
      if (result['mood'] == 'Lelah') moodEmoji = '😴';
      if (result['mood'] == 'Stres') moodEmoji = '😰';
      if (result['mood'] == 'Kecewa') moodEmoji = '😞';

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Terima Kasih! $moodEmoji'),
          content: Text('Aspirasi Anda telah diterima. AI kami mendeteksi mood Anda saat ini: ${result['mood']}. Tetap semangat!'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Go back home
              },
              child: Text('OK'),
            ),
          ],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red[800],
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Pojok Curhat', style: TextStyle(color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.pink[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.pink[100]!),
              ),
              child: Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.favorite, color: Colors.pink, size: 20),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ruang Aspirasi Aman',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.pink[900],
                          ),
                        ),
                        Text(
                          'Sampaikan perasaan atau saran Anda. AI akan menganalisis tren mood tim agar HR bisa memberikan dukungan lebih baik.',
                          style: TextStyle(color: Colors.pink[800], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24),
            Text(
              'Apa yang sedang Anda rasakan?',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.blueGrey[900],
              ),
            ),
            SizedBox(height: 12),
            TextField(
              controller: _controller,
              maxLines: 8,
              decoration: InputDecoration(
                hintText: 'Tuliskan curhatan, keluh kesah, atau saran Anda di sini...',
                hintStyle: TextStyle(fontSize: 14, color: Colors.grey[400]),
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[200]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[200]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.pink[200]!),
                ),
              ),
            ),
            SizedBox(height: 24),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: SwitchListTile(
                title: Text(
                  'Kirim Secara Anonim',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  'Identitas Anda tidak akan diketahui perusahaan',
                  style: TextStyle(fontSize: 12),
                ),
                value: _isAnonymous,
                onChanged: (val) => setState(() => _isAnonymous = val),
                activeColor: Colors.pink,
              ),
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.pink,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: _isLoading
                  ? SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      'Kirim Aspirasi',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
            SizedBox(height: 16),
            Text(
              'Privasi Anda adalah prioritas kami. Data yang dikirim secara anonim tidak dapat dilacak kembali ke akun Anda.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }
}
