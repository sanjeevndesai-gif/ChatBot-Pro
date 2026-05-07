import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService, ToastMessage } from '../services/toast.service';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-toast.html',
  styleUrls: ['./global-toast.scss']
})
export class GlobalToast {
  toasts: ToastMessage[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.toastService.toast$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(msg => {
        this.toasts.push(msg);
        setTimeout(() => this.remove(msg), 10000);
      });
  }

  remove(msg: ToastMessage): void {
    this.toasts = this.toasts.filter(t => t !== msg);
  }
}
