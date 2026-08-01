package com.arnan.chat.Controller;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.common.BitMatrix;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
@RequestMapping("/api/whatsapp/qr")
public class QrController {

    @GetMapping(value = "/generate", produces = MediaType.IMAGE_PNG_VALUE)
    public @ResponseBody byte[] generateQr(
            @RequestParam String qrType,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String appointmentType,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String clinicId,
            @RequestParam(required = false) String topic
    ) throws WriterException, IOException {

        String qrText;

        // Support QR: send a WhatsApp message to provided phoneNumber with SUPPORT:topic
        if ("support".equalsIgnoreCase(qrType)) {
            if (phoneNumber == null || phoneNumber.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phoneNumber is required for support QR");
            }
            String message = "SUPPORT:" + (topic == null ? "general" : topic);
            qrText = "https://wa.me/" + phoneNumber + "?text=" + URLEncoder.encode(message, StandardCharsets.UTF_8);

        // Clinic Finder QR: open WhatsApp message to clinic (phoneNumber) with CLINIC:clinicId
        } else if ("clinic".equalsIgnoreCase(qrType)) {
            if (phoneNumber == null || phoneNumber.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phoneNumber is required for clinic QR");
            }
            String message = "CLINIC:" + (clinicId == null ? "" : clinicId);
            qrText = "https://wa.me/" + phoneNumber + "?text=" + URLEncoder.encode(message, StandardCharsets.UTF_8);

        // Default / Patient QR: preserve existing behavior (appointmentType + userId encoded)
        } else {
            if (appointmentType == null || userId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "appointmentType and userId are required for patient QR");
            }
            String payload = appointmentType + ":" + userId;
            String token = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payload.getBytes(StandardCharsets.UTF_8));

            String message = "REF:" + token;
            if (phoneNumber == null || phoneNumber.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phoneNumber is required for patient QR");
            }
            qrText = "https://wa.me/" + phoneNumber + "?text=" + URLEncoder.encode(message, StandardCharsets.UTF_8);
        }

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

