import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String get host {
    if (kIsWeb) return "localhost";
    if (Platform.isAndroid) {
      // Check if running on emulator or real device
      // For now, let's use the local IP to be safe for both
      return "192.168.1.165";
    }
    return "192.168.1.165";
  }

  static String get baseUrl => "http://$host:5005/api";

  // Helper for images and other direct URLs
  static String resolveUrl(String? path) {
    if (path == null || path.isEmpty) return "";
    if (path.startsWith('http')) return path;
    
    // Ensure path starts with a slash
    String cleanPath = path.startsWith('/') ? path : "/$path";
    
    return "http://$host:5005$cleanPath";
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse("$baseUrl/auth/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"email": email, "password": password}),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);
        if (data['user'] != null) {
          await prefs.setInt('userId', data['user']['id']);
          await prefs.setString('userName', data['user']['name']);
          await prefs.setString('userEmail', data['user']['email']);
          
          // Save Customer Data if exists
          if (data['user']['customerData'] != null) {
            final c = data['user']['customerData'];
            await prefs.setInt('customerId', c['id']);
            await prefs.setInt('userPoints', (c['points'] as num).toInt());
            await prefs.setBool('isMember', c['isMember'] ?? false);
          }
        }
        return {"success": true, "data": data};
      }
      return {"success": false, "message": data['error'] ?? "Login failed"};
    } catch (e) {
      return {"success": false, "message": "Connection error: $e"};
    }
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }


  static Future<List<dynamic>> fetchProducts({int? branchId, int? companyId}) async {
    try {
      final token = await getToken();
      String url = "$baseUrl/inventory/products";
      
      // If companyId is provided, use the public ecosystem endpoint
      if (companyId != null) {
        url = "$baseUrl/companies/public/$companyId/products";
        if (branchId != null) {
          url += "?branchId=$branchId";
        }
      } else if (branchId != null) {
        url += "?branchId=$branchId";
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: {
          if (token != null) "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return [];
    } catch (e) {
      print("Error fetching products: $e");
      return [];
    }
  }

  static Future<List<dynamic>> fetchCategories({int? companyId}) async {
    try {
      final token = await getToken();
      String url = "$baseUrl/pos/categories";

      // If companyId is provided, use the public ecosystem endpoint
      if (companyId != null) {
        url = "$baseUrl/companies/public/$companyId/categories";
      }

      final response = await http.get(
        Uri.parse(url),
        headers: {
          if (token != null) "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return [];
    } catch (e) {
      print("Error fetching categories: $e");
      return [];
    }
  }

  static Future<List<dynamic>> fetchBranches({int? companyId}) async {
    try {
      final token = await getToken();
      String url = "$baseUrl/branches";
      
      // If companyId is provided, use the public ecosystem endpoint
      if (companyId != null) {
        url = "$baseUrl/companies/public/$companyId/branches";
      }

      final response = await http.get(
        Uri.parse(url),
        headers: {
          if (token != null) "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return [];
    } catch (e) {
      print("Error fetching branches: $e");
      return [];
    }
  }

  static Future<bool> createOrder({
    required List<Map<String, dynamic>> items,
    int? customerId,
    int? branchId,
    String? notes,
    int? voucherId,
    String? deliveryMethod,
    String? paymentMethod,
    int pointsUsed = 0,
  }) async {
    try {
      final token = await getToken();
      final response = await http.post(
        Uri.parse("$baseUrl/sales"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "items": items,
          "customerId": customerId,
          "branchId": branchId,
          "voucherId": voucherId,
          "deliveryMethod": deliveryMethod,
          "paymentMethod": paymentMethod ?? "Bayar di Kasir",
          "pointsUsed": pointsUsed,
          "notes": notes ?? "Order from Aivola GO",
          "status": "PENDING",
          "accountId": 1,
          "date": DateTime.now().toIso8601String(),
        }),
      );
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      print("Error creating order: $e");
      return false;
    }
  }

  static Future<List<dynamic>> fetchOrders() async {
    try {
      final token = await getToken();
      final response = await http.get(
        Uri.parse("$baseUrl/sales/my-orders"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return [];
    } catch (e) {
      print("Error fetching orders: $e");
      return [];
    }
  }

  static Future<ApiResponse> get(String path) async {
    try {
      final token = await getToken();
      final response = await http.get(
        Uri.parse("$baseUrl$path"),
        headers: {
          if (token != null) "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      return ApiResponse(
        statusCode: response.statusCode,
        data: jsonDecode(response.body),
      );
    } catch (e) {
      print("Error in GET $path: $e");
      return ApiResponse(statusCode: 500, data: {"error": e.toString()});
    }
  }

  static Future<Map<String, dynamic>> updateProfile({String? name, String? email, String? phone, String? avatarUrl}) async {
    try {
      final token = await getToken();
      final response = await http.patch(
        Uri.parse("$baseUrl/users/me"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          if (name != null) "name": name,
          if (email != null) "email": email,
          if (phone != null) "phone": phone,
          if (avatarUrl != null) "avatarUrl": avatarUrl,
        }),
      );
      
      if (response.statusCode == 200) return {"success": true};
      final data = jsonDecode(response.body);
      return {"success": false, "message": data['error'] ?? "Gagal memperbarui profil"};
    } catch (e) {
      print("Error updating profile: $e");
      return {"success": false, "message": "Kesalahan koneksi: $e"};
    }
  }

  static Future<String?> uploadAvatar(String filePath) async {
    try {
      final token = await getToken();
      var request = http.MultipartRequest('POST', Uri.parse("$baseUrl/users/me/avatar"));
      request.headers.addAll({
        "Authorization": "Bearer $token",
      });
      request.files.add(await http.MultipartFile.fromPath('avatar', filePath));
      
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['avatarUrl'];
      }
      return null;
    } catch (e) {
      print("Error uploading avatar: $e");
      return null;
    }
  }

  static Future<List<dynamic>> fetchPointHistory() async {
    try {
      final token = await getToken();
      final response = await http.get(
        Uri.parse("$baseUrl/customers/me/points"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return [];
    } catch (e) {
      print("Error fetching point history: $e");
      return [];
    }
  }

  static Future<List<dynamic>> fetchClaimedVouchers() async {
    try {
      final token = await getToken();
      final response = await http.get(
        Uri.parse("$baseUrl/customers/me/vouchers"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      return [];
    } catch (e) {
      print("Error fetching claimed vouchers: $e");
      return [];
    }
  }

  static Future<bool> claimVoucher(int voucherId) async {
    try {
      final token = await getToken();
      final response = await http.post(
        Uri.parse("$baseUrl/vouchers/$voucherId/claim"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );
      return response.statusCode == 201;
    } catch (e) {
      print("Error claiming voucher: $e");
      return false;
    }
  }
}

class ApiResponse {
  final int statusCode;
  final dynamic data;
  ApiResponse({required this.statusCode, required this.data});
}
