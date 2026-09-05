const fs = require('fs');
let content = fs.readFileSync('aivola_go/lib/screens/home_screen.dart', 'utf-8');

content = content.replace(
  "child: Image.network(banner.imageUrl, fit: BoxFit.cover",
  "child: Image.network(banner.imageUrl.startsWith('http') ? banner.imageUrl : '${ApiService.baseUrl.replaceAll('/api', '')}${banner.imageUrl}', fit: BoxFit.cover"
);

fs.writeFileSync('aivola_go/lib/screens/home_screen.dart', content);
