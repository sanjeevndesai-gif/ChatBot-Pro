import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
<div class="help-banner ">
  <div class="content">
    <h1>Hello, how can we help?</h1>
    <p>or choose a category to quickly find the help you need</p>

    <div class="search-box">
      <i class="bi bi-search"></i>
      <input type="text" placeholder="Search articles..." />
    </div>
  </div>
</div>
<div class="faq-layout mx-3 p-4">

  <!-- Sidebar -->
  <div class="sidebar">
        <div *ngFor="let c of categories; let i = index"
          (click)="selectCategory(i)"
          [class.active]="active === i"
          class="menu-item">

      <i class="{{c.icon}}"></i>
      <span>{{c.name}}</span>
    </div>
  </div>

  <!-- Main FAQ Section -->
  <div class="faq-content">
    <h2>{{ categories[active].name }}</h2>
    <p class="subtitle">Get help with {{ categories[active].name.toLowerCase() }}</p>

    <div *ngFor="let item of currentFaqs; let i=index" class="faq-box">
      <div class="question" (click)="toggle(i)">
        <span>{{ item.q }}</span>
        <i [class.bi-chevron-up]="item.open" class="bi-chevron-down"></i>
      </div>

      <div *ngIf="item.open" class="answer">
        <div [innerHTML]="item.a.replace(/\n/g, '<br/>')"></div>
      </div>
    </div>
  </div>

</div>

<div class="contact-section">
  <h3>You still have a question?</h3>
  <p>If you can't find the answer in our FAQ, contact us. We respond quickly!</p>

  <div class="contact-cards">
    <div class="card">
      <i class="bi bi-telephone"></i>
      <h4>+1 2548 2568</h4>
      <p>We are always happy to help</p>
    </div>

    <div class="card qr-card">
      <h4>Scan QR Code</h4>

      <!-- QR Image -->
      <img src="assets/images/qr-code.png" alt="QR Code" class="qr-img" />

      <p>Scan to get quick support</p>
    </div>
    
    <div class="card">
      <i class="bi bi-envelope"></i>
      <h4>help@help.com</h4>
      <p>Best way to get a quick answer</p>
    </div>
  </div>
</div>
  `,
  styles: [],
})
export class Faq {
   categories = [
    { icon: 'bi-credit-card', name: 'Payment' },
    { icon: 'bi-gear', name: 'Product & Services' }
  ];

  active = 0;

  faqsMap: { [category: string]: Array<{ q: string; a: string; open: boolean }> } = {
    'Payment': [
      { q: 'When will I be charged?', a: `Payment is required when you first subscribe and each time you manually renew your plan. We do not automatically charge your payment method. If your subscription expires, your account will be blocked until you renew your subscription.`, open: false },
      { q: 'How do I pay for my subscription?', a: `Go to Plan & Billing and scan the displayed UPI QR code using your preferred UPI app to complete the payment. After successful payment verification, your subscription will be activated or renewed.`, open: false },
      { q: "Why hasn't my payment been completed?", a: `Your payment may not be completed due to one of the following reasons:\n\n- Insufficient balance in your bank account.\n- The UPI transaction was cancelled or timed out.\n- A temporary issue with your bank or UPI service.\n- Network or connectivity issues during the payment process.\n- The payment was successful, but verification is still in progress.`, open: false },
      { q: 'Can I get a refund?', a: `Refunds are subject to our Refund Policy. If you believe you've been charged incorrectly or are eligible for a refund, please contact our support team with your payment details.`, open: false },
      { q: 'Does my subscription renew automatically?', a: `No. Your subscription does not renew automatically. You must manually renew your subscription before or after its expiry date by making a payment from the Plan & Billing section. If your subscription expires, your account will be temporarily blocked until your renewal payment is successfully verified and your subscription is reactivated.`, open: false },
      { q: 'How can I cancel my subscription?', a: `You can cancel your subscription anytime from your Account → Billing → Subscription settings. Your subscription will remain active until the end of the current billing period.`, open: false },
      { q: 'Can I upgrade or downgrade my plan?', a: `Yes. You can change your subscription plan at any time.\n- Upgrades take effect immediately.\n- Downgrades usually take effect from your next billing cycle.`, open: false },
      { q: 'Will I receive an invoice?', a: `Yes. An invoice or payment receipt is automatically generated after every successful payment and is available in your billing history.`, open: false },
      { q: 'Is my payment information secure?', a: `Yes. All payments are processed through secure, PCI-compliant payment gateways. We do not store your card or payment details on our servers.`, open: false },
      { q: 'What should I do if I was charged twice?', a: `If you believe you've been charged more than once for the same transaction, please contact our support team with:\n- Your registered email address\n- Transaction ID\n- Date of payment\n\nWe'll investigate and resolve the issue as quickly as possible.`, open: false },
      { q: 'Can I update my payment method?', a: `Yes. You can update or replace your payment method at any time from your Billing settings before your next renewal.`, open: false },
      { q: 'How do I contact support for payment issues?', a: `If you have any payment-related questions or issues, contact our support team via email, live chat, or WhatsApp. Please include your registered email address and transaction details to help us assist you faster.`, open: false }
    ],
    'Product & Services': [
      { q: 'What is WhatsApp appointment booking?', a: `Our platform allows customers to book appointments directly through WhatsApp using automated conversations. Customers can view available time slots, schedule appointments, receive confirmations, reminders, and updates without leaving WhatsApp.`, open: false },
      { q: 'Do my customers need to install another app?', a: `No. Customers only need WhatsApp. No additional downloads or registrations are required.`, open: false },
      { q: 'Can I connect my own WhatsApp Business number?', a: `Yes. You can connect your own WhatsApp Business account through the WhatsApp Business API to send appointment confirmations, reminders, and notifications.`, open: false },
      { q: 'Are appointment reminders sent automatically?', a: `Yes. The system can automatically send reminders before scheduled appointments, helping reduce missed bookings.`, open: false },
      { q: 'Can customers reschedule or cancel appointments?', a: `Yes. Customers can reschedule or cancel appointments through WhatsApp, subject to the rules you configure for your business.`, open: false },
      { q: 'Can I manage multiple staff members or locations?', a: `Yes. Depending on your subscription plan, you can manage multiple staff members, services, business locations, and appointment calendars.`, open: false },
      { q: 'Is customer data secure?', a: `Yes. We use industry-standard security practices to protect customer information and communications. Sensitive payment information is handled securely by our payment providers.`, open: false },
      { q: 'Do you offer a free trial?', a: `Yes (if enabled). New users can explore the platform during the trial period before subscribing to a paid plan.`, open: false },
      { q: 'How can I contact support?', a: `You can reach our support team through:\n- WhatsApp Support\n- Email Support\n- Live Chat (if available)\n\nOur team is happy to help with setup, billing, and technical questions.`, open: false }
    ]
  };

  get currentFaqs() {
    const cat = this.categories[this.active]?.name || 'Payment';
    return this.faqsMap[cat] || [];
  }

  toggle(i: number) {
    const list = this.currentFaqs;
    if (list && list[i]) {
      list[i].open = !list[i].open;
    }
  }

  selectCategory(i: number) {
    this.active = i;
    const list = this.currentFaqs;
    if (list) {
      list.forEach(f => f.open = false);
    }
  }

}



