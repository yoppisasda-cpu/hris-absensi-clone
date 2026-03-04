import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  String? _companyId;
  String? _userName;
  int? _userId;

  bool get isAuthenticated => _isAuthenticated;
  String? get companyId => _companyId;
  String? get userName => _userName;
  int? get userId => _userId;

  Future<void> login(
    String tenantId,
    String userEmail,
    int id,
    String name,
  ) async {
    final prefs = await SharedPreferences.getInstance();

    // Simpan local state
    await prefs.setString('companyId', tenantId);
    await prefs.setInt('userId', id);
    await prefs.setString('userName', name);

    _companyId = tenantId;
    _userId = id;
    _userName = name;
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _companyId = prefs.getString('companyId');
    _userId = prefs.getInt('userId');
    _userName = prefs.getString('userName');

    _isAuthenticated = _companyId != null;
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    _isAuthenticated = false;
    _companyId = null;
    _userId = null;
    _userName = null;
    notifyListeners();
  }
}
