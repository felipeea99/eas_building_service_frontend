import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioAdmin } from './inicio-admin';

describe('InicioAdmin', () => {
  let component: InicioAdmin;
  let fixture: ComponentFixture<InicioAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
