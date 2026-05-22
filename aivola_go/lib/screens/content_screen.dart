import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ContentScreen extends StatelessWidget {
  final String title;
  final String content;

  ContentScreen({required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFF1E293B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(25),
        child: Text(
          content,
          style: TextStyle(color: Colors.white70, height: 1.8, fontSize: 14),
        ),
      ),
    );
  }
}
