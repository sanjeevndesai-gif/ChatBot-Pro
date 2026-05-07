import QRCode from 'qrcode';

/**
 * Download QR from an existing canvas (used on Profile page)
 */
export function downloadQrFromCanvas(
  canvas: HTMLCanvasElement,
  fileName: string = 'profile-qr.png'
) {
  const url = canvas.toDataURL('image/png');

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
}

/**
 * Generate QR on a temporary canvas and download it (used from Header/Horizontal Menu anywhere)
 */
export async function downloadProfileQr(
  qrValue: string,
  size: number = 200,
  fileName: string = 'profile-qr.png'
) {
  const canvas = document.createElement('canvas');

  await QRCode.toCanvas(canvas, qrValue, {
    width: size,
    margin: 1
  });

  downloadQrFromCanvas(canvas, fileName);
}
