import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { creditCardMask } from './directives/credit-card-mask';
import { expiryDateMask } from './directives/expiry-date-mask';
import { CvvMask } from './directives/cvv-mask';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    creditCardMask,
    expiryDateMask,
    CvvMask
  ],
  templateUrl: './payment-methods.html',
  styleUrls: ['./payment-methods.scss']
})
export class PaymentMethods {

  private fb = inject(FormBuilder);

  /* ✅ REQUIRED FOR TEMPLATE */
  message: string = '';
  messageType: 'success' | 'cancel' | '' = '';

  paymentForm = this.fb.group({
    method: ['card', Validators.required],
    cardNumber: ['', Validators.required],
    name: ['', Validators.required],
    expiry: ['', Validators.required],
    cvv: ['', Validators.required],
    saveCard: [false]
  });

  scanPaySelected = false;

  cards = signal<Array<{
    id: number;
    name: string;
    last4: string;
    expiry: string;
    primary: boolean;
  }>>([
    { id: 1, name: 'Tom McBride', last4: '9856', expiry: '12/26', primary: true },
    { id: 2, name: 'Mildred Wagner', last4: '5896', expiry: '10/27', primary: false }
  ]);

  // savePayment() {
  //   if (this.paymentForm.invalid) {
  //     this.paymentForm.markAllAsTouched();
  //     return;
  //   }

  //   const value = this.paymentForm.value;

  //   // ✅ STRICT SAFE
  //   const cardNumber = value.cardNumber ?? '';
  //   const last4 = cardNumber.slice(-4);

  //   this.cards.update(cards => [
  //     ...cards,
  //     {
  //       id: Date.now(),
  //       name: value.name ?? '',
  //       last4: last4,
  //       expiry: value.expiry ?? '',
  //       primary: false
  //     }
  //   ]);

  //   this.message = '✅ Card saved successfully';
  //   this.messageType = 'success';

  //   this.resetForm();
  // }
savePayment() {
  if (this.paymentForm.invalid) {
    this.paymentForm.markAllAsTouched();
    return;
  }

  const value = this.paymentForm.value;

  // 🧠 Default message (when card is NOT saved)
  this.message = '✅ Payment details saved (card not stored)';
  this.messageType = 'success';

  // ✅ Save card ONLY if toggle is ON
  if (value.saveCard) {
    const cardNumber = value.cardNumber ?? '';
    const last4 = cardNumber.slice(-4);

    this.cards.update(cards => [
      ...cards,
      {
        id: Date.now(),
        name: value.name ?? '',
        last4,
        expiry: value.expiry ?? '',
        primary: false
      }
    ]);

    // 🟢 Override message if card is saved
    this.message = '✅ Card saved successfully for future billing';
  }

  this.resetForm();
}

  
  cancelPayment() {
    this.resetForm();
    this.message = '❌ Changes cancelled';
    this.messageType = 'cancel';
  }

  resetForm() {
    this.paymentForm.reset({
      method: 'card',
      saveCard: false
    });
  }

  onUPIMethodSelected() {
    this.scanPaySelected = false;
  }

  onScanPaySelected() {
    this.scanPaySelected = true;
  }

  proceedToUPIPayment() {
    alert('Dummy UPI redirect');
  }
}
