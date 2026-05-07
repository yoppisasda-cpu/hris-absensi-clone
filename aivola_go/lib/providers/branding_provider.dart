import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../models/banner.dart';
import '../models/voucher.dart';
import '../services/api_service.dart';

class BrandingProvider with ChangeNotifier {
  Color _primaryColor = const Color(0xFF3B82F6); // Default Blue
  Color _secondaryColor = const Color(0xFF1E293B); // Default Dark
  String? _logoUrl;
  int? _selectedMerchantId;
  String? _selectedMerchantName;
  List<PromoBanner> _banners = [];
  List<Voucher> _vouchers = [];

  Color get primaryColor => _primaryColor;
  Color get secondaryColor => _secondaryColor;
  String? get logoUrl => _logoUrl;
  int? get selectedMerchantId => _selectedMerchantId;
  String? get selectedMerchantName => _selectedMerchantName;
  List<PromoBanner> get banners => _banners;
  List<Voucher> get vouchers => _vouchers;

  String? get fullLogoUrl {
    return ApiService.resolveUrl(_logoUrl);
  }

  BrandingProvider() {
    loadBranding();
  }

  Future<void> loadBranding() async {
    final prefs = await SharedPreferences.getInstance();
    final primary = prefs.getString('primaryColor');
    final secondary = prefs.getString('secondaryColor');
    _logoUrl = prefs.getString('logoUrl');
    _selectedMerchantId = prefs.getInt('selectedMerchantId');
    _selectedMerchantName = prefs.getString('selectedMerchantName');

    if (primary != null) {
      _primaryColor = Color(int.parse(primary.replaceFirst('#', '0xFF')));
    }
    if (secondary != null) {
      _secondaryColor = Color(int.parse(secondary.replaceFirst('#', '0xFF')));
    }

    if (_selectedMerchantId != null) {
      fetchBanners();
      fetchVouchers();
    }
    
    notifyListeners();
  }

  Future<void> fetchBanners() async {
    if (_selectedMerchantId == null) return;
    try {
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/companies/public/$_selectedMerchantId/banners'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        _banners = data.map((json) => PromoBanner.fromJson(json)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Error fetching banners: $e");
    }
  }

  Future<void> fetchVouchers() async {
    if (_selectedMerchantId == null) return;
    print("DEBUG: Fetching vouchers for company ID: $_selectedMerchantId");
    try {
      final url = '${ApiService.baseUrl}/companies/public/$_selectedMerchantId/vouchers';
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        print("DEBUG: Found ${data.length} vouchers");
        _vouchers = data.map((json) => Voucher.fromJson(json)).toList();
        notifyListeners();
      }
    } catch (e) {
      print("DEBUG: Error fetching vouchers: $e");
    }
  }

  Future<void> clearMerchant() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('selectedMerchantId');
    await prefs.remove('selectedMerchantName');
    await prefs.remove('primaryColor');
    await prefs.remove('secondaryColor');
    await prefs.remove('logoUrl');
    
    _selectedMerchantId = null;
    _selectedMerchantName = null;
    _primaryColor = const Color(0xFF3B82F6);
    _secondaryColor = const Color(0xFF1E293B);
    _logoUrl = null;
    _banners = [];
    _vouchers = [];
    notifyListeners();
  }

  Future<void> updateBranding({
    required String primaryHex,
    required String secondaryHex,
    String? logoUrl,
    int? merchantId,
    String? merchantName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('primaryColor', primaryHex);
    await prefs.setString('secondaryColor', secondaryHex);
    if (logoUrl != null) await prefs.setString('logoUrl', logoUrl);
    if (merchantId != null) await prefs.setInt('selectedMerchantId', merchantId);
    if (merchantName != null) await prefs.setString('selectedMerchantName', merchantName);

    _primaryColor = Color(int.parse(primaryHex.replaceFirst('#', '0xFF')));
    _secondaryColor = Color(int.parse(secondaryHex.replaceFirst('#', '0xFF')));
    _logoUrl = logoUrl;
    _selectedMerchantId = merchantId;
    _selectedMerchantName = merchantName;
    
    if (_selectedMerchantId != null) {
      fetchBanners();
      fetchVouchers();
    }
    
    notifyListeners();
  }
}
