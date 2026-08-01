import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-footersection',
  templateUrl: './footersection.html',
  styleUrls: ['./footersection.scss']
})
export class Footersection {
  get clinicQrUrl(): string {
    const phone = encodeURIComponent(environment.clinicPhoneNumber || '');
    return `/api/whatsapp/qr/generate?qrType=clinic&phoneNumber=${phone}&clinicId=${encodeURIComponent('clinic123')}`;
  }

  get supportQrUrl(): string {
    const phone = encodeURIComponent(environment.supportPhoneNumber || '');
    return `/api/whatsapp/qr/generate?qrType=support&phoneNumber=${phone}&topic=${encodeURIComponent('footer_support')}`;
  }

  get supportWaLink(): string {
    const phone = encodeURIComponent(environment.supportPhoneNumber || '');
    const msg = encodeURIComponent('SUPPORT:footer_support');
    return `https://wa.me/${phone}?text=${msg}`;
  }
}
