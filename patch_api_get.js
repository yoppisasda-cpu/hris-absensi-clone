const fs = require('fs');
let content = fs.readFileSync('aivola_go/lib/services/api_service.dart', 'utf-8');

content = content.replace(
  "static Future<ApiResponse> get(String path) async {",
  "static Future<ApiResponse> get(String path, {Map<String, String>? headers}) async {"
);

content = content.replace(
  "headers: {\"Authorization\": \"Bearer $token\"},",
  "headers: {\"Authorization\": \"Bearer $token\", ...(headers ?? {})},"
);

fs.writeFileSync('aivola_go/lib/services/api_service.dart', content);
