import { Component } from '@angular/core';

@Component({
  selector: 'app-setting',
  imports: [],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting {
   google = true;
  slack = false;
  facebook = true;
  twitter = false;

  toggle(name: string) {
    (this as any)[name] = !(this as any)[name];
  }

}
