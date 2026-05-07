import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-testimonialssection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonialssection.html',
  styleUrls: ['./testimonialssection.scss']
})
export class Testimonialssection {
  testimonials = [
    {
      stars: 5,
      quote: 'This platform revolutionized our customer support. We’ve seen a 300% increase in response efficiency.',
      name: 'Sarah Johnson',
      role: 'TechCorp Inc.'
    },
    {
      stars: 5,
      quote: 'The chatbot builder is incredibly intuitive. We had our first bot running within 30 minutes!',
      name: 'Mike Chen',
      role: 'E-commerce Solutions',
      highlighted: true
    },
    {
      stars: 5,
      quote: 'Our clients love the WhatsApp integration. It’s helped us close more deals faster than ever.',
      name: 'Emily Rodriguez',
      role: 'Digital Agency'
    }
  ];
}
