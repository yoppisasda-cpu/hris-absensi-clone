#!/bin/bash
echo "Men-download Flutter SDK..."
git clone https://github.com/flutter/flutter.git -b stable --depth 1
export PATH="$PATH:`pwd`/flutter/bin"

echo "Mengaktifkan dukungan Flutter Web..."
flutter config --enable-web

echo "Mem-build aplikasi Flutter Web..."
flutter build web --release
