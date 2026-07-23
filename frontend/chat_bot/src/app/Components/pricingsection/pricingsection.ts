import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService } from '../../services/billing.service';
import { AuthService } from '../../services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-pricingsection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricingsection.html',
  styleUrls: ['./pricingsection.scss']
})
export class Pricingsection implements OnInit {
  plans: any[] = [];

  // keep a local fallback in case backend is unreachable
  private readonly fallback = [
    {
      name: 'Starter',
      description: 'Perfect for small businesses',
      price: 699,
      period: '/month',
      features: ['1 WhatsApp Business Account', 'Up to 1,000 messages/month', 'Basic chatbot builder', 'Email support', 'Basic analytics'],
      buttonClass: 'btn btn-outline-success'
    },
    {
      name: 'Professional',
      description: 'Ideal for growing companies',
      price: 999,
      period: '/month',
      features: ['3 WhatsApp Business Accounts', 'Up to 10,000 messages/month', 'Advanced chatbot builder', 'Priority support', 'Advanced analytics', 'Team collaboration', 'Custom integrations'],
      popular: true,
      buttonClass: 'btn btn-success'
    },
    {
      name: 'Enterprise',
      description: 'For large organizations',
      price: 'Contact Team',
      period: '',
      features: ['Unlimited WhatsApp accounts', 'Unlimited messages', 'Custom chatbot solutions', '24/7 dedicated support', 'Enterprise analytics', 'Advanced team features', 'API access', 'Custom branding'],
      buttonClass: 'btn btn-outline-success'
    }
  ];

  constructor(private billingService: BillingService, private authService: AuthService) {}

  ngOnInit(): void {
    this.billingService.getPlans().pipe(
      catchError((err) => {
        // If the backend returns 401 (unauthorized) for anonymous visitors, don't spam console.
        if (err && err.status === 401) {
          return of(this.fallback);
        }
        console.warn('Failed to load plans from backend, using fallback', err);
        return of(this.fallback);
      })
    ).subscribe((plans: any[]) => {
      // Debug: print raw plans response for testing
      console.log('RAW plans response:', plans);

      // If backend returned empty or malformed data, use local fallback
      const isValid = Array.isArray(plans) && plans.length > 0 && plans.some(p => p && (p.planName || p.name || p.title || p.planCode));
      const source = isValid ? plans : this.fallback;

      // Debug: print chosen source (backend or fallback)
      console.log('Using plans source:', isValid ? 'backend' : 'fallback', source);

      // normalize backend plan documents to UI shape
      this.plans = (source || this.fallback).map(p => {
        // normalize features: backend may send array or object of flags
        let features: string[] = [];
        if (Array.isArray(p.features)) {
          features = p.features;
        } else if (p.features && typeof p.features === 'object') {
          const f = p.features;
          if (f.whatsappReminders) features.push('WhatsApp reminders');
          if (f.customBranding) features.push('Custom branding');
          if (f.analytics) features.push('Analytics');
          if (f.multiBranch) features.push('Multi-branch support');
          if (f.apiAccess) features.push('API access');
        } else if (typeof p.features === 'string') {
          features = p.features.split(/\r?\n|,/).map((s: string) => s.trim()).filter(Boolean);
        }
        // include limits if present
        if (p.limits && p.limits.maxDoctors) {
          features.unshift(`Up to ${p.limits.maxDoctors} doctors`);
        } else if (p.maxDoctors) {
          features.unshift(`Up to ${p.maxDoctors} doctors`);
        }

        // price: prefer explicit fields, then first entry of `pricing` array
        let price: any = p.price ?? p.planPrice ?? p.pricePerPeriod ?? null;
        if ((price === null || price === undefined) && Array.isArray(p.pricing) && p.pricing.length > 0) {
          const first = p.pricing[0];
          price = first.amount ?? first.price ?? first.value ?? first.rate ?? null;
        }
        if (price === null || price === undefined) {
          price = (p.planCode && p.planCode.toLowerCase() === 'enterprise') ? 'Contact Team' : 0;
        }

        const period = p.period || p.billingPeriod || (Array.isArray(p.pricing) && p.pricing.length > 0 ? (p.pricing[0].period || '') : '/month');

        return {
          name: p.planName || p.name || p.title || p.planCode || 'Plan',
          description: p.description || p.brief || '',
          price: price,
          period: period,
          features: features,
          popular: !!p.popular || !!p.mostPopular,
          buttonClass: p.buttonClass || (p.popular || p.mostPopular ? 'btn btn-success' : 'btn btn-outline-success')
        };
      });
    });
  }

}

