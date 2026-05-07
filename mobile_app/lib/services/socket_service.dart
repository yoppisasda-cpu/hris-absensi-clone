
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import '../main.dart';
import 'package:flutter/material.dart';

class SocketService extends ChangeNotifier {
  IO.Socket? socket;
  bool isConnected = false;
  List<Map<String, dynamic>> newOrders = [];
  final AudioPlayer _audioPlayer = AudioPlayer();

  SocketService() {
    _initSocket();
    _fetchActiveOrders();
  }

  void _playNotificationSound() async {
    print('[Socket] Attempting to play notification sound (HERO)...');
    try {
      // 1. Play local asset sound (Hero.aiff) - much louder
      await _audioPlayer.play(AssetSource('sounds/notification.aiff'), volume: 1.0);
      
      print('[Socket] Sound playback commands sent');
    } catch (e) {
      print('[Socket] Error playing sound: $e');
    }
  }

  void testNotificationSound() {
    _playNotificationSound();
  }

  Future<void> _fetchActiveOrders() async {
    try {
      final activeOrders = await ApiService().getActiveOrders();
      newOrders = List<Map<String, dynamic>>.from(activeOrders);
      notifyListeners();
      print('[Socket] Loaded ${newOrders.length} active orders from API');
    } catch (e) {
      print('[Socket] Failed to fetch active orders: $e');
    }
  }

  void reconnect() {
    socket?.disconnect();
    socket?.dispose();
    _initSocket();
    _fetchActiveOrders();
  }

  void _initSocket() async {
    final prefs = await SharedPreferences.getInstance();
    var branchId = prefs.getInt('branchId'); // POS should have branchId saved
    
    // Fallback: If no branchId (like for Owner), try to fetch first branch from API
    if (branchId == null) {
      print('[Socket] No branchId found in prefs, fetching from API...');
      final branches = await ApiService().getBranches();
      if (branches.isNotEmpty) {
        branchId = branches[0]['id'];
        print('[Socket] Using fallback branchId: $branchId');
        await prefs.setInt('branchId', branchId!);
      }
    }

    // Extract base domain from ApiService.baseUrl (e.g. http://192.168.0.219:5005)
    String socketUrl = ApiService.baseUrl.replaceAll('/api', '');

    socket = IO.io(socketUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setQuery({'branchId': branchId})
        .enableAutoConnect()
        .build()
    );

    socket!.onConnect((_) {
      print('[Socket] Connected to server');
      isConnected = true;
      if (branchId != null) {
        socket!.emit('register_branch', branchId);
      }
      notifyListeners();
    });

    socket!.onDisconnect((_) {
      print('[Socket] Disconnected');
      isConnected = false;
      notifyListeners();
    });

    socket!.on('new_mobile_order', (data) {
      print('[Socket] New Order Received: $data');
      
      // Visual feedback via SnackBar
      scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.notifications_active, color: Colors.white),
              SizedBox(width: 12),
              Text('PESANAN BARU MASUK!', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          backgroundColor: Colors.blue[800],
          duration: Duration(seconds: 5),
          behavior: SnackBarBehavior.floating,
        ),
      );

      // Ensure data is mutable and fields are safe
      Map<String, dynamic> safeData = Map<String, dynamic>.from(data);
      
      // Force totalAmount to be a double and handle null
      var rawAmount = safeData['totalAmount'];
      if (rawAmount == null) {
        safeData['totalAmount'] = 0.0;
      } else {
        safeData['totalAmount'] = double.tryParse(rawAmount.toString()) ?? 0.0;
      }

      newOrders.insert(0, safeData);
      _playNotificationSound();
      notifyListeners();
    });
  }

  void clearOrders() {
    newOrders.clear();
    notifyListeners();
  }

  void removeOrder(int id) {
    newOrders.removeWhere((o) => o['id'] == id);
    notifyListeners();
  }

  @override
  void dispose() {
    socket?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }
}
