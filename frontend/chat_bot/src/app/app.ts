import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GlobalLoader } from './shared/global-loader';
import { GlobalToast } from './shared/global-toast';
import { Header } from './Components/header/header';
import { Landing } from './pages/landing/landing';
import { BillingStatusService } from './services/billing-status.service';
// import { I18nService } from './services/i18n.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, GlobalLoader, GlobalToast, Header, Landing],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {

  protected readonly title = signal('chatbot');
  protected readonly deactivated = signal(false);

  constructor(private readonly billingStatus: BillingStatusService) {}

  // constructor(private i18n: I18nService) { }

  ngOnInit() {
    // Start polling billing status and reflect it in the root template
    this.billingStatus.startPolling();
    // keep a lightweight signal copy for template binding
    // poll once to initialize
    this.billingStatus.refresh().then(() => this.deactivated.set(this.billingStatus.isDeactivated()));
    setInterval(() => this.deactivated.set(this.billingStatus.isDeactivated()), 1000);
    // const lang = this.i18n.currentLang$.value;

    // 1. Load languages list
    // this.i18n.loadLanguages().subscribe();

    // 2. Load translations for current language
    // this.i18n.loadTranslations(lang).subscribe();
  }
}
