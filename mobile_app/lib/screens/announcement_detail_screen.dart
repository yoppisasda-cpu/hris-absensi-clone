import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AnnouncementDetailScreen extends StatelessWidget {
  final Map<String, dynamic> announcement;

  const AnnouncementDetailScreen({Key? key, required this.announcement})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    final DateTime createdAt = DateTime.parse(
      announcement['createdAt'],
    ).toLocal();
    final String formattedDate = DateFormat(
      'dd MMMM yyyy, HH:mm',
      'id_ID',
    ).format(createdAt);
    final bool isPriority = announcement['isPriority'] ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text('Detail Pengumuman', style: TextStyle(color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (isPriority)
              Container(
                color: Colors.red[50],
                padding: EdgeInsets.symmetric(vertical: 8, horizontal: 20),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red[800], size: 16),
                    SizedBox(width: 8),
                    Text(
                      'PENGUMUMAN PENTING',
                      style: TextStyle(
                        color: Colors.red[800],
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            if (announcement['imageUrl'] != null)
              Builder(
                builder: (context) {
                  final String imageUrl = announcement['imageUrl'];
                  final String finalUrl = imageUrl.startsWith('http') 
                    ? imageUrl 
                    : 'https://api.aivola.id$imageUrl'; // Fallback for legacy local images
                  
                  return Image.network(
                    finalUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 100,
                      color: Colors.grey[200],
                      child: Icon(Icons.image_not_supported, color: Colors.grey),
                    ),
                  );
                },
              ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    announcement['title'] ?? 'Tanpa Judul',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.blueGrey[900],
                    ),
                  ),
                  SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: 14,
                        color: Colors.blueGrey[400],
                      ),
                      SizedBox(width: 6),
                      Text(
                        formattedDate,
                        style: TextStyle(
                          color: Colors.blueGrey[500],
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  Divider(height: 48, color: Colors.blueGrey[200]),
                  Text(
                    announcement['content'] ?? '',
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.6,
                      color: Colors.blueGrey[800],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
