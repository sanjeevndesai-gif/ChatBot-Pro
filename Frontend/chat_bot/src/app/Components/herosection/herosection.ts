import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
// import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-herosection',
  imports: [TranslatePipe],
  templateUrl: './herosection.html',
  styleUrl: './herosection.scss'
})
export class Herosection {

  // constructor(public i18n: I18nService) { }

}
