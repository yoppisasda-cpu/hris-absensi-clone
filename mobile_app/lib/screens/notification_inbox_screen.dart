import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class NotificationInboxScreen extends StatefulWidget {
  @override
  _NotificationInboxScreenState createState() =>
      _NotificationInboxScreenState();
}

class _NotificationInboxScreenState extends State<NotificationInboxScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  List<dynamic> _notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      final data = await _apiService.getNotifications();
      setState(() {
        _notifications = data;
      });
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Gagal mengambil notifikasi: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(int id) async {
    try {
      await _apiService.markNotificationAsRead(id);
      _fetchNotifications(); // Refresh list
    } catch (e) {
      print('Mark read error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Notifikasi', style: TextStyle(color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: IconThemeData(color: Colors.black),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_off_outlined,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Belum ada notifikasi.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 16),
                  ),
                ],
              ),
            )
          : ListView.separated(
              itemCount: _notifications.length,
              padding: EdgeInsets.symmetric(vertical: 8),
              separatorBuilder: (context, index) => Divider(height: 1),
              itemBuilder: (context, index) {
                final notif = _notifications[index];
                final bool isRead = notif['isRead'] ?? false;
                final DateTime createdAt = DateTime.parse(
                  notif['createdAt'],
                ).toLocal();
                final String timeStr = DateFormat(
                  'dd MMM, HH:mm',
                ).format(createdAt);

                return Container(
                  color: isRead
                      ? Colors.white
                      : Colors.blue[50]?.withOpacity(0.3),
                  child: ListTile(
                    onTap: () {
                      if (!isRead) {
                        _markAsRead(notif['id']);
                      }
                      // Optional: Navigation based on message content
                    },
                    leading: CircleAvatar(
                      backgroundColor: isRead
                          ? Colors.grey[200]
                          : Colors.blue[100],
                      child: Icon(
                        isRead
                            ? Icons.notifications_none
                            : Icons.notifications_active,
                        color: isRead ? Colors.grey[600] : Colors.blue[800],
                        size: 20,
                      ),
                    ),
                    title: Text(
                      notif['title'] ?? 'Notifikasi',
                      style: TextStyle(
                        fontWeight: isRead
                            ? FontWeight.normal
                            : FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(height: 4),
                        Text(
                          notif['message'] ?? '',
                          style: TextStyle(color: Colors.black87, fontSize: 13),
                        ),
                        SizedBox(height: 4),
                        Text(
                          timeStr,
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
    );
  }
}
