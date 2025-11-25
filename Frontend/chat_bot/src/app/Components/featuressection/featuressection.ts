import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-featuressection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featuressection.html',
  styleUrls: ['./featuressection.scss']
})
export class Featuressection {
  features = [
    {
      icon: 'bi-whatsapp',
      title: 'WhatsApp Integration',
      description: 'Seamlessly connect your business to WhatsApp with our powerful API integration.'
    },
    {
      icon: 'bi-lightning-charge',
      title: 'AI-Powered Automation',
      description: 'Smart chatbots that learn and adapt to provide better customer experiences.'
    },
    {
      icon: 'bi-graph-up',
      title: 'Advanced Analytics',
      description: 'Track conversations, measure performance, and optimize your chatbot strategies.'
    },
    {
      icon: 'bi-shield-lock',
      title: 'Enterprise Security',
      description: 'Bank-level security with end-to-end encryption for all your conversations.'
    },
    {
      icon: 'bi-people',
      title: 'Team Collaboration',
      description: 'Work together with your team to manage conversations and improve responses.'
    },
    {
      icon: 'bi-check-circle',
      title: 'Easy Setup',
      description: 'Get started in minutes with our intuitive drag-and-drop chatbot builder.'
    }
  ];
}
