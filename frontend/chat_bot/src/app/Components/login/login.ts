import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {

  loginForm: FormGroup;
  showPassword = false;

  isSubmitting = false;
  apiErrorMessage = '';
  apiSuccessMessage = '';

  // Forgot Password Modal State
  showForgotPasswordModal = false;
  isForgotSubmitting = false;
  forgotPasswordMessage = '';
  forgotPasswordError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.forgotPasswordMessage = '';
    this.forgotPasswordError = '';
    this.showForgotPasswordModal = true;
  }

  closeForgotPasswordModal() {
    this.showForgotPasswordModal = false;
    this.isForgotSubmitting = false;
    this.forgotPasswordMessage = '';
    this.forgotPasswordError = '';
  }

  sendForgotPassword() {
    this.forgotPasswordMessage = '';
    this.forgotPasswordError = '';
    const identifier = this.loginForm.value.email;
    if (!identifier) {
      this.forgotPasswordError = 'Please enter your email or phone above.';
      return;
    }
    this.isForgotSubmitting = true;
    this.authService.forgotPasswordViaWhatsApp(identifier).subscribe({
      next: (res: any) => {
        this.isForgotSubmitting = false;
        this.forgotPasswordMessage = res?.message || 'If your account exists, your password has been sent to your registered WhatsApp number.';
      },
      error: (err) => {
        this.isForgotSubmitting = false;
        this.forgotPasswordError = err?.message || 'Failed to send password. Please try again.';
      }
    });
  }

  onSubmit() {

    this.apiErrorMessage = '';
    this.apiSuccessMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const payload = this.loginForm.value;

    this.authService.login(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;

        this.apiSuccessMessage = res?.message || 'Login successful ✅';

        // If mustChangePassword is true, set a flag in localStorage
        if (res?.mustChangePassword) {
          localStorage.setItem('mustChangePassword', 'true');
        } else {
          localStorage.removeItem('mustChangePassword');
        }

        // AuthService already stored token + user
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.apiErrorMessage = err?.error?.message || 'Invalid Email or Password ❌';
      }
    });
  }
}
