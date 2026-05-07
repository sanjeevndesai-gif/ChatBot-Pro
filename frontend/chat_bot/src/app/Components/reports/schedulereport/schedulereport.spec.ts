import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Schedulereport } from './schedulereport';

describe('Schedulereport', () => {
  let component: Schedulereport;
  let fixture: ComponentFixture<Schedulereport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Schedulereport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Schedulereport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
