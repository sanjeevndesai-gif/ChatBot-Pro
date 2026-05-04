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
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  countries = [
    { name: 'India', code: '+91', pattern: /^[6-9]\d{9}$/ },
    { name: 'United States', code: '+1', pattern: /^\d{10}$/ },
    { name: 'United Kingdom', code: '+44', pattern: /^\d{10}$/ },
    { name: 'Australia', code: '+61', pattern: /^\d{9}$/ }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        fullname: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        country: ['', Validators.required],
        country_code: [''],
        phone_number: ['', Validators.required],
        address: ['', Validators.required],
        orgname: ['', Validators.required],
        occupation: ['', Validators.required],
        otherOccupation: [''],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        terms: [false, Validators.requiredTrue],
      },
      { validators: this.passwordMatchValidator() }
    );

    // Country → code + phone validation
    this.registerForm.get('country')?.valueChanges.subscribe(country => {
      const selected = this.countries.find(c => c.name === country);
      const phone = this.registerForm.get('phone_number');
      const code = this.registerForm.get('country_code');

      if (selected) {
        code?.setValue(selected.code);
        phone?.setValidators([
          Validators.required,
          Validators.pattern(selected.pattern)
        ]);
      } else {
        code?.setValue('');
        phone?.setValidators([Validators.required]);
      }

      phone?.updateValueAndValidity();
    });

    // Other occupation validation
    this.registerForm.get('occupation')?.valueChanges.subscribe(value => {
      const otherCtrl = this.registerForm.get('otherOccupation');
      if (value === 'other') {
        otherCtrl?.setValidators([Validators.required]);
      } else {
        otherCtrl?.clearValidators();
        otherCtrl?.setValue('');
      }
      otherCtrl?.updateValueAndValidity();
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  passwordMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const p = group.get('password')?.value;
      const c = group.get('confirmPassword')?.value;
      return p && c && p !== c ? { passwordMismatch: true } : null;
    };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const v = this.registerForm.value;

    const payload = {
      fullname: v.fullname,
      email: v.email,
      phone_number: `${v.country_code} ${v.phone_number}`,
      address: v.address,
      orgname: v.orgname,
      occupation: v.occupation === 'other' ? v.otherOccupation : v.occupation,
      password: v.password
    };

    this.authService.register(payload).subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
