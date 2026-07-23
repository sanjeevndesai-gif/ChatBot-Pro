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
    { icon: 'bi-gear', name: 'Product & Services' }
  ];

  active = 0;

  faqs = [
    { q: 'When will I be charged?', a: `You will be charged immediately after your payment is successfully processed. For subscription plans, future payments are automatically charged on your renewal date unless you cancel beforehand.`, open: false },
    { q: 'What payment methods do you accept?', a: `We accept a variety of secure payment methods, including:\n- Credit & Debit Cards\n- UPI\n- Net Banking (where available)\n- Digital Wallets\n- Other supported payment options provided by our payment gateway`, open: false },
    { q: 'Why did my payment fail?', a: `A payment may fail for several reasons, such as:\n- Incorrect card or payment details\n- Insufficient funds\n- Bank or payment provider declined the transaction\n- Network or connectivity issues\n\nPlease verify your details and try again, or use a different payment method.`, open: false },
    { q: 'Can I get a refund?', a: `Refunds are subject to our Refund Policy. If you believe you've been charged incorrectly or are eligible for a refund, please contact our support team with your payment details.`, open: false },
    { q: 'Does my subscription renew automatically?', a: `Yes. Paid subscriptions renew automatically at the end of each billing cycle (monthly or annually) unless you cancel your subscription before the renewal date.`, open: false },
    { q: 'How can I cancel my subscription?', a: `You can cancel your subscription anytime from your Account → Billing → Subscription settings. Your subscription will remain active until the end of the current billing period.`, open: false },
    { q: 'Can I upgrade or downgrade my plan?', a: `Yes. You can change your subscription plan at any time.\n- Upgrades take effect immediately.\n- Downgrades usually take effect from your next billing cycle.`, open: false },
    { q: 'Will I receive an invoice?', a: `Yes. An invoice or payment receipt is automatically generated after every successful payment and is available in your billing history.`, open: false },
    { q: 'Is my payment information secure?', a: `Yes. All payments are processed through secure, PCI-compliant payment gateways. We do not store your card or payment details on our servers.`, open: false },
    { q: 'What should I do if I was charged twice?', a: `If you believe you've been charged more than once for the same transaction, please contact our support team with:\n- Your registered email address\n- Transaction ID\n- Date of payment\n\nWe'll investigate and resolve the issue as quickly as possible.`, open: false },
    { q: 'Can I update my payment method?', a: `Yes. You can update or replace your payment method at any time from your Billing settings before your next renewal.`, open: false },
    { q: 'How do I contact support for payment issues?', a: `If you have any payment-related questions or issues, contact our support team via email, live chat, or WhatsApp. Please include your registered email address and transaction details to help us assist you faster.`, open: false }
  ];

  toggle(i: number) {
    this.faqs[i].open = !this.faqs[i].open;
  }

}



