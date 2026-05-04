import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { LoaderService } from '../services/loader.service';

@Component({
    selector: 'app-global-loader',
    standalone: true,
    imports: [CommonModule],
    template: `
  <div class="loader-backdrop" *ngIf="loading$ | async">
      <div class="spinner-border text-primary"></div>
  </div>
  `,
    styles: [`
  .loader-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.2);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:9999;
  }
  `]
})
export class GlobalLoader {
    loading$: Observable<boolean>;
    constructor(private loader: LoaderService) {
        this.loading$ = this.loader.loading$;
    }
}
