import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Horizontalmenu } from './horizontalmenu';

describe('Horizontalmenu', () => {
  let component: Horizontalmenu;
  let fixture: ComponentFixture<Horizontalmenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Horizontalmenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Horizontalmenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
