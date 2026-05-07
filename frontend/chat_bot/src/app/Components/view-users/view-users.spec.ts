import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewUsers } from './view-users';

describe('ViewUsers', () => {
  let component: ViewUsers;
  let fixture: ComponentFixture<ViewUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewUsers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewUsers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
