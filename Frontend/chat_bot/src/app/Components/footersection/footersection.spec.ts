import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Footersection } from './footersection';

describe('Footersection', () => {
  let component: Footersection;
  let fixture: ComponentFixture<Footersection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footersection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Footersection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
