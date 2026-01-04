import { Component } from '@angular/core';
import { Horizontalmenu } from '../../Components/horizontalmenu/horizontalmenu';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [RouterModule, Horizontalmenu],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout {

}
