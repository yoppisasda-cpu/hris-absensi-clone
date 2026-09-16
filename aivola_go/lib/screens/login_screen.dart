import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'merchant_selection_screen.dart';
import 'home_screen.dart';
import 'register_screen.dart';
import '../providers/branding_provider.dart';
import 'forgot_password_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/cart_provider.dart';

class LoginScreen extends StatefulWidget {
  final Uri? initialUri;

  const LoginScreen({Key? key, this.initialUri}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Use addPostFrameCallback to wait for the first frame and context availability
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkDeepLinkAndPersistence();
    });
  }

  bool _isProcessingDeepLink = true;

  Future<void> _checkDeepLinkAndPersistence() async {
    final uri = widget.initialUri ?? Uri.base;
    
    // Parse normal query parameters or fragment query parameters
    Map<String, String> queryParams = uri.queryParameters;
    if (uri.hasFragment && uri.fragment.contains('?')) {
      final fragmentUri = Uri.parse(uri.fragment);
      // Merge parameters (fragment takes precedence)
      queryParams = {...queryParams, ...fragmentUri.queryParameters};
    }

    final tenantParam = queryParams['tenant'];
    final tableParam = queryParams['table'];

    final branding = Provider.of<BrandingProvider>(context, listen: false);
    final cart = Provider.of<CartProvider>(context, listen: false);

    if (tenantParam != null) {
      // Automatic QR Scan Login
      final tenantId = int.tryParse(tenantParam);
      if (tenantId != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('selectedMerchantId', tenantId);
        await branding.loadBranding();
        
        if (tableParam != null) {
          cart.tableNumber = tableParam;
        }
        
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => HomeScreen())
        );
        return;
      }
    }

    if (branding.selectedMerchantId != null) {
      // If a merchant was already selected, we can try to skip selection
      // but only if we are "logged in" or if the app allows guest discovery
      // For now, let's just go to HomeScreen if branding is loaded
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => HomeScreen())
      );
      return;
    }

    if (mounted) {
      setState(() {
        _isProcessingDeepLink = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = Colors.blueAccent;
    final secondaryColor = Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: secondaryColor,
      resizeToAvoidBottomInset: true,
      body: Container(
        height: MediaQuery.of(context).size.height,
        width: MediaQuery.of(context).size.width,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A),
              Color(0xFF1E293B),
            ],
          ),
        ),
        child: _isProcessingDeepLink 
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : SafeArea(
          child: SingleChildScrollView(
            physics: BouncingScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 30.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 60),
                  // Logo or Icon
                  Container(
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: primaryColor.withOpacity(0.3)),
                    ),
                    child: Image.network(
                      "https://aivola.id/logo.png", // Aivola Global Logo
                      height: 50, 
                      width: 50,
                      errorBuilder: (context, error, stackTrace) => Icon(Icons.coffee_rounded, size: 50, color: Colors.blueAccent),
                    ),
                  ),
                  SizedBox(height: 30),
                  Text(
                    "Aivola GO",
                    style: GoogleFonts.outfit(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    "Welcome to the ecosystem",
                    style: GoogleFonts.outfit(
                      fontSize: 16,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  SizedBox(height: 40),
                  
                  // Email Field
                  TextField(
                    controller: _emailController,
                    style: TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: "Email Address",
                      labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.05),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                        borderSide: BorderSide(color: Color(0xFF94A3B8).withOpacity(0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                        borderSide: BorderSide(color: primaryColor),
                      ),
                      prefixIcon: Icon(Icons.email_outlined, color: Color(0xFF94A3B8)),
                    ),
                  ),
                  SizedBox(height: 20),
                  
                  // Password Field
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    style: TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: "Password",
                      labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.05),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                        borderSide: BorderSide(color: Color(0xFF94A3B8).withOpacity(0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                        borderSide: BorderSide(color: primaryColor),
                      ),
                      prefixIcon: Icon(Icons.lock_outline_rounded, color: Color(0xFF94A3B8)),
                    ),
                  ),
                  SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => ForgotPasswordScreen()),
                        );
                      },
                      child: Text(
                        "Forgot Password?",
                        style: TextStyle(color: primaryColor, fontSize: 13),
                      ),
                    ),
                  ),
                  SizedBox(height: 30),
                  
                  // Error Message
                  if (authProvider.errorMessage != null)
                    Container(
                      padding: EdgeInsets.all(12),
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        authProvider.errorMessage!,
                        style: TextStyle(color: Colors.redAccent, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  SizedBox(height: 10),

                  // Login Button
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading 
                        ? null 
                        : () async {
                            final success = await authProvider.login(
                              _emailController.text, 
                              _passwordController.text
                            );
                            if (success) {
                              // Update branding
                              if (authProvider.user?['company'] != null) {
                                final company = authProvider.user!['company'];
                                brandingProvider.updateBranding(
                                  primaryHex: company['primaryColor'] ?? "#3B82F6",
                                  secondaryHex: company['secondaryColor'] ?? "#1E293B",
                                  logoUrl: company['logoUrl'],
                                );
                              }
                              
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute(builder: (context) => MerchantSelectionScreen())
                              );
                            }
                          },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                        elevation: 5,
                        shadowColor: primaryColor.withOpacity(0.5),
                      ),
                      child: authProvider.isLoading
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                          )
                        : Text(
                            "Sign In",
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                    ),
                  ),
                  
                  SizedBox(height: 15),
                  
                  // Guest Login Button
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (context) => MerchantSelectionScreen())
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: primaryColor),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                      ),
                      child: Text(
                        "Lanjutkan Tanpa Login",
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: primaryColor,
                        ),
                      ),
                    ),
                  ),

                  SizedBox(height: 40),
                  Center(
                    child: GestureDetector(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RegisterScreen()),
                      ),
                      child: RichText(
                        text: TextSpan(
                          text: "Don't have an account? ",
                          style: TextStyle(color: Color(0xFF94A3B8)),
                          children: [
                            TextSpan(
                              text: "Register Now",
                              style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
