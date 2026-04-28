import 'package:flutter/material.dart';

class MaterialDetailScreen extends StatelessWidget {
  final dynamic material;

  MaterialDetailScreen({required this.material});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Isi Materi SOP', style: TextStyle(color: Colors.black, fontSize: 18, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.indigo[50],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                material['category'] ?? 'SOP',
                style: TextStyle(color: Colors.indigo, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(height: 16),
            Text(
              material['title'] ?? 'Judul Materi',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.grey[900]),
            ),
            SizedBox(height: 12),
            if (material['imageUrl'] != null)
              Container(
                margin: EdgeInsets.only(bottom: 24),
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: GestureDetector(
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (context) => Dialog(
                          backgroundColor: Colors.transparent,
                          insetPadding: EdgeInsets.zero,
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: InteractiveViewer(
                                  panEnabled: true,
                                  minScale: 0.5,
                                  maxScale: 4,
                                  child: Image.network(
                                    material['imageUrl'].startsWith('/uploads') 
                                      ? 'http://10.0.2.2:5000${material['imageUrl']}' 
                                      : material['imageUrl'],
                                    fit: BoxFit.contain,
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 40,
                                right: 20,
                                child: CircleAvatar(
                                  backgroundColor: Colors.black54,
                                  child: IconButton(
                                    icon: Icon(Icons.close, color: Colors.white),
                                    onPressed: () => Navigator.pop(context),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    child: Image.network(
                      material['imageUrl'].startsWith('/uploads') 
                        ? 'http://10.0.2.2:5000${material['imageUrl']}' 
                        : material['imageUrl'],
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          height: 200,
                          color: Colors.grey[100],
                          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 100,
                          color: Colors.red[50],
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.error_outline, color: Colors.red[300]),
                                SizedBox(height: 4),
                                Text('Gagal memuat gambar', style: TextStyle(fontSize: 10, color: Colors.red[300])),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            Divider(color: Colors.grey[200]),
            SizedBox(height: 24),
            Text(
              material['content'] ?? 'Tidak ada isi materi.',
              style: TextStyle(
                fontSize: 16, 
                height: 1.6, 
                color: Colors.grey[800],
                letterSpacing: 0.2
              ),
            ),
            SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}
