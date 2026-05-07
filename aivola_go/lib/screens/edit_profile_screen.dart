import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/branding_provider.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';

class EditProfileScreen extends StatefulWidget {
  @override
  _EditProfileScreenState createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  bool _isLoading = false;
  String? _avatarUrl;
  XFile? _imageFile;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _loadCurrentData();
  }

  Future<void> _loadCurrentData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _isLoading = true);
    
    final res = await ApiService.get("/users/me");
    final userData = res.statusCode == 200 ? res.data : null;
    
    setState(() {
      if (userData != null) {
        _nameController.text = userData['name'] ?? "";
        _emailController.text = userData['email'] ?? "";
        _phoneController.text = userData['phone'] ?? "";
        _avatarUrl = userData['avatarUrl'];
        
        // Sync prefs just in case
        prefs.setString('userName', _nameController.text);
        if (_avatarUrl != null) prefs.setString('userAvatar', _avatarUrl!);
      } else {
        _nameController.text = prefs.getString('userName') ?? "";
        _avatarUrl = prefs.getString('userAvatar');
      }
      _isLoading = false;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    
    String? finalAvatarUrl = _avatarUrl;

    if (_imageFile != null) {
      final uploadedUrl = await ApiService.uploadAvatar(_imageFile!.path);
      if (uploadedUrl != null) {
        finalAvatarUrl = uploadedUrl;
      }
    }

    final result = await ApiService.updateProfile(
      name: _nameController.text,
      email: _emailController.text,
      phone: _phoneController.text,
      avatarUrl: finalAvatarUrl,
    );

    setState(() => _isLoading = false);

    if (result['success']) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('userName', _nameController.text);
      if (finalAvatarUrl != null) {
        await prefs.setString('userAvatar', finalAvatarUrl);
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Profil berhasil diperbarui!"), backgroundColor: Colors.greenAccent),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.redAccent),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: brandingProvider.secondaryColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Edit Profil", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(25),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              _buildAvatarPicker(primaryColor),
              SizedBox(height: 40),
              _buildTextField("Nama Lengkap", _nameController, Icons.person_outline),
              SizedBox(height: 20),
              _buildTextField("Email", _emailController, Icons.email_outlined, keyboardType: TextInputType.emailAddress),
              SizedBox(height: 20),
              _buildTextField("Nomor Telepon", _phoneController, Icons.phone_android_outlined, keyboardType: TextInputType.phone),
              SizedBox(height: 50),
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  ),
                  child: _isLoading 
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text("Simpan Perubahan", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    final XFile? selected = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 50,
    );
    if (selected != null) {
      setState(() {
        _imageFile = selected;
      });
    }
  }

  Widget _buildAvatarPicker(Color primaryColor) {
    return Center(
      child: Stack(
        children: [
          GestureDetector(
            onTap: _pickImage,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: primaryColor, width: 3),
                image: _imageFile != null
                    ? DecorationImage(
                        image: FileImage(File(_imageFile!.path)),
                        fit: BoxFit.cover,
                      )
                    : DecorationImage(
                        image: (_avatarUrl != null && _avatarUrl!.isNotEmpty)
                            ? CachedNetworkImageProvider(ApiService.resolveUrl(_avatarUrl))
                            : NetworkImage("https://ui-avatars.com/api/?name=${_nameController.text}&background=random&size=200") as ImageProvider,
                        fit: BoxFit.cover,
                      ),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: GestureDetector(
              onTap: _pickImage,
              child: Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(color: primaryColor, shape: BoxShape.circle),
                child: Icon(Icons.camera_alt_outlined, color: Colors.white, size: 20),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {TextInputType? keyboardType}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
        SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          style: TextStyle(color: Colors.white),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: Colors.white24),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
            contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 15),
          ),
          validator: (value) => value == null || value.isEmpty ? "Field ini wajib diisi" : null,
        ),
      ],
    );
  }
}
