package com.arnan.chat.Controller;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.common.BitMatrix;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/qr")
public class QrController {

    @GetMapping(value = "/generate", produces = MediaType.IMAGE_PNG_VALUE)
    public @ResponseBody byte[] generateQr(
            @RequestParam String phoneNumber,
            @RequestParam String appointmentType,
            @RequestParam String userId) throws WriterException, IOException {

        // Build WhatsApp deep link
        String qrText = "https://wa.me/" + phoneNumber +
                "?text=Hi&type=" + appointmentType +
                "&userId=" + userId;

        // Generate QR code
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(qrText, BarcodeFormat.QR_CODE, 300, 300);

        BufferedImage image = new BufferedImage(300, 300, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < 300; x++) {
            for (int y = 0; y < 300; y++) {
                int grayValue = (bitMatrix.get(x, y) ? 0 : 255);
                image.setRGB(x, y, (grayValue == 0 ? 0xFF000000 : 0xFFFFFFFF));
            }
        }

        // Convert to PNG byte array
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        return baos.toByteArray();
    }
}

