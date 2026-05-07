import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingAddress } from './billing-address';

describe('BillingAddress', () => {
  let component: BillingAddress;
  let fixture: ComponentFixture<BillingAddress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingAddress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BillingAddress);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
