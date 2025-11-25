import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Featuressection } from './featuressection';

describe('Featuressection', () => {
  let component: Featuressection;
  let fixture: ComponentFixture<Featuressection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Featuressection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Featuressection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
