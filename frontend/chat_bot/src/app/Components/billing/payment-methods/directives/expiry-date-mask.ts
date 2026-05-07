import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[expiryDateMask]',
  standalone: true
})
export class expiryDateMask{

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput() {
    let v = this.el.nativeElement.value.replace(/\D/g, '');

    if (v.length > 4) v = v.substring(0, 4);

    if (v.length > 2) {
      v = v.substring(0, 2) + '/' + v.substring(2);
    }

    this.el.nativeElement.value = v;
  }
}
