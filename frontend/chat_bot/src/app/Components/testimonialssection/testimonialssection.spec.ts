import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Testimonialssection } from './testimonialssection';

describe('Testimonialssection', () => {
  let component: Testimonialssection;
  let fixture: ComponentFixture<Testimonialssection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Testimonialssection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Testimonialssection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
