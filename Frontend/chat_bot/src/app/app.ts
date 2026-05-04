import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalLoader } from './shared/global-loader';
import { GlobalToast } from './shared/global-toast';
// import { I18nService } from './services/i18n.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalLoader, GlobalToast],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {

  protected readonly title = signal('chatbot');

  // constructor(private i18n: I18nService) { }

  ngOnInit() {
    // const lang = this.i18n.currentLang$.value;

    // 1. Load languages list
    // this.i18n.loadLanguages().subscribe();

    // 2. Load translations for current language
    // this.i18n.loadTranslations(lang).subscribe();
  }
}
