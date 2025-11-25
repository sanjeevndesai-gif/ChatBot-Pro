import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pricingsection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricingsection.html',
  styleUrl: './pricingsection.scss'
})
export class Pricingsection {
  plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses",
      price: 699,
      period: "/month",
      features: ["1 WhatsApp Business Account", "Up to 1,000 messages/month", "Basic chatbot builder", "Email support", "Basic analytics"],
      buttonClass: "btn btn-outline-success"
    },
    {
      name: "Professional",
      description: "Ideal for growing companies",
      price: 999,
      period: "/month",
      features: ["3 WhatsApp Business Accounts", "Up to 10,000 messages/month", "Advanced chatbot builder", "Priority support", "Advanced analytics", "Team collaboration", "Custom integrations"],
      popular: true,
      buttonClass: "btn btn-success"
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: "Contact Team",
      period: "",
      features: ["Unlimited WhatsApp accounts", "Unlimited messages", "Custom chatbot solutions", "24/7 dedicated support", "Enterprise analytics", "Advanced team features", "API access", "Custom branding"],
      buttonClass: "btn btn-outline-success"
    }
  ];

}

