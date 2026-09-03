import 'dart:io';

void main() {
  var file = File('aivola_go/lib/services/api_service.dart');
  var content = file.readAsStringSync();
  
  // Replace the bad replacement
  content = content.replaceAll(
    'return {"success": false, "message": data["error"] ?? "Terjadi kesalahan sistem"};',
    '''
      final errData = jsonDecode(response.body);
      return {"success": false, "message": errData["error"] ?? "Terjadi kesalahan sistem"};
    '''
  );
  
  file.writeAsStringSync(content);
}
