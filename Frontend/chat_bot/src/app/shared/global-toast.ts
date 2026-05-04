import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  constructor(private toastService: ToastService) {
    this.toastService.toast$.subscribe(msg => {
      this.toasts.push(msg);
      setTimeout(() => this.remove(msg), 10000);
    });
  }

  remove(msg: ToastMessage) {
    this.toasts = this.toasts.filter(t => t !== msg);
  }
}
