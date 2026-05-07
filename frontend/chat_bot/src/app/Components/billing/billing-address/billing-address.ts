import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-billing-address',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './billing-address.html',
  styleUrls: ['./billing-address.scss']
})
export class billingAddress {
  private fb = inject(FormBuilder);

  addressForm = this.fb.group({
    companyName: ['', Validators.required],
    billingEmail: ['', [Validators.required, Validators.email]],
    taxId: [''],
    vatNumber: [''],
    mobileNumber: [''],
    country: ['India'],
    billingAddress: ['', Validators.required],
    state: [''],
    zipCode: ['']
  });

  saving = false;
  saved = false;

  save() {
    this.saved = false;
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    // Replace this with real HTTP call
    setTimeout(() => {
      console.log('Billing address saved', this.addressForm.value);
      this.saving = false;
      this.saved = true;
      this.addressForm.markAsPristine();
    }, 700);
  }

  discard() {
    this.addressForm.reset({
      companyName: '',
      billingEmail: '',
      taxId: '',
      vatNumber: '',
      mobileNumber: '',
      country: 'USA',
      billingAddress: '',
      state: '',
      zipCode: ''
    });
    this.saved = false;
  }
}
