import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Language } from '../../models/language.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {

  @Input() languages: Language[] = [];
  @Output() languageChange = new EventEmitter<string>();

  isCollapsed = true;
  lastScrollTop = 0;
  hideHeader = false;
  selectedLang: Language | null = null;

  constructor(private readonly router: Router) { }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const current = window.pageYOffset;

    if (current > this.lastScrollTop + 10) {
      this.hideHeader = true;
    } else if (current < this.lastScrollTop - 10) {
      this.hideHeader = false;
    }

    this.lastScrollTop = current <= 0 ? 0 : current;
  }
}
