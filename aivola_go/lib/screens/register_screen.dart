import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  int _step = 1; // 1 = form data, 2 = OTP

  // Countdown timer for OTP resend
  int _countdown = 0;
  Timer? _timer;

  static const primaryColor = Color(0xFF6C63FF);
  static const bgColor = Color(0xFF0F0E17);

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() => _countdown = 300); // 5 menit
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 0) {
        t.cancel();
      } else {
        setState(() => _countdown--);
      }
    });
  }

  String get _countdownText {
    final m = _countdown ~/ 60;
    final s = _countdown % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.sendOtp(_phoneController.text.trim());
      if (result['success'] == true) {
        setState(() => _step = 2);
        _startCountdown();
        _showSnack('OTP dikirim ke WhatsApp Anda!', isError: false);
      } else {
        _showSnack(result['message'] ?? 'Gagal mengirim OTP');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _resendOtp() async {
    if (_countdown > 0) return;
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.sendOtp(_phoneController.text.trim());
      if (result['success'] == true) {
        _startCountdown();
        _showSnack('OTP baru telah dikirim!', isError: false);
      } else {
        _showSnack(result['message'] ?? 'Gagal mengirim OTP');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _register() async {
    if (_otpController.text.trim().length != 6) {
      _showSnack('Masukkan 6 digit kode OTP');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.registerCustomer(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
        otp: _otpController.text.trim(),
      );
      if (result['success'] == true) {
        _showSnack('Pendaftaran berhasil! Selamat datang di Aivola!', isError: false);
        await Future.delayed(const Duration(milliseconds: 800));
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => HomeScreen()),
            (route) => false,
          );
        }
      } else {
        _showSnack(result['message'] ?? 'Pendaftaran gagal');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnack(String msg, {bool isError = true}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red[700] : Colors.green[700],
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Back button
              GestureDetector(
                onTap: () {
                  if (_step == 2) {
                    setState(() {
                      _step = 1;
                      _timer?.cancel();
                      _otpController.clear();
                    });
                  } else {
                    Navigator.pop(context);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                ),
              ),
              const SizedBox(height: 32),

              // Header
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _step == 1
                    ? _buildStep1Header()
                    : _buildStep2Header(),
              ),
              const SizedBox(height: 32),

              // Form
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _step == 1
                    ? _buildStep1Form()
                    : _buildStep2Form(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep1Header() {
    return Column(
      key: const ValueKey('h1'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Step indicator
        Row(
          children: [
            _stepDot(1, active: true),
            _stepLine(),
            _stepDot(2, active: false),
          ],
        ),
        const SizedBox(height: 24),
        const Text('Buat Akun Baru', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text('Bergabung dan nikmati pengalaman belanja terbaik', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14)),
      ],
    );
  }

  Widget _buildStep2Header() {
    return Column(
      key: const ValueKey('h2'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _stepDot(1, active: true, done: true),
            _stepLine(done: true),
            _stepDot(2, active: true),
          ],
        ),
        const SizedBox(height: 24),
        const Text('Verifikasi OTP', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(
          'Masukkan kode 6 digit yang dikirim ke WhatsApp\n${_phoneController.text}',
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
        ),
      ],
    );
  }

  Widget _stepDot(int n, {required bool active, bool done = false}) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: active ? primaryColor : Colors.white.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: done
            ? const Icon(Icons.check, color: Colors.white, size: 16)
            : Text('$n', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _stepLine({bool done = false}) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.symmetric(horizontal: 8),
        color: done ? primaryColor : Colors.white.withOpacity(0.1),
      ),
    );
  }

  Widget _buildStep1Form() {
    return Form(
      key: _formKey,
      child: Column(
        key: const ValueKey('f1'),
        children: [
          _buildField(
            controller: _nameController,
            label: 'Nama Lengkap',
            icon: Icons.person_outline,
            validator: (v) => (v == null || v.isEmpty) ? 'Nama wajib diisi' : null,
          ),
          const SizedBox(height: 16),
          _buildField(
            controller: _emailController,
            label: 'Email',
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            validator: (v) {
              if (v == null || v.isEmpty) return 'Email wajib diisi';
              if (!v.contains('@')) return 'Format email tidak valid';
              return null;
            },
          ),
          const SizedBox(height: 16),
          _buildField(
            controller: _passwordController,
            label: 'Password',
            icon: Icons.lock_outline,
            obscure: _obscurePassword,
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: Colors.white38),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Password wajib diisi';
              if (v.length < 6) return 'Password minimal 6 karakter';
              return null;
            },
          ),
          const SizedBox(height: 16),
          _buildField(
            controller: _phoneController,
            label: 'Nomor HP (WhatsApp)',
            icon: Icons.phone_android,
            keyboardType: TextInputType.phone,
            hint: 'Contoh: 08123456789',
            validator: (v) {
              if (v == null || v.isEmpty) return 'Nomor HP wajib diisi';
              if (v.length < 10) return 'Nomor HP tidak valid';
              return null;
            },
          ),
          const SizedBox(height: 32),
          _buildPrimaryButton(
            label: 'KIRIM OTP KE WHATSAPP',
            icon: Icons.send,
            onPressed: _sendOtp,
          ),
          const SizedBox(height: 20),
          Center(
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: RichText(
                text: TextSpan(
                  text: 'Sudah punya akun? ',
                  style: TextStyle(color: Colors.white.withOpacity(0.5)),
                  children: const [
                    TextSpan(text: 'Masuk', style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildStep2Form() {
    return Column(
      key: const ValueKey('f2'),
      children: [
        // OTP Input
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.07),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: primaryColor.withOpacity(0.4)),
          ),
          child: TextField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
              letterSpacing: 12,
            ),
            decoration: const InputDecoration(
              border: InputBorder.none,
              counterText: '',
              hintText: '------',
              hintStyle: TextStyle(color: Colors.white24, fontSize: 32, letterSpacing: 12),
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Countdown & Resend
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.timer_outlined, color: Colors.white38, size: 16),
            const SizedBox(width: 6),
            Text(
              _countdown > 0 ? 'Kirim ulang dalam $_countdownText' : 'OTP sudah kedaluarsa',
              style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: _countdown == 0 ? _resendOtp : null,
          child: Text(
            'Kirim Ulang OTP',
            style: TextStyle(
              color: _countdown == 0 ? primaryColor : Colors.white24,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
        const SizedBox(height: 32),
        _buildPrimaryButton(
          label: 'VERIFIKASI & DAFTAR',
          icon: Icons.verified_user,
          onPressed: _register,
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscure = false,
    Widget? suffixIcon,
    String? hint,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      style: const TextStyle(color: Colors.white),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: TextStyle(color: Colors.white24, fontSize: 13),
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
        prefixIcon: Icon(icon, color: primaryColor.withOpacity(0.7), size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white.withOpacity(0.07),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: primaryColor.withOpacity(0.6), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
        ),
        errorStyle: const TextStyle(color: Colors.redAccent),
      ),
    );
  }

  Widget _buildPrimaryButton({required String label, required IconData icon, required VoidCallback onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: _isLoading ? null : onPressed,
        icon: _isLoading
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Icon(icon, size: 20),
        label: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          disabledBackgroundColor: primaryColor.withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
      ),
    );
  }
}
