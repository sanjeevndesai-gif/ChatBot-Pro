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

        // AuthService already stored token + user
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.isSubmitting = false;

        this.apiErrorMessage =
          err?.error?.message || 'Invalid Email or Password ❌';

        console.error('Login API error:', err);
      }
    });
  }
}
