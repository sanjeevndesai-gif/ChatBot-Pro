import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ctasection } from './ctasection';

describe('Ctasection', () => {
  let component: Ctasection;
  let fixture: ComponentFixture<Ctasection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ctasection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ctasection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
