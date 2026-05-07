import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentPlan } from '../current-plan/current-plan';
import { BillingHistory } from '../billing-history/billing-history';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrentPlan,
    BillingHistory
  ],
  templateUrl: './billing-page.html',
  styleUrls: ['./billing-page.scss']
})
export class BillingPage { }
