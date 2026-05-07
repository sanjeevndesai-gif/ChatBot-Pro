import { TestBed } from '@angular/core/testing';

import { BillingTable } from './billing-table';

describe('BillingTable', () => {
  let service: BillingTable;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BillingTable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
