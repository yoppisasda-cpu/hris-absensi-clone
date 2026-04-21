import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  // URL API akan otomatis berubah tergantung mode (Debug vs Release/Google Play)
  // PENTING: Jika menggunakan HP asli (Debug), ganti IP di bawah jika tidak menggunakan emulator
  static const String baseUrl = kReleaseMode
      ? 'https://api.aivola.id/api' // PRODUCTION SERVER
      : 'http://10.0.2.2:5000/api'; // LOCAL TESTING - EMULATOR
  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  ApiService() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          // Ambil Token asli (Bukan dummy tenant lagi)
          final token = prefs.getString('jwt_token');

          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token'; // JWT Header
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Jika token kadaluarsa, hapus token agar Consumer di main.dart
            // otomatis pindah ke LoginScreen pada restart berikutnya,
            // atau kita bisa mentrigger logout lewat provider jika memungkinkan.
            final prefs = await SharedPreferences.getInstance();
            await prefs.remove('jwt_token');
            print('Token expired or invalid. Cleared.');
          }
          return handler.next(e);
        },
      ),
    );
  }

  // Hit Endpoint Otentikasi Login Nyata
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      // Jika berhasil, token & user dict dikembalikan dari Node.js
      return response.data;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal menghubungi server otentikasi (Cek koneksi internet Anda). Endpoint: $baseUrl');
    } catch (e) {
      throw Exception('Gagal login: $e');
    }
  }

  // Method PATCH Generic untuk Update parsial
  Future<Response> patch(String path, dynamic data) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal menghubungi server.');
    } catch (e) {
      throw Exception('Terjadi kesalahan jaringan: $e');
    }
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

  // Hit endpoint Absen Masuk (Clock-In) dengan Koordinat Asli & Foto Selfie
  Future<Map<String, dynamic>> clockIn(
    int userId,
    double lat,
    double lng, {
    String? imagePath,
    String? deviceId,
  }) async {
    try {
      Map<String, dynamic> data = {
        'userId': userId, 
        'lat': lat, 
        'lng': lng,
        'deviceId': deviceId
      };

      if (imagePath != null) {
        data['photo'] = await MultipartFile.fromFile(
          imagePath,
          filename: 'selfie_${DateTime.now().millisecondsSinceEpoch}.jpg',
        );
      }

      final formData = FormData.fromMap(data);

      final response = await _dio.post('/attendance/clock-in', data: formData);
      return response.data;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal menghubungi server.');
    } catch (e) {
      throw Exception('Gagal memproses absensi: $e');
    }
  }

  // Hit endpoint Absen Keluar (Clock-Out)
  Future<bool> clockOut(double lat, double lng, {required String imagePath, String? deviceId}) async {
    try {
      final formData = FormData.fromMap({
        'lat': lat,
        'lng': lng,
        'deviceId': deviceId,
        'photo': await MultipartFile.fromFile(imagePath, filename: 'clockout.jpg'),
      });

      final response = await _dio.patch('/attendance/clock-out', data: formData);
      return response.statusCode == 200;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal menghubungi server.');
    } catch (e) {
      throw Exception('Gagal memproses clock-out: $e');
    }
  }

  // Tarik riwayat absensi pribadi (hari ini)
  Future<Map<String, dynamic>> getAttendanceStatus() async {
    try {
      final response = await _dio.get('/attendance/status');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal memproses data absensi terintegrasi.');
    }
  }

  // Ubah Kata Sandi (Fase Keamanan)
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    try {
      final response = await _dio.patch(
        '/auth/change-password',
        data: {'oldPassword': oldPassword, 'newPassword': newPassword},
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal menghubungi server.');
    } catch (e) {
      throw Exception('Gagal memperbarui password.');
    }
  }

  // Tarik profil lengkap diri sendiri
  Future<Map<String, dynamic>> getMyFullProfile() async {
    try {
      final response = await _dio.get('/users/me');
      return response.data;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil profil.');
    } catch (e) {
      throw Exception('Terjadi kesalahan jaringan.');
    }
  }

  // Tarik riwayat gaji pribadi (Fase 13)
  Future<List<dynamic>> getMyPayroll() async {
    try {
      final response = await _dio.get('/my-payroll');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil data gaji.');
    } catch (e) {
      throw Exception('Gagal memproses data gaji.');
    }
  }

  // --- FASE 14: REIMBURSEMENT ---

  // Kirim pengajuan reimbursement dengan foto (Multipart)
  Future<bool> submitReimbursement({
    required String title,
    String? description,
    required double amount,
    String? imagePath,
  }) async {
    try {
      Map<String, dynamic> body = {
        'title': title,
        'description': description ?? '',
        'amount': amount.toString(),
      };

      if (imagePath != null) {
        body['receipt'] = await MultipartFile.fromFile(
          imagePath,
          filename: imagePath.split('/').last,
        );
      }

      final formData = FormData.fromMap(body);

      final response = await _dio.post('/reimbursements', data: formData);

      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengirim klaim.');
    } catch (e) {
      throw Exception('Terjadi kesalahan saat memproses klaim.');
    }
  }

  // --- AI SCAN REIMBURSEMENT (Phase 34) ---
  Future<Map<String, dynamic>> scanReimbursement(String imagePath) async {
    try {
      FormData formData = FormData.fromMap({
        'receipt': await MultipartFile.fromFile(
          imagePath,
          filename: imagePath.split('/').last,
        ),
      });

      final response = await _dio.post('/reimbursements/scan', data: formData);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal memindai kuitansi dengan AI.');
    } catch (e) {
      throw Exception('Terjadi kesalahan saat pemindaian AI.');
    }
  }

  // Tarik riwayat reimbursement pribadi
  Future<List<dynamic>> getMyReimbursements() async {
    try {
      final response = await _dio.get('/my-reimbursements');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil riwayat klaim.');
    } catch (e) {
      throw Exception('Gagal memproses riwayat klaim.');
    }
  }

  // --- FASE 11: MANAJEMEN CUTI ---

  // Kirim pengajuan cuti baru
  Future<bool> submitLeaveRequest({
    required String startDate,
    required String endDate,
    required String reason,
    required String type,
  }) async {
    try {
      final response = await _dio.post(
        '/leaves',
        data: {
          'startDate': startDate,
          'endDate': endDate,
          'reason': reason,
          'type': type,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengirim pengajuan cuti.');
    } catch (e) {
      throw Exception('Gagal memproses pengajuan cuti.');
    }
  }

  // Tarik riwayat cuti pribadi
  Future<List<dynamic>> getMyLeaves() async {
    try {
      final response = await _dio.get('/my-leaves');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil riwayat cuti.');
    } catch (e) {
      throw Exception('Gagal memproses riwayat cuti.');
    }
  }

  // Tarik info sisa cuti
  Future<Map<String, dynamic>> getLeaveQuota() async {
    try {
      final response = await _dio.get('/leaves/quota');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil kuota cuti.');
    } catch (e) {
      throw Exception('Gagal memproses kuota cuti.');
    }
  }

  // --- MANAJEMEN LEMBUR (OVERTIME) ---

  // Kirim pengajuan lembur baru
  Future<bool> submitOvertimeRequest({
    required String date,
    required double durationHours,
    required String reason,
  }) async {
    try {
      final response = await _dio.post(
        '/overtimes',
        data: {'date': date, 'durationHours': durationHours, 'reason': reason},
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengirim pengajuan lembur.');
    } catch (e) {
      throw Exception('Terjadi kesalahan saat memproses pengajuan lembur.');
    }
  }

  // Tarik riwayat lembur pribadi
  Future<List<dynamic>> getMyOvertimes() async {
    try {
      final response = await _dio.get('/my-overtimes');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil riwayat lembur.');
    } catch (e) {
      throw Exception('Gagal memproses riwayat lembur.');
    }
  }

  // --- FASE 6: PENGUMUMAN PERUSAHAAN ---

  // Tarik daftar pengumuman perusahaan
  Future<List<dynamic>> getAnnouncements() async {
    try {
      final response = await _dio.get('/announcements');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil pengumuman.');
    } catch (e) {
      throw Exception('Gagal memproses data pengumuman.');
    }
  }

  // --- FASE 7: NOTIFIKASI PRIBADI ---

  // Tarik daftar notifikasi
  Future<List<dynamic>> getNotifications() async {
    try {
      final response = await _dio.get('/notifications');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil notifikasi.');
    } catch (e) {
      throw Exception('Gagal memproses data notifikasi.');
    }
  }

  // Tandai notifikasi dibaca
  Future<void> markNotificationAsRead(int id) async {
    try {
      await _dio.patch('/notifications/$id/read');
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal memperbarui notifikasi.');
    }
  }

  // --- FASE 27: KALENDER PERUSAHAAN ---

  // Tarik daftar hari libur perusahaan
  Future<List<dynamic>> getHolidays() async {
    try {
      final response = await _dio.get('/holidays');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil kalender hari libur.');
    } catch (e) {
      throw Exception('Gagal memproses data kalender.');
    }
  }

  // --- FASE 33: KPI & PERFORMANCE REVIEW ---

  // Tarik data performa KPI pribadi
  Future<List<dynamic>> getMyPerformance(int month, int year) async {
    try {
      final response = await _dio.get(
        '/kpi/my-performance',
        queryParameters: {'month': month, 'year': year},
      );
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengambil data performa.');
    } catch (e) {
      throw Exception('Gagal memproses data performa.');
    }
  }

  // --- FASE 37: EMPLOYEE VENT BOX ---

  // Kirim curhatan ke server (bisa anonim)
  Future<Map<String, dynamic>> submitVent(String content, bool isAnonymous) async {
    try {
      final response = await _dio.post('/vents', data: {
        'content': content,
        'isAnonymous': isAnonymous,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengirim curhatan ke server.');
    } catch (e) {
      throw Exception('Gagal memproses pengiriman curhat.');
    }
  }

  // --- FASE 38: LEARNING MANAGEMENT SYSTEM (LMS) ---

  // Ambil daftar objective pembelajaran
  Future<List<dynamic>> getLearningObjectives() async {
    try {
      final response = await _dio.get('/learning/objectives');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil data pembelajaran.');
    }
  }

  // Tambah objective baru
  Future<Map<String, dynamic>> addLearningObjective(String title, String description, String category, String? deadline) async {
    try {
      final response = await _dio.post('/learning/objectives', data: {
        'title': title,
        'description': description,
        'category': category,
        'deadline': deadline,
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal menambah target belajar.');
    }
  }

  // Update progress objective
  Future<Map<String, dynamic>> updateObjectiveProgress(int id, double progress, String? status) async {
    try {
      final response = await _dio.patch('/learning/objectives/$id', data: {
        'progress': progress,
        'status': status,
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal memperbarui progress belajar.');
    }
  }

  // Ambil rekomendasi skill dari AI (Berdasarkan Jabatan)
  Future<List<dynamic>> getLearningRecommendations() async {
    try {
      final response = await _dio.get('/learning/recommendations');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil rekomendasi AI.');
    }
  }

  // Ambil riwayat Knowledge Review
  Future<List<dynamic>> getKnowledgeReviews() async {
    try {
      final response = await _dio.get('/learning/reviews');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil riwayat review.');
    }
  }

  // --- FASE 39: AI-GENERATED EXAM SYSTEM (OTOMASI TES SOP) ---

  // Ambil daftar ujian tersedia
  Future<List<dynamic>> getExams() async {
    try {
      final response = await _dio.get('/learning/exams');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil daftar ujian.');
    }
  }

  // Ambil detail ujian + soal
  Future<Map<String, dynamic>> getExamDetail(int id) async {
    try {
      final response = await _dio.get('/learning/exams/$id');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil detail ujian.');
    }
  }

  // Submit hasil ujian
  Future<Map<String, dynamic>> submitExam(int id, Map<int, String> answers) async {
    try {
      // Map keys to string for JSON compatibility
      final mappedAnswers = answers.map((key, value) => MapEntry(key.toString(), value));
      final response = await _dio.post('/learning/exams/$id/submit', data: {
        'answers': mappedAnswers,
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal mengirim jawaban ujian.');
    }
  }

  // --- FASE POS: POINT OF SALE (KASIR) ---

  // Tarik daftar produk untuk POS
  Future<List<dynamic>> getPosProducts() async {
    try {
      final response = await _dio.get('/pos/products');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil daftar produk POS.');
    }
  }

  // Ambil daftar kategori produk untuk POS
  Future<List<dynamic>> getPosCategories() async {
    try {
      final response = await _dio.get('/pos/categories');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil kategori produk.');
    }
  }

  // Cari pelanggan berdasarkan nama/hp (Autocomplete)
  Future<List<dynamic>> searchCustomers(String query) async {
    try {
      final response = await _dio.get('/pos/customers', queryParameters: {'q': query});
      return response.data as List<dynamic>;
    } catch (e) {
      print('Error searching customers: $e');
      return [];
    }
  }

  // Tarik daftar akun keuangan (untuk metode pembayaran)
  Future<List<dynamic>> getFinancialAccounts() async {
    try {
      final response = await _dio.get('/finance/accounts');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil daftar akun keuangan.');
    }
  }

  // Kalkulasi total POS (Diskon Member, Voucher, Poin)
  Future<Map<String, dynamic>> calculatePosTotal({
    required double subtotal,
    int? customerId,
    String? voucherCode,
    double pointsToUse = 0,
  }) async {
    try {
      final response = await _dio.post('/pos/calculate', data: {
        'subtotal': subtotal,
        'customerId': customerId,
        'voucherCode': voucherCode,
        'pointsToUse': pointsToUse,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengkalkulasi diskon/voucher.');
    } catch (e) {
      throw Exception('Terjadi kesalahan saat kalkulasi.');
    }
  }

  // Proses transaksi checkout POS
  Future<Map<String, dynamic>> checkoutPos({
    required List<Map<String, dynamic>> items,
    required int accountId,
    required double totalAmount,
    int? customerId,
    String? customerName,
    String? customerPhone,
    String? notes,
    String saleType = 'WALK_IN',
    double serviceFee = 0,
    double markupPercentage = 0,
    double memberDiscountAmount = 0,
    String? voucherCode,
    double voucherDiscountAmount = 0,
    double pointsUsed = 0,
    double pointsEarned = 0,
  }) async {
    try {
      final response = await _dio.post('/pos/checkout', data: {
        'items': items,
        'accountId': accountId,
        'totalAmount': totalAmount,
        'customerId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'notes': notes,
        'saleType': saleType,
        'serviceFee': serviceFee,
        'markupPercentage': markupPercentage,
        'memberDiscountAmount': memberDiscountAmount,
        'voucherCode': voucherCode,
        'voucherDiscountAmount': voucherDiscountAmount,
        'pointsUsed': pointsUsed,
        'pointsEarned': pointsEarned,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal memproses checkout kasir.');
    } catch (e) {
      throw Exception('Terjadi kesalahan saat checkout.');
    }
  }

  // Tarik riwayat pesanan (Semua penjualan di cabang)
  Future<List<dynamic>> getPosOrders() async {
    try {
      final response = await _dio.get('/sales');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil riwayat pesanan.');
    }
  }

  // Tarik detail pesanan spesifik
  Future<Map<String, dynamic>> getSaleDetail(int id) async {
    try {
      final response = await _dio.get('/sales/$id');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil detail pesanan.');
    }
  }

  // Proses Refund/Retur Pesanan
  Future<Map<String, dynamic>> returnSale(int saleId, List<dynamic> items, int accountId) async {
    try {
      final response = await _dio.post('/sales/$saleId/return', data: {
        'items': items,
        'accountId': accountId,
        'notes': 'Refund POS',
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal memproses refund.');
    } catch (e) {
      throw Exception('Terjadi kesalahan saat refund.');
    }
  }

  // POS - Simpan Bill Tertunda
  Future<void> holdPosBill(String label, List<dynamic> items, String saleType) async {
    try {
      await _dio.post('/pos/hold', data: {
        'label': label,
        'items': items,
        'saleType': saleType,
      });
    } catch (e) {
      throw Exception('Gagal menyimpan bill sementara.');
    }
  }

  // POS - Tarik Daftar Bill Tertunda
  Future<List<dynamic>> getPendingPosBills() async {
    try {
      final response = await _dio.get('/pos/pending');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil daftar bill tertunda.');
    }
  }

  // POS - Hapus Bill Tertunda
  Future<void> deletePendingPosBill(int id) async {
    try {
      await _dio.delete('/pos/pending/$id');
    } catch (e) {
      throw Exception('Gagal menghapus bill tertunda.');
    }
  }

  // POS - Ambil Ringkasan Closing
  Future<Map<String, dynamic>> getPosClosingSummary() async {
    try {
      final response = await _dio.get('/pos/closing-summary');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil ringkasan closing: $e');
    }
  }

  // POS - Simpan Closing Kasir
  Future<Map<String, dynamic>> submitPosClosing(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/pos/closing', data: data);
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Gagal melakukan closing kasir: $e');
    }
  }

  // --- MODUL PENUGASAN (TASK ASSIGNMENT) ---

  // Tarik daftar penugasan (Assignee/Karyawan)
  Future<List<dynamic>> getAssignments() async {
    try {
      final response = await _dio.get('/assignments');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Gagal mengambil daftar penugasan.');
    }
  }

  // Buat penugasan baru (Pengajuan dari Karyawan)
  Future<bool> createAssignment(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/assignments', data: data);
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      throw Exception('Gagal mengajukan penugasan.');
    }
  }

  // Update status penugasan (Misal: Dari PENDING ke IN_PROGRESS)
  Future<bool> updateAssignmentStatus(int id, String status) async {
    try {
      final response = await _dio.patch('/assignments/$id/status', data: {'status': status});
      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Gagal memperbarui status penugasan.');
    }
  }

  // Submit hasil penugasan (Note + Foto)
  Future<bool> submitAssignmentResult(int id, String note, {String? imagePath}) async {
    try {
      Map<String, dynamic> body = {
        'resultNote': note,
      };

      if (imagePath != null) {
        body['photo'] = await MultipartFile.fromFile(
          imagePath,
          filename: 'assignment_result_${DateTime.now().millisecondsSinceEpoch}.jpg',
        );
      }

      final formData = FormData.fromMap(body);
      final response = await _dio.patch('/assignments/$id/result', data: formData);
      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Gagal mengirim hasil penugasan.');
    }
  }

  // --- MEMBERSHIP & OTP WA ---
  Future<void> requestOtp(String phone) async {
    try {
      await _dio.post('/customers/otp-request', data: {'phone': phone});
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal mengirim OTP.');
    }
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String code,
    String? name,
    String? birthDate,
    String? gender,
  }) async {
    try {
      final response = await _dio.post('/customers/otp-verify', data: {
        'phone': phone,
        'code': code,
        'name': name,
        'birthDate': birthDate,
        'gender': gender,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data['error'] != null) {
        throw Exception(e.response?.data['error']);
      }
      throw Exception('Gagal memverifikasi OTP.');
    }
  }

  // --- MODUL PERSETUJUAN (SUPERVISOR/ADMIN) ---
  
  // Ambil daftar pengajuan yang perlu disetujui (Phase SUPERVISOR)
  Future<Map<String, dynamic>> getPendingApprovals() async {
    try {
      final response = await _dio.get('/approvals/pending');
      return response.data;
    } catch (e) {
      throw Exception('Gagal memuat daftar persetujuan: $e');
    }
  }

  // Update Status Cuti
  Future<void> updateLeaveStatus(int id, String status) async {
    try {
      await _dio.patch('/leaves/$id', data: {'status': status});
    } catch (e) {
      throw Exception('Gagal memproses persetujuan cuti: $e');
    }
  }

  // Update Status Lembur
  Future<void> updateOvertimeStatus(int id, String status) async {
    try {
      await _dio.patch('/overtimes/$id', data: {'status': status});
    } catch (e) {
      throw Exception('Gagal memproses persetujuan lembur: $e');
    }
  }
}
