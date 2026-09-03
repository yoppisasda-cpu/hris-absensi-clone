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
  String? _openTime;
  String? _closeTime;
  bool _isOpenManual = true;
  String? _timezone;
  bool _allowDineIn = true;
  bool _allowPickUp = true;
  bool _allowDelivery = true;
  bool _allowOnlineOrder = true;
  bool _allowPreOrder = false;
  String? _qrisUrl;
  String? _paymentInstructions;

  Color get primaryColor => _primaryColor;
  Color get secondaryColor => _secondaryColor;
  String? get logoUrl => _logoUrl;
  int? get selectedMerchantId => _selectedMerchantId;
  String? get selectedMerchantName => _selectedMerchantName;
  List<PromoBanner> get banners => _banners;
  List<Voucher> get vouchers => _vouchers;
  String? get timezone => _timezone;
  bool get allowDineIn => _allowDineIn;
  bool get allowPickUp => _allowPickUp;
  bool get allowDelivery => _allowDelivery;
  bool get allowOnlineOrder => _allowOnlineOrder;
  bool get allowPreOrder => _allowPreOrder;
  String? get qrisUrl => _qrisUrl;
  String? get paymentInstructions => _paymentInstructions;

  bool get isStoreOpen {
    if (!_isOpenManual) return false;
    
    if (_openTime != null && _closeTime != null) {
      final now = DateTime.now();
      try {
        final openParts = _openTime!.split(':');
        final closeParts = _closeTime!.split(':');
        
        final openMinutes = int.parse(openParts[0]) * 60 + int.parse(openParts[1]);
        final closeMinutes = int.parse(closeParts[0]) * 60 + int.parse(closeParts[1]);
        final currentMinutes = now.hour * 60 + now.minute;
        
        if (closeMinutes < openMinutes) {
          if (currentMinutes < openMinutes && currentMinutes > closeMinutes) {
            return false;
          }
        } else {
          if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
            return false;
          }
        }
      } catch (e) {
        print("Error parsing store hours: $e");
      }
    }
    return true;
  }

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
    _openTime = prefs.getString('openTime');
    _closeTime = prefs.getString('closeTime');
    _isOpenManual = prefs.getBool('isOpenManual') ?? true;
    _timezone = prefs.getString('timezone');
    _allowDineIn = prefs.getBool('allowDineIn') ?? true;
    _allowPickUp = prefs.getBool('allowPickUp') ?? true;
    _allowDelivery = prefs.getBool('allowDelivery') ?? true;
    _allowOnlineOrder = prefs.getBool('allowOnlineOrder') ?? true;
    _allowPreOrder = prefs.getBool('allowPreOrder') ?? false;
    _qrisUrl = prefs.getString('qrisUrl');
    _paymentInstructions = prefs.getString('paymentInstructions');

    if (primary != null) {
      _primaryColor = Color(int.parse(primary.replaceFirst('#', '0xFF')));
    }
    if (secondary != null) {
      _secondaryColor = Color(int.parse(secondary.replaceFirst('#', '0xFF')));
    }

    if (_selectedMerchantId != null) {
      fetchLatestMerchantInfo(_selectedMerchantId!);
      fetchBanners();
      fetchVouchers();
    }
    
    notifyListeners();
  }

  Future<void> fetchLatestMerchantInfo(int merchantId) async {
    try {
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/companies/public/$merchantId'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        final primaryHex = data['primaryColor'] ?? "#3B82F6";
        final secondaryHex = data['secondaryColor'] ?? "#1E293B";
        
        _primaryColor = Color(int.parse(primaryHex.replaceFirst('#', '0xFF')));
        _secondaryColor = Color(int.parse(secondaryHex.replaceFirst('#', '0xFF')));
        
        _logoUrl = data['logoUrl'];
        _selectedMerchantName = data['name'];
        _openTime = data['openTime'];
        _closeTime = data['closeTime'];
        _isOpenManual = data['isOpenManual'] ?? true;
        _timezone = data['timezone'];
        _allowDineIn = data['allowDineIn'] ?? true;
        _allowPickUp = data['allowPickUp'] ?? true;
        _allowDelivery = data['allowDelivery'] ?? true;
        _allowOnlineOrder = data['allowOnlineOrder'] ?? true;
        _allowPreOrder = data['allowPreOrder'] ?? false;
        _qrisUrl = data['qrisUrl'];
        _paymentInstructions = data['paymentInstructions'];
        
        // Update SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('primaryColor', primaryHex);
        await prefs.setString('secondaryColor', secondaryHex);
        if (_logoUrl != null) await prefs.setString('logoUrl', _logoUrl!);
        if (_selectedMerchantName != null) await prefs.setString('selectedMerchantName', _selectedMerchantName!);
        if (_openTime != null) await prefs.setString('openTime', _openTime!);
        if (_closeTime != null) await prefs.setString('closeTime', _closeTime!);
        await prefs.setBool('isOpenManual', _isOpenManual);
        if (_timezone != null) await prefs.setString('timezone', _timezone!);
        await prefs.setBool('allowDineIn', _allowDineIn);
        await prefs.setBool('allowPickUp', _allowPickUp);
        await prefs.setBool('allowDelivery', _allowDelivery);
        await prefs.setBool('allowOnlineOrder', _allowOnlineOrder);
        await prefs.setBool('allowPreOrder', _allowPreOrder);
        if (_qrisUrl != null) await prefs.setString('qrisUrl', _qrisUrl!);
        if (_paymentInstructions != null) await prefs.setString('paymentInstructions', _paymentInstructions!);
        
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Error fetching latest merchant info: $e");
    }
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
    _openTime = null;
    _closeTime = null;
    _isOpenManual = true;
    _timezone = null;
    _allowDineIn = true;
    _allowPickUp = true;
    _allowDelivery = true;
    _qrisUrl = null;
    _paymentInstructions = null;
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
    String? openTime,
    String? closeTime,
    bool isOpenManual = true,
    String? timezone,
    bool allowDineIn = true,
    bool allowPickUp = true,
    bool allowDelivery = true,
    bool allowOnlineOrder = true,
    bool allowPreOrder = false,
    String? qrisUrl,
    String? paymentInstructions,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('primaryColor', primaryHex);
    await prefs.setString('secondaryColor', secondaryHex);
    if (logoUrl != null) await prefs.setString('logoUrl', logoUrl);
    if (merchantId != null) await prefs.setInt('selectedMerchantId', merchantId);
    if (merchantName != null) await prefs.setString('selectedMerchantName', merchantName);
    if (openTime != null) await prefs.setString('openTime', openTime);
    if (closeTime != null) await prefs.setString('closeTime', closeTime);
    await prefs.setBool('isOpenManual', isOpenManual);
    if (timezone != null) await prefs.setString('timezone', timezone);
    await prefs.setBool('allowDineIn', allowDineIn);
    await prefs.setBool('allowPickUp', allowPickUp);
    await prefs.setBool('allowDelivery', allowDelivery);
    await prefs.setBool('allowOnlineOrder', allowOnlineOrder);
    await prefs.setBool('allowPreOrder', allowPreOrder);
    if (qrisUrl != null) await prefs.setString('qrisUrl', qrisUrl);
    if (paymentInstructions != null) await prefs.setString('paymentInstructions', paymentInstructions);

    _primaryColor = Color(int.parse(primaryHex.replaceFirst('#', '0xFF')));
    _secondaryColor = Color(int.parse(secondaryHex.replaceFirst('#', '0xFF')));
    _logoUrl = logoUrl;
    _selectedMerchantId = merchantId;
    _selectedMerchantName = merchantName;
    _openTime = openTime;
    _closeTime = closeTime;
    _isOpenManual = isOpenManual;
    _timezone = timezone;
    _allowDineIn = allowDineIn;
    _allowPickUp = allowPickUp;
    _allowDelivery = allowDelivery;
    _allowOnlineOrder = allowOnlineOrder;
    _allowPreOrder = allowPreOrder;
    _qrisUrl = qrisUrl;
    _paymentInstructions = paymentInstructions;
    
    if (_selectedMerchantId != null) {
      fetchBanners();
      fetchVouchers();
    }
    
    notifyListeners();
  }
}
