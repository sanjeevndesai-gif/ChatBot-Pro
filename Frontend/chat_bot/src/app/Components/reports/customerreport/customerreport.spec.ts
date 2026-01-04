import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Customerreport } from './customerreport';

describe('Customerreport', () => {
  let component: Customerreport;
  let fixture: ComponentFixture<Customerreport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Customerreport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Customerreport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
