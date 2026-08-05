import { Component, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
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
import { ToastService } from '../../services/toast.service';

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
  @ViewChild('locationInput', { static: false }) locationInputRef!: ElementRef<HTMLInputElement>;

  countries = [
    { name: 'India', code: '+91', pattern: /^[6-9]\d{9}$/ },
    { name: 'United States', code: '+1', pattern: /^\d{10}$/ },
    { name: 'United Kingdom', code: '+44', pattern: /^\d{10}$/ },
    { name: 'Australia', code: '+61', pattern: /^\d{9}$/ }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.registerForm = this.fb.group(
      {
        fullname: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        country: ['India', Validators.required],
        country_code: [''],
        phone_number: ['', Validators.required],
        address: ['', Validators.required],
          location: [''],
        orgname: ['', Validators.required],
          googleReviewLink: [''],
        services: ['', Validators.required],
        otherServices: [''],
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

    // Manually trigger country logic for default value on load
    const defaultCountry = this.registerForm.get('country')?.value;
    const selected = this.countries.find(c => c.name === defaultCountry);
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

    // Other service validation
    this.registerForm.get('services')?.valueChanges.subscribe(value => {
      const otherCtrl = this.registerForm.get('otherServices');
      if (value === 'other') {
        otherCtrl?.setValidators([Validators.required]);
      } else {
        otherCtrl?.clearValidators();
        otherCtrl?.setValue('');
      }
      otherCtrl?.updateValueAndValidity();
    });

    // Initialize hidden structured location controls
    this.registerForm.addControl('locationPlaceId', this.fb.control(''));
    this.registerForm.addControl('locationLat', this.fb.control(''));
    this.registerForm.addControl('locationLng', this.fb.control(''));
    this.registerForm.addControl('locationAddress', this.fb.control(''));
  }

  ngAfterViewInit(): void {
    // Setup Google Places Autocomplete if API key is available
    try {
      const env = (window as any).__env__ || {};
      // prefer Angular environment import if available at runtime
      const apiKey = env?.googleMapsApiKey || '';
      // fallback to compile-time environment via import
      // dynamic import to avoid circular issues
      import('../../../environments/environment').then(mod => {
        const key = apiKey || (mod.environment && mod.environment.googleMapsApiKey) || '';
        if (!key) {
          console.debug('[Register] Google Maps API key not provided; Places autocomplete disabled');
          return;
        }
        this.loadGoogleMapsScript(key).then(() => this.initAutocomplete()).catch(err => console.warn('[Register] failed to load Google Maps script', err));
      });
    } catch (e) {
      console.debug('[Register] cannot initialize Google Places', e);
    }
  }

  private loadGoogleMapsScript(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // if already loaded
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        resolve();
        return;
      }
      const scriptId = 'google-maps-script';
      if (document.getElementById(scriptId)) {
        // script tag exists but maybe not ready yet
        const checkInterval = setInterval(() => {
          if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 200);
        // timeout 10s
        setTimeout(() => { clearInterval(checkInterval); reject(new Error('Google Maps script load timeout')); }, 10000);
        return;
      }
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (ev) => reject(ev);
      document.head.appendChild(s);
    });
  }

  private initAutocomplete(): void {
    try {
      const inputEl = document.getElementById('locationInput') as HTMLInputElement | null;
      if (!inputEl) return;
      const autocomplete = new (window as any).google.maps.places.Autocomplete(inputEl, { types: ['geocode'] });
      autocomplete.addListener('place_changed', () => {
        this.ngZone.run(() => {
          const place = autocomplete.getPlace();
          if (!place) return;
          const placeId = place.place_id || '';
          const address = place.formatted_address || place.name || '';
          let lat = '';
          let lng = '';
          if (place.geometry && place.geometry.location) {
            lat = place.geometry.location.lat();
            lng = place.geometry.location.lng();
          }
          this.registerForm.patchValue({
            locationPlaceId: placeId,
            locationAddress: address,
            locationLat: lat,
            locationLng: lng,
            location: address
          });
        });
      });
    } catch (e) {
      console.warn('[Register] initAutocomplete failed', e);
    }
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
      country: v.country,
      country_code: v.country_code,
      address: v.address,
      location: v.location,
      orgname: v.orgname,
      googleReviewLink: v.googleReviewLink,
      services: v.services === 'other' ? v.otherServices : v.services,
      password: v.password,
      createdDate: new Date().toISOString()
    };

    this.authService.register(payload).subscribe(() => {
      // Inform user that registration requires admin approval
      this.toast.info('Registration submitted. Your account is pending admin approval.');
      this.router.navigate(['/login']);
    }, (err) => {
      this.toast.error(err?.message || 'Registration failed');
    });
  }
}
