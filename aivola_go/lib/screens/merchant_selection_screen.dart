
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../models/merchant.dart';
import '../providers/branding_provider.dart';
import '../providers/branch_provider.dart';
import '../providers/product_provider.dart';
import 'home_screen.dart';
import 'login_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MerchantSelectionScreen extends StatefulWidget {
  @override
  _MerchantSelectionScreenState createState() => _MerchantSelectionScreenState();
}

class _MerchantSelectionScreenState extends State<MerchantSelectionScreen> {
  List<Merchant> _merchants = [];
  bool _isLoading = true;
  String _searchQuery = "";
  final TextEditingController _searchController = TextEditingController();
  bool _isSortingByDistance = false;

  @override
  void initState() {
    super.initState();
    _fetchMerchants();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Merchant> get _filteredMerchants {
    List<Merchant> list = _merchants;
    if (_searchQuery.isNotEmpty) {
      list = list.where((m) => m.name.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }
    
    if (_isSortingByDistance) {
      list.sort((a, b) => (a.distance ?? double.infinity).compareTo(b.distance ?? double.infinity));
    }
    
    return list;
  }

  Future<void> _findNearest() async {
    setState(() => _isLoading = true);
    try {
      // 1. Check Permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }

      // 2. Get Position
      Position pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);

      // 3. Calculate Distances
      for (var merchant in _merchants) {
        double minDistance = double.infinity;
        for (var branch in merchant.branches) {
          if (branch.latitude != null && branch.longitude != null) {
            double d = Geolocator.distanceBetween(
              pos.latitude, pos.longitude, branch.latitude!, branch.longitude!
            ) / 1000; // to KM
            if (d < minDistance) minDistance = d;
          }
        }
        merchant.distance = minDistance == double.infinity ? null : minDistance;
      }

      setState(() {
        _isSortingByDistance = true;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Geolocation error: $e")));
    }
  }

  Future<void> _fetchMerchants() async {
    try {
      final response = await ApiService.get('/companies/public');
      if (response.statusCode == 200) {
        setState(() {
          _merchants = (response.data as List).map((m) => Merchant.fromJson(m)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to load merchants: $e"), backgroundColor: Colors.red),
      );
    }
  }

  void _selectMerchant(Merchant merchant) async {
    final brandingProvider = Provider.of<BrandingProvider>(context, listen: false);
    final productProvider = Provider.of<ProductProvider>(context, listen: false);
    
    // Update branding
    brandingProvider.updateBranding(
      primaryHex: merchant.primaryColor ?? "#3B82F6",
      secondaryHex: merchant.secondaryColor ?? "#1E293B",
      logoUrl: merchant.logoUrl,
      merchantId: merchant.id,
      merchantName: merchant.name,
    );

    // Scope products to this merchant
    productProvider.setCompany(merchant.id);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => HomeScreen())
    );
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Colors.blueAccent;
    final secondaryColor = Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: secondaryColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(25.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Aivola GO",
                    style: GoogleFonts.outfit(
                      fontSize: 28, 
                      fontWeight: FontWeight.bold, 
                      color: Colors.white
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.logout_rounded, color: Colors.white70),
                    onPressed: _logout,
                    tooltip: "Logout",
                  ),
                ],
              ),
              Text(
                "Explore our ecosystem and pick a merchant",
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
              ),
              SizedBox(height: 25),
              // Search Bar & Location
              Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: TextField(
                        controller: _searchController,
                        style: TextStyle(color: Colors.white),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                          });
                        },
                        decoration: InputDecoration(
                          hintText: "Search brands...",
                          hintStyle: TextStyle(color: Colors.white38),
                          prefixIcon: Icon(Icons.search, color: Colors.white38),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 15),
                          suffixIcon: _searchQuery.isNotEmpty 
                            ? IconButton(
                                icon: Icon(Icons.clear, color: Colors.white38),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = "");
                                },
                              )
                            : null,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 10),
                  GestureDetector(
                    onTap: _findNearest,
                    child: Container(
                      padding: EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: _isSortingByDistance ? primaryColor : Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Icon(
                        _isSortingByDistance ? Icons.my_location : Icons.location_on_outlined, 
                        color: Colors.white, 
                        size: 20
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 30),
              _isLoading
                  ? Center(child: CircularProgressIndicator(color: primaryColor))
                  : Expanded(
                      child: _filteredMerchants.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.search_off_rounded, color: Colors.white24, size: 60),
                                SizedBox(height: 15),
                                Text("No merchants found", style: TextStyle(color: Colors.white38)),
                              ],
                            ),
                          )
                        : GridView.builder(
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 15,
                              mainAxisSpacing: 15,
                              childAspectRatio: 0.7, // Slightly taller to prevent overflow
                            ),
                            itemCount: _filteredMerchants.length,
                            itemBuilder: (context, index) {
                              final merchant = _filteredMerchants[index];
                              final merchantColor = merchant.primaryColor != null 
                                  ? Color(int.parse(merchant.primaryColor!.replaceFirst('#', '0xFF')))
                                  : Colors.blueAccent;

                              return GestureDetector(
                                onTap: () => _selectMerchant(merchant),
                                child: Container(
                                  padding: EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: Color(0xFF1E293B),
                                    borderRadius: BorderRadius.circular(25),
                                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.2),
                                        blurRadius: 10,
                                        offset: Offset(0, 5),
                                      )
                                    ],
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Expanded( // Use Expanded to make the logo area flexible
                                        child: Center(
                                          child: Container(
                                            height: 80,
                                            width: 80,
                                            padding: EdgeInsets.all(3),
                                            decoration: BoxDecoration(
                                              gradient: LinearGradient(
                                                colors: [merchantColor.withOpacity(0.5), merchantColor.withOpacity(0.1)],
                                                begin: Alignment.topLeft,
                                                end: Alignment.bottomRight,
                                              ),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Container(
                                              padding: EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: Color(0xFF1E293B),
                                                shape: BoxShape.circle,
                                              ),
                                              child: merchant.logoUrl != null && merchant.logoUrl!.isNotEmpty
                                                  ? ClipOval(
                                                        child: Image.network(
                                                          ApiService.resolveUrl(merchant.logoUrl),
                                                        fit: BoxFit.cover,
                                                        loadingBuilder: (context, child, loadingProgress) {
                                                          if (loadingProgress == null) return child;
                                                          return Center(
                                                            child: SizedBox(
                                                              width: 20,
                                                              height: 20,
                                                              child: CircularProgressIndicator(
                                                                strokeWidth: 2,
                                                                color: merchantColor,
                                                              ),
                                                            ),
                                                          );
                                                        },
                                                        errorBuilder: (c, e, s) => Icon(Icons.store_rounded, color: merchantColor, size: 30),
                                                      ),
                                                    )
                                                  : Icon(Icons.store_rounded, color: merchantColor, size: 30),
                                            ),
                                          ),
                                        ),
                                      ),
                                      SizedBox(height: 10),
                                      Text(
                                        merchant.name,
                                        textAlign: TextAlign.center,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.outfit(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                      if (merchant.distance != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 8.0),
                                          child: Container(
                                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: primaryColor.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              "${merchant.distance!.toStringAsFixed(1)} km",
                                              style: TextStyle(
                                                color: primaryColor,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold
                                              ),
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
