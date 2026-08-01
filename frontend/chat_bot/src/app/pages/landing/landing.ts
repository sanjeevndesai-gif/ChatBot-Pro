// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-landing',
//   imports: [],
//   templateUrl: './landing.html',
//   styleUrl: './landing.scss'
// })
// export class Landing {

// }



import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../Components/header/header'; // adjust path if needed
import { Herosection } from '../../Components/herosection/herosection';
import { Featuressection } from '../../Components/featuressection/featuressection';
import { Pricingsection } from '../../Components/pricingsection/pricingsection';
import { Testimonialssection } from '../../Components/testimonialssection/testimonialssection';
import { Ctasection } from '../../Components/ctasection/ctasection';
import { Footersection } from '../../Components/footersection/footersection';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, Header, Herosection, Featuressection, Pricingsection, Testimonialssection, Ctasection, Footersection],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class Landing {
  get clinicQrUrl(): string {
    const phone = encodeURIComponent(environment.clinicPhoneNumber || '');
    return `/api/whatsapp/qr/generate?qrType=clinic&phoneNumber=${phone}&clinicId=${encodeURIComponent('clinic123')}`;
  }

  get supportQrUrl(): string {
    const phone = encodeURIComponent(environment.supportPhoneNumber || '');
    return `/api/whatsapp/qr/generate?qrType=support&phoneNumber=${phone}&topic=${encodeURIComponent('landing_support')}`;
  }

  // Direct wa.me links for CTA buttons
  get clinicWaLink(): string {
    const phone = encodeURIComponent(environment.clinicPhoneNumber || '');
    const msg = encodeURIComponent('CLINIC:clinic123');
    return `https://wa.me/${phone}?text=${msg}`;
  }

  get supportWaLink(): string {
    const phone = encodeURIComponent(environment.supportPhoneNumber || '');
    const msg = encodeURIComponent('SUPPORT:landing_support');
    return `https://wa.me/${phone}?text=${msg}`;
  }
}
