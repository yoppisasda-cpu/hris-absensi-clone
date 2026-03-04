import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Ganti localhost dengan IP lokal komputer Anda jika dio run di real-device/emulator
  // Emulator Android = 10.0.2.2 || Real Device = IP LAN (192.168.x.x)
  static const String baseUrl = 'http://10.0.2.2:3000/api';
  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  ApiService() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          // Simulasi ID Karyawan & Tenant ID dari local storage HP
          final companyId = prefs.getString('companyId');

          if (companyId != null) {
            options.headers['x-company-id'] = companyId;
          }
          return handler.next(options);
        },
      ),
    );
  }

  // Tarik data profil diri sendiri (simulasi)
  Future<dynamic> getMyProfile() async {
    try {
      final response = await _dio.get('/users');
      return response.data; // Me-return list Employee sesuai company_id
    } catch (e) {
      throw Exception('Gagal menghubungi server server: $e');
    }
  }

  // Hit endpoint Absen Masuk (Clock-In) dengan Koordinat Asli
  Future<bool> clockIn(int userId, double lat, double lng) async {
    try {
      final response = await _dio.post(
        '/attendance/clock-in',
        data: {'userId': userId, 'lat': lat, 'lng': lng},
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
