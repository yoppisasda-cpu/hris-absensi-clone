import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../models/branch.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BranchProvider with ChangeNotifier {
  List<Branch> _branches = [];
  Branch? _selectedBranch;
  bool _isLoading = false;

  List<Branch> get branches => _branches;
  Branch? get selectedBranch => _selectedBranch;
  bool get isLoading => _isLoading;

  Future<void> loadBranches({int? companyId}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await ApiService.fetchBranches(companyId: companyId);
      _branches = data.map((b) => Branch.fromJson(b)).toList();
      
      // Load saved branch if exists
      final prefs = await SharedPreferences.getInstance();
      final savedId = prefs.getInt('selectedBranchId');
      if (savedId != null && _branches.any((b) => b.id == savedId)) {
        _selectedBranch = _branches.firstWhere((b) => b.id == savedId);
      } else if (_branches.isNotEmpty) {
        _selectedBranch = _branches.first;
      } else {
        _selectedBranch = null; // Clear if no branches found for this merchant
      }
    } catch (e) {
      print("Failed to load branches: $e");
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> findNearestBranch() async {
    _isLoading = true;
    notifyListeners();

    try {
      // 1. Check Permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _isLoading = false;
          notifyListeners();
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      // 2. Get Current Location
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high
      );

      // 3. Find Closest
      if (_branches.isNotEmpty) {
        Branch? closest;
        double minDistance = double.infinity;

        for (var branch in _branches) {
          if (branch.latitude != null && branch.longitude != null) {
            double distance = Geolocator.distanceBetween(
              position.latitude,
              position.longitude,
              branch.latitude!,
              branch.longitude!
            );

            if (distance < minDistance) {
              minDistance = distance;
              closest = branch;
            }
          }
        }

        if (closest != null) {
          selectBranch(closest);
        }
      }
    } catch (e) {
      print("Error finding nearest branch: $e");
    }

    _isLoading = false;
    notifyListeners();
  }

  void selectBranch(Branch branch) async {
    _selectedBranch = branch;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('selectedBranchId', branch.id);
    notifyListeners();
  }
}
