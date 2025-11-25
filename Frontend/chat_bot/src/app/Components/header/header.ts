import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import { Language } from '../../models/language.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit {

  @Input() languages: Language[] = [];
  @Output() languageChange = new EventEmitter<string>();

  isCollapsed = true;
  lastScrollTop = 0;
  hideHeader = false;

  selectedLang: Language | null = null;

  constructor(
    private router: Router,
    public i18n: I18nService
  ) { }


  ngOnInit() {
    console.log("Header INIT");

    this.i18n.loadLanguages().subscribe((langs: Language[]) => {
      console.log("Languages from API =", langs);

      if (langs.length > 0) {
        this.languages = langs;

        const current = this.i18n.currentLang$.value;
        this.selectedLang = langs.find(l => l.code === current) || langs[0];

        console.log("Selected Lang =", this.selectedLang);
      }
    });
  }



  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  onSelectLanguage(code: string) {
    this.selectedLang =
      this.languages.find(l => l.code === code) || this.languages[0];

    this.i18n.setLanguage(code);
    this.languageChange.emit(code);
    this.isCollapsed = true;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const current = window.pageYOffset;

    if (current > this.lastScrollTop + 10) {
      this.hideHeader = true;
    } else if (current < this.lastScrollTop - 10) {
      this.hideHeader = false;
    }

    this.lastScrollTop = current <= 0 ? 0 : current;
  }
}
