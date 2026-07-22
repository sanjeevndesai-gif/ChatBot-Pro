import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService } from '../../services/billing.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-pricingsection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricingsection.html',
  styleUrl: './pricingsection.scss'
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

  constructor(private billingService: BillingService) {}

  ngOnInit(): void {
    this.billingService.getPlans().pipe(
      catchError((err) => {
        console.warn('Failed to load plans from backend, using fallback', err);
        return of(this.fallback);
      })
    ).subscribe((plans: any[]) => {
      // normalize backend plan documents to UI shape
      this.plans = (plans || this.fallback).map(p => {
        const features = Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? p.features.split(/\r?\n|,/) : []);
        const price = p.price ?? p.planPrice ?? p.pricePerPeriod ?? (p.planCode && p.planCode.toLowerCase() === 'enterprise' ? 'Contact Team' : 0);
        return {
          name: p.planName || p.name || p.title || p.planCode || 'Plan',
          description: p.description || p.brief || '',
          price: price,
          period: p.period || p.billingPeriod || '/month',
          features: features,
          popular: !!p.popular || !!p.mostPopular,
          buttonClass: p.buttonClass || (p.popular || p.mostPopular ? 'btn btn-success' : 'btn btn-outline-success')
        };
      });
    });
  }

}

