import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioSuperadmin } from './inicio-superadmin';

describe('InicioSuperadmin', () => {
  let component: InicioSuperadmin;
  let fixture: ComponentFixture<InicioSuperadmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioSuperadmin],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioSuperadmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
