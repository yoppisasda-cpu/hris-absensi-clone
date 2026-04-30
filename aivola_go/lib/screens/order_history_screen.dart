
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/order_provider.dart';
import '../providers/branding_provider.dart';
import '../models/order.dart';

class CurrencyFormat {
  static String convertToIdr(dynamic number, int decimalDigit) {
    NumberFormat currencyFormatter = NumberFormat.currency(
      locale: 'id',
      symbol: 'Rp',
      decimalDigits: decimalDigit,
    );
    return currencyFormatter.format(number);
  }
}

class OrderHistoryScreen extends StatefulWidget {
  @override
  _OrderHistoryScreenState createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<OrderProvider>(context, listen: false).loadOrders();
    });
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: brandingProvider.secondaryColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Riwayat Pesanan", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
        centerTitle: true,
      ),
      body: orderProvider.isLoading
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : orderProvider.orders.isEmpty
              ? _buildEmptyState(orderProvider)
              : RefreshIndicator(
                  onRefresh: () => orderProvider.loadOrders(),
                  child: ListView.builder(
                    padding: EdgeInsets.all(20),
                    itemCount: orderProvider.orders.length,
                    itemBuilder: (context, index) {
                      return _buildOrderCard(orderProvider.orders[index]);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState(OrderProvider orderProvider) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.shopping_bag_outlined, size: 80, color: Color(0xFF334155)),
          SizedBox(height: 20),
          Text("Belum ada pesanan", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 10),
          Text("Yuk, pesan menu lezat favoritmu sekarang!", style: TextStyle(color: Color(0xFF64748B))),
          SizedBox(height: 30),
          ElevatedButton.icon(
            onPressed: () => orderProvider.loadOrders(),
            icon: Icon(Icons.refresh, color: Colors.white),
            label: Text("Muat Ulang", style: TextStyle(color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          )
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Container(
      margin: EdgeInsets.only(bottom: 15),
      padding: EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(order.invoiceNumber, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (order.status == 'PAID' ? Colors.greenAccent : Colors.orangeAccent).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  order.status, 
                  style: TextStyle(color: order.status == 'PAID' ? Colors.greenAccent : Colors.orangeAccent, fontSize: 10, fontWeight: FontWeight.bold)
                ),
              ),
            ],
          ),
          SizedBox(height: 5),
          Row(
            children: [
              Icon(Icons.access_time, color: Color(0xFF64748B), size: 12),
              SizedBox(width: 5),
              Text(
                DateFormat('dd MMM yyyy, HH:mm').format(order.date),
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              if (order.saleType != null) ...[
                SizedBox(width: 10),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(order.saleType!, style: TextStyle(color: primaryColor, fontSize: 10, fontWeight: FontWeight.bold)),
                )
              ]
            ],
          ),
          Divider(color: Colors.white.withOpacity(0.05), height: 25),
          ...order.items.take(3).map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text("${item.quantity}x ${item.productName}", style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13), overflow: TextOverflow.ellipsis)),
                Text(CurrencyFormat.convertToIdr(item.total, 0), style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13)),
              ],
            ),
          )),
          if (order.items.length > 3)
            Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text("+ ${order.items.length - 3} menu lainnya", style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
            ),
          
          if (order.voucherCode != null) ...[
            SizedBox(height: 12),
            Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.orangeAccent.withOpacity(0.05), borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  Icon(Icons.confirmation_number_rounded, color: Colors.orangeAccent, size: 14),
                  SizedBox(width: 8),
                  Text("Promo: ${order.voucherCode}", style: TextStyle(color: Colors.orangeAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                  Spacer(),
                  Text("- ${CurrencyFormat.convertToIdr(order.voucherDiscountAmount, 0)}", style: TextStyle(color: Colors.orangeAccent, fontSize: 12)),
                ],
              ),
            )
          ],

          Divider(color: Colors.white.withOpacity(0.05), height: 25),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Outlet", style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  Text(order.branchName ?? "Utama", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text("Total Pembayaran", style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  Text(CurrencyFormat.convertToIdr(order.totalAmount, 0), style: GoogleFonts.outfit(color: primaryColor, fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          )
        ],
      ),
    );
  }
}
