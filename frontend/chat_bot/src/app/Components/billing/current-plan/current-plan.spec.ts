import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentPlan } from './current-plan';

describe('CurrentPlan', () => {
  let component: CurrentPlan;
  let fixture: ComponentFixture<CurrentPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentPlan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentPlan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
