import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly baseUrl = environment.apiGatewayUrl + '/api/whatsapp/qr/generate';

  constructor(private http: HttpClient) {}

  /**
   * Fetch QR code as a blob (PNG image)
   */
  generateQr(profileId: string, appointmentType: string = 'doctor', qrType: string = 'patient'): Observable<Blob> {
    const phoneNumber = environment.whatsappPhoneId;
    const params: any = {
      qrType,
      phoneNumber,
      appointmentType,
      userId: profileId
    };
    return this.http.get(this.baseUrl, {
      params,
      responseType: 'blob'
    });
  }
}
