import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
// import { TranslatePipe } from '../../pipes/translate.pipe';
// import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-herosection',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './herosection.html',
  styleUrls: ['./herosection.scss']
})
export class Herosection {

  // constructor(public i18n: I18nService) { }

}
