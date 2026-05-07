import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[cvvMask]',
  standalone: true
})
export class CvvMask {

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput() {
    this.el.nativeElement.value =
      this.el.nativeElement.value.replace(/\D/g, '').substring(0, 3);
  }
}
