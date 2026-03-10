import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'payroll_history_screen.dart';
import 'leave_history_screen.dart';
import 'reimbursement_history_screen.dart';
import 'overtime_history_screen.dart';
import 'announcement_detail_screen.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'notification_inbox_screen.dart';
import 'profile_screen.dart';
import 'calendar_screen.dart';
import 'kpi_screen.dart';
import 'vent_screen.dart';
import 'learning_center_screen.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  Map<String, dynamic>? _attendance;
  List<dynamic> _logs = [];
  List<dynamic> _announcements = [];

  @override
  void initState() {
    super.initState();
    _checkStatus();
    _fetchAnnouncements();
  }

  Future<void> _checkStatus() async {
    setState(() => _isLoading = true);
    try {
      final status = await _apiService.getAttendanceStatus();
      setState(() {
        _attendance = status['attendance'];
        _logs = status['logs'] ?? [];
      });
    } catch (e) {
      print('Status error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchAnnouncements() async {
    try {
      final data = await _apiService.getAnnouncements();
      setState(() {
        _announcements = data;
      });
    } catch (e) {
      print('Announcements error: $e');
    }
  }

  String _getMoodEmoji(String? mood) {
    switch (mood) {
      case 'Senang': return '😊';
      case 'Netral': return '😐';
      case 'Lelah': return '😴';
      case 'Stres': return '😰';
      default: return '📍';
    }
  }

  String _getMoodMessage(String? mood) {
    switch (mood) {
      case 'Senang': return 'Wah, Anda terlihat ceria hari ini! Semangat kerjanya! ✨';
      case 'Netral': return 'Absen berhasil. Selamat bekerja!';
      case 'Lelah': return 'Anda terlihat agak lelah. Jangan lupa istirahat yang cukup ya! ☕';
      case 'Stres': return 'Tetap tenang, Anda pasti bisa melewati hari ini. Semangat! 💪';
      default: return 'Absen berhasil!';
    }
  }

  void _clockIn() async {
    setState(() => _isLoading = true);

    try {
      // 1. Cek & Minta Izin Lokasi GPS
      var statusLoc = await Permission.locationWhenInUse.status;
      if (!statusLoc.isGranted) {
        statusLoc = await Permission.locationWhenInUse.request();
        if (!statusLoc.isGranted) throw Exception('Izin Lokasi (GPS) Ditolak!');
      }

      // 2. Cegat Posisi Koordinat Asli HP
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );

      // 3. Cek & Minta Izin Kamera
      var statusCam = await Permission.camera.status;
      if (!statusCam.isGranted) {
        statusCam = await Permission.camera.request();
        if (!statusCam.isGranted) throw Exception('Izin Kamera Ditolak!');
      }

      // 4. Buka Kamera Depan Untuk Selfie Bukti Kehadiran
      final ImagePicker picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 50,
      );

      if (photo == null) throw Exception('Anda membatalkan foto selfie.');

      // 5. Tarik user id dan Kirim ke API Node.js
      final userId = Provider.of<AuthProvider>(context, listen: false).userId;

      final response = await _apiService.clockIn(
        userId!,
        position.latitude,
        position.longitude,
        imagePath: photo.path,
      );

      final String mood = response['attendance']['mood'] ?? 'Netral';

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_getMoodEmoji(mood), style: TextStyle(fontSize: 60)),
              SizedBox(height: 16),
              Text(
                'Absen Berhasil!',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              SizedBox(height: 8),
              Text(
                _getMoodMessage(mood),
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('OK'),
            ),
          ],
        ),
      );

      _checkStatus(); // Refresh status
    } catch (e) {
      final String msg = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red[800]),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _clockOut() async {
    setState(() => _isLoading = true);
    
    try {
      // 1. Cek & Minta Izin Lokasi GPS
      var statusLoc = await Permission.locationWhenInUse.status;
      if (!statusLoc.isGranted) {
        statusLoc = await Permission.locationWhenInUse.request();
        if (!statusLoc.isGranted) throw Exception('Izin Lokasi (GPS) Ditolak!');
      }

      // 2. Cegat Posisi Koordinat Asli HP
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );

      // 3. Cek & Minta Izin Kamera
      var statusCam = await Permission.camera.status;
      if (!statusCam.isGranted) {
        statusCam = await Permission.camera.request();
        if (!statusCam.isGranted) throw Exception('Izin Kamera Ditolak!');
      }

      // 4. Buka Kamera Depan Untuk Selfie Bukti Kehadiran
      final ImagePicker picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 50,
      );

      if (photo == null) throw Exception('Anda membatalkan foto selfie.');

      final success = await _apiService.clockOut(
        position.latitude,
        position.longitude,
        imagePath: photo.path,
      );

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Berhasil Clock-Out! 👋'),
            backgroundColor: Colors.blue[800],
          ),
        );
        _checkStatus(); // Refresh status
      }
    } catch (e) {
      final String msg = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red[800]),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset('assets/images/logo.png', height: 32),
            SizedBox(width: 8),
            Text('aivola', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: Colors.blue[800]),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => NotificationInboxScreen()),
            ),
          ),
          IconButton(
            icon: Icon(Icons.logout, color: Colors.red),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => ProfileScreen()),
                ),
                child: Container(
                  padding: EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.blue[100]!),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: Colors.blue[600],
                        child: Text(
                          auth.userName?[0] ?? '?',
                          style: TextStyle(fontSize: 24, color: Colors.white),
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Halo, ${auth.userName}',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'Lihat & Kelola Profil',
                              style: TextStyle(
                                color: Colors.blue[800],
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right, color: Colors.blue[300]),
                    ],
                  ),
                ),
              ),

              SizedBox(height: 16),

              // --- SECTION PENGUMUMAN ---
              if (_announcements.isNotEmpty) ...[
                Row(
                  children: [
                    Icon(Icons.campaign, color: Colors.blue[800], size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Pengumuman Terbaru',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.blueGrey[900],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Container(
                  height: 110,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _announcements.length,
                    itemBuilder: (context, index) {
                      final ann = _announcements[index];
                      final bool isPriority = ann['isPriority'] ?? false;
                      return GestureDetector(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                AnnouncementDetailScreen(announcement: ann),
                          ),
                        ),
                        child: Container(
                          width: 260,
                          margin: EdgeInsets.only(right: 12),
                          padding: EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isPriority ? Colors.red[50] : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isPriority
                                  ? Colors.red[100]!
                                  : Colors.grey[200]!,
                              width: isPriority ? 1.5 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  if (isPriority)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 4),
                                      child: Icon(
                                        Icons.star,
                                        color: Colors.red,
                                        size: 14,
                                      ),
                                    ),
                                  Expanded(
                                    child: Text(
                                      ann['title'] ?? '',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: isPriority
                                            ? Colors.red[900]
                                            : Colors.blueGrey[900],
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 4),
                              Expanded(
                                child: Text(
                                  ann['content'] ?? '',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blueGrey[600],
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(height: 16),
              ],

              // Menu Grid
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.4,
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                children: [
                  _buildMenuCard(
                    context,
                    title: 'Slip Gaji',
                    icon: Icons.receipt_long,
                    color: Colors.orange,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => PayrollHistoryScreen()),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Reimbursement',
                    icon: Icons.receipt,
                    color: Colors.blue,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReimbursementHistoryScreen(),
                      ),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Cuti',
                    icon: Icons.calendar_month,
                    color: Colors.purple,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => LeaveHistoryScreen()),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Lembur',
                    icon: Icons.access_time_filled,
                    color: Colors.indigo,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => OvertimeHistoryScreen(),
                      ),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Kalender',
                    icon: Icons.event,
                    color: Colors.orange,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => CalendarScreen()),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Performa',
                    icon: Icons.trending_up,
                    color: Colors.green,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => KpiScreen()),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Pojok Curhat',
                    icon: Icons.chat_bubble_outline,
                    color: Colors.pink,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => VentScreen()),
                    ),
                  ),
                  _buildMenuCard(
                    context,
                    title: 'Learning Center',
                    icon: Icons.school,
                    color: Colors.indigo,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => LearningCenterScreen()),
                    ),
                  ),
                ],
              ),

              SizedBox(height: 32),

              // Tombol Absen Utama
              Center(
                child: GestureDetector(
                  onTap: _isLoading
                      ? null
                      : (_attendance == null || _attendance!['clockOut'] != null
                            ? _clockIn
                            : _clockOut),
                  child: Container(
                    height: 160,
                    width: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: _attendance == null || _attendance!['clockOut'] != null
                            ? [Colors.blue[400]!, Colors.blue[700]!]
                            : [Colors.red[400]!, Colors.red[700]!],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (_attendance == null || _attendance!['clockOut'] != null
                                      ? Colors.blue
                                      : Colors.red)
                                  .withOpacity(0.4),
                          blurRadius: 20,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Center(
                      child: _isLoading
                          ? CircularProgressIndicator(color: Colors.white)
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _attendance == null || _attendance!['clockOut'] != null
                                      ? Icons.fingerprint
                                      : Icons.logout,
                                  size: 60,
                                  color: Colors.white,
                                ),
                                Text(
                                  _attendance == null || _attendance!['clockOut'] != null
                                      ? 'CLOCK IN'
                                      : 'CLOCK OUT',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ),

              SizedBox(height: 32),
              Text(
                'Riwayat Hari Ini',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 12),
              ListView.builder(
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                itemCount: _logs.length,
                itemBuilder: (context, index) {
                  final log = _logs[index];
                  final clockIn = DateTime.parse(log['clockIn']).toLocal();
                  final clockOut = log['clockOut'] != null
                      ? DateTime.parse(log['clockOut']).toLocal()
                      : null;

                  return Container(
                    margin: EdgeInsets.only(bottom: 12),
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.login,
                                      color: Colors.green,
                                      size: 16,
                                    ),
                                    SizedBox(width: 8),
                                    Text(
                                      'Masuk: ${clockIn.hour.toString().padLeft(2, '0')}:${clockIn.minute.toString().padLeft(2, '0')}',
                                      style: TextStyle(fontWeight: FontWeight.w600),
                                    ),
                                    if (log['mood'] != null) ...[
                                      SizedBox(width: 8),
                                      Text(_getMoodEmoji(log['mood']), style: TextStyle(fontSize: 12)),
                                    ],
                                  ],
                                ),
                            if (clockOut != null) ...[
                              SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.logout,
                                    color: Colors.red,
                                    size: 16,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'Keluar: ${clockOut.hour.toString().padLeft(2, '0')}:${clockOut.minute.toString().padLeft(2, '0')}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ] else if (_attendance != null &&
                                _attendance!['id'] == log['id']) ...[
                              SizedBox(height: 4),
                              Text(
                                'Sedang Bekerja...',
                                style: TextStyle(
                                  color: Colors.blue,
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ],
                        ),
                        Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: log['status'] == 'PRESENT'
                                ? Colors.green[50]
                                : Colors.orange[50],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            log['status'],
                            style: TextStyle(
                              color: log['status'] == 'PRESENT'
                                  ? Colors.green[700]
                                  : Colors.orange[700],
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey[200]!),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
