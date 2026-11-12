/**
 * Client-Side Image Compressor & Converter
 * 
 * Mengonversi dan mengompresi gambar langsung di browser sebelum proses upload.
 * Mereduksi ukuran file dari 5-15 MB (hasil kamera HP) menjadi ~80-150 KB berformat WebP
 * dalam hitungan milidetik, tanpa membutuhkan library pihak ketiga eksternal.
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0.1 s/d 1.0 (default 0.82)
}

export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

    // Jika bukan file gambar (misal pdf/dokumen), kembalikan file asli
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let { width, height } = img;

                // Hitung skala aspect ratio proporsional
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(file); // Fallback ke file asli jika context gagal
                }

                // Render dengan interpolasi halus
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Export ke format WebP (didukung penuh oleh semua browser modern)
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return resolve(file);
                        }

                        // Buat nama file baru dengan ekstensi .webp
                        const originalName = file.name;
                        const lastDotIndex = originalName.lastIndexOf('.');
                        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
                        const webpFilename = `${baseName}.webp`;

                        const compressedFile = new File([blob], webpFilename, {
                            type: 'image/webp',
                            lastModified: Date.now()
                        });

                        console.log(`[Image Compressor] Ukuran asli: ${(file.size / 1024).toFixed(1)} KB -> Terkompresi: ${(compressedFile.size / 1024).toFixed(1)} KB (WebP)`);
                        resolve(compressedFile);
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}
