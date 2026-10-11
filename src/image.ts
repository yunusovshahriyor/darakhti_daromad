/** Акс → мураббаъ (бурида аз марказ) JPEG-и хурд, то Storage пур нашавад (одатан 30–80 КБ). */
export async function squareJpeg(file: Blob, size = 512, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error('Ин файл акс нест ё хонда нашуд');
  });
  const side = Math.min(bmp.width, bmp.height);
  const target = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Акс коркард нашуд');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, target, target);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, target, target);
  bmp.close();
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('Акс коркард нашуд');
  return blob;
}
