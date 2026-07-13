import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WhatsAppService {

  private readonly sendUrl = `${environment.apiGatewayUrl}/api/whatsapp/sendmessage`;

  constructor(private http: HttpClient) {}

  sendMessage(number: string, message: string): Observable<any> {
    const payload = { number, message };
    return this.http.post(this.sendUrl, payload);
  }

}
