import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-faq',
  imports: [NgFor, NgIf],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
   categories = [
    { icon: 'bi-credit-card', name: 'Payment' },
    { icon: 'bi-truck', name: 'Delivery' },
    { icon: 'bi-arrow-counterclockwise', name: 'Cancellation & Return' },
    { icon: 'bi-box', name: 'My Orders' },
    { icon: 'bi-gear', name: 'Product & Services' }
  ];

  active = 0;

  faqs = [
    { q: 'When is payment taken for my order?', a: '', open: false },
    { q: 'How do I pay for my order?', a: 'We accept Visa, MasterCard, American Express and PayPal...', open: false },
    { q: 'What should I do if I’m having trouble placing an order?', a: '', open: false },
    { q: 'Which license do I need for an end product only accessible to paying users?', a: '', open: false },
    { q: 'Does my subscription automatically renew?', a: 'No, this is not subscription based…', open: false }
  ];

  toggle(i: number) {
    this.faqs[i].open = !this.faqs[i].open;
  }

}



