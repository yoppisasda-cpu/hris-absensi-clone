import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  String? _companyId;
  String? _userName;
  int? _userId;
  String? _userRole;
  String _language = 'id';

  bool get isAuthenticated => _isAuthenticated;
  String? get companyId => _companyId;
  String? get userName => _userName;
  int? get userId => _userId;
  String? get userRole => _userRole;
  String get language => _language;

  Future<void> login(String email, String password) async {
    final response = await ApiService().login(email, password);

    final token = response['token'];
    final user = response['user'];

    final prefs = await SharedPreferences.getInstance();

    // Simpan local state beserta JWT Token yang didapatkan
    await prefs.setString('jwt_token', token);
    await prefs.setString('companyId', user['companyId'].toString());
    await prefs.setInt('userId', user['id']);
    await prefs.setString('userName', user['name']);
    await prefs.setString('userRole', user['userRole'] ?? user['role']);
    if (user['branchId'] != null) {
      await prefs.setInt('branchId', user['branchId']);
    }

    _companyId = user['companyId'].toString();
    _userId = user['id'];
    _userName = user['name'];
    _userRole = user['role'];
    _language = user['language'] ?? 'id';

    await prefs.setString('language', _language);

    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    _companyId = prefs.getString('companyId');
    _userId = prefs.getInt('userId');
    _userName = prefs.getString('userName');
    _userRole = prefs.getString('userRole');
    _language = prefs.getString('language') ?? 'id';

    // Autentikasi ditentukan dari ketersediaan JWT
    _isAuthenticated = token != null;
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _language = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', lang);
    notifyListeners();

    // Sync ke backend
    try {
      await ApiService().patch('/users/me/settings', {'language': lang});
    } catch (e) {
      print('Gagal sync bahasa ke backend: $e');
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    _isAuthenticated = false;
    _companyId = null;
    _userId = null;
    _userName = null;
    _userRole = null;
    notifyListeners();
  }
}
