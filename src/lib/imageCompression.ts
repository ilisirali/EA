export const compressImage = async (
    file: File,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8
): Promise<File> => {
    // We only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions preserving aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file); // Fallback to original file
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg', // convert to jpeg for better compression
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file); // Fallback to original
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                resolve(file); // Fallback if image loading fails
            };
        };

        reader.onerror = () => {
            resolve(file); // Fallback if reader fails
        };
    });
};
