// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-landing',
//   imports: [],
//   templateUrl: './landing.html',
//   styleUrl: './landing.scss'
// })
// export class Landing {

// }



import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../Components/header/header'; // adjust path if needed
import { Herosection } from '../../Components/herosection/herosection';
import { Featuressection } from '../../Components/featuressection/featuressection';
import { Pricingsection } from '../../Components/pricingsection/pricingsection';
import { Testimonialssection } from '../../Components/testimonialssection/testimonialssection';
import { Ctasection } from '../../Components/ctasection/ctasection';
import { Footersection } from '../../Components/footersection/footersection';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, Header, Herosection, Featuressection, Pricingsection, Testimonialssection, Ctasection, Footersection],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class Landing { }
