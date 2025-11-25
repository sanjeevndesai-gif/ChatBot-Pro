import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pricingsection } from './pricingsection';

describe('Pricingsection', () => {
  let component: Pricingsection;
  let fixture: ComponentFixture<Pricingsection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pricingsection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pricingsection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
