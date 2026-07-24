import { Component } from '@angular/core';
import { Horizontalmenu } from '../../Components/horizontalmenu/horizontalmenu';
import { RouterModule } from '@angular/router';
 
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, Horizontalmenu],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class Layout {
 
}