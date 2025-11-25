import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group(
      {
        fullname: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone_number: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[6-9]\d{9}$/) // Indian 10-digit number validation
          ]
        ],
        address: ['', Validators.required],
        orgname: ['', Validators.required],
        occupation: ['', Validators.required],
        otherOccupation: [''],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
          ]
        ],
        confirmPassword: ['', Validators.required],
        terms: [false, Validators.requiredTrue]
      },
      {
        validators: this.passwordMatchValidator()
      }
    );

    // ✅ Conditionally validate `otherOccupation`
    this.registerForm.get('occupation')?.valueChanges.subscribe(value => {
      const otherOccupationControl = this.registerForm.get('otherOccupation');
      if (value === 'other') {
        otherOccupationControl?.setValidators([Validators.required]);
      } else {
        otherOccupationControl?.clearValidators();
      }
      otherOccupationControl?.updateValueAndValidity();
    });
  }

  // Access form controls in template via `f`
  get f() {
    return this.registerForm.controls;
  }

  // Toggle password visibility
  togglePassword(field: 'password' | 'confirm') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Control input type for password fields
  getPasswordType(field: 'password' | 'confirm') {
    return (field === 'password' ? this.showPassword : this.showConfirmPassword) ? 'text' : 'password';
  }

  // Validator to match passwords
  passwordMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get('password')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;
      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  // Submit logic
  onSubmit() {
    if (this.registerForm.valid) {
      console.log('Form submitted:', this.registerForm.value);
      // TODO: Call your backend API to save user data
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
