import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[creditCardMask]',
  standalone: true
})
export class creditCardMask {

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput() {
    let value = this.el.nativeElement.value.replace(/\D/g, '');

    if (value.length > 16) value = value.substring(0, 16);

    const groups = value.match(/.{1,4}/g);
    this.el.nativeElement.value = groups ? groups.join(' ') : value;
  }
}
