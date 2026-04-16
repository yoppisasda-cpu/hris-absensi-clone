import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

class AssignmentDetailScreen extends StatefulWidget {
  final Map<String, dynamic> assignment;

  AssignmentDetailScreen({required this.assignment});

  @override
  _AssignmentDetailScreenState createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends State<AssignmentDetailScreen> {
  final ApiService _apiService = ApiService();
  bool _isSubmitting = false;
  File? _image;
  final _noteController = TextEditingController();

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera, imageQuality: 50);
    if (pickedFile != null) {
      setState(() => _image = File(pickedFile.path));
    }
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _isSubmitting = true);
    try {
      await _apiService.updateAssignmentStatus(widget.assignment['id'], status);
      Navigator.pop(context, true);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memperbarui status: $e')));
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  Future<void> _submitResult() async {
    if (_noteController.text.isEmpty && _image == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Berikan catatan atau foto bukti.')));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await _apiService.submitAssignmentResult(
        widget.assignment['id'], 
        _noteController.text,
        imagePath: _image?.path
      );
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hasil berhasil dikirim!')));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal mengirim hasil: $e')));
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.assignment;
    final status = task['status'];
    final createdAt = DateFormat('dd MMM yyyy HH:mm').format(DateTime.parse(task['createdAt']));

    return Scaffold(
      appBar: AppBar(
        title: Text('Detail Penugasan'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Info
              Container(
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.blue[100]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('TUGAS UTAMA', style: TextStyle(color: Colors.blue[800], fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                        Text(status, style: TextStyle(color: Colors.blue[600], fontWeight: FontWeight.bold, fontSize: 10)),
                      ],
                    ),
                    SizedBox(height: 12),
                    Text(task['title'], style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('Dibuat: $createdAt', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  ],
                ),
              ),

              SizedBox(height: 24),

              // Deskripsi
              Text('Instruksi / Detail', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              SizedBox(height: 12),
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  task['description'] ?? 'Tidak ada instruksi khusus.',
                  style: TextStyle(height: 1.5, color: Colors.grey[800]),
                ),
              ),

              SizedBox(height: 24),

              // Action Buttons based on status
              if (status == 'PENDING' && task['userId'] != null) ...[
                Text('Apakah Anda menerima tugas ini?', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : () => _updateStatus('IN_PROGRESS'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[700],
                          padding: EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text('TERIMA & MULAI', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ],

              if (status == 'IN_PROGRESS') ...[
                Divider(height: 48),
                Text('Kirim Hasil Pekerjaan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                SizedBox(height: 16),
                TextField(
                  controller: _noteController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Tuliskan catatan hasil pekerjaan Anda di sini...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                    fillColor: Colors.white,
                    filled: true,
                  ),
                ),
                SizedBox(height: 16),
                GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    height: 150,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                    ),
                    child: _image == null 
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_alt, size: 40, color: Colors.grey[400]),
                            SizedBox(height: 8),
                            Text('Unggah Foto Bukti (Optional)', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                          ],
                        )
                      : ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.file(_image!, fit: BoxFit.cover, width: double.infinity),
                        ),
                  ),
                ),
                SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitResult,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal[700],
                    padding: EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                    shadowColor: Colors.teal.withOpacity(0.4),
                  ),
                  child: _isSubmitting 
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text('SUBMIT HASIL SEKARANG', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                ),
              ],

              if (status == 'COMPLETED') ...[
                Divider(height: 48),
                Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.teal),
                    SizedBox(width: 8),
                    Text('Hasil Sudah Dikirim', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.teal)),
                  ],
                ),
                SizedBox(height: 16),
                Container(
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.teal[50], 
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.teal[100]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(task['resultNote'] ?? 'Tidak ada catatan.', style: TextStyle(fontSize: 14)),
                      if (task['resultImageUrl'] != null) ...[
                        SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            task['resultImageUrl'].startsWith('http') 
                                ? task['resultImageUrl'] 
                                : '${ApiService.baseUrl.replaceAll('/api', '')}/${task['resultImageUrl']}',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
}
