import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { I18nService } from '../services/i18n.service';
import { Subscription } from 'rxjs';

@Pipe({
    name: 't',
    standalone: true,
    pure: false          // ❗ Important: pipe will auto-update when language changes
})
export class TranslatePipe implements PipeTransform, OnDestroy {

    private sub!: Subscription;

    constructor(
        private i18n: I18nService,
        private cdr: ChangeDetectorRef
    ) {
        // Auto refresh UI when translations update
        this.sub = this.i18n.translations$.subscribe(() => {
            this.cdr.markForCheck();
        });
    }

    transform(key: string): string {
        return this.i18n.t(key);
    }

    ngOnDestroy() {
        if (this.sub) this.sub.unsubscribe();
    }
}
