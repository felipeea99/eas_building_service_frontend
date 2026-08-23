import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioTenant } from './inicio-tenant';

describe('InicioTenant', () => {
  let component: InicioTenant;
  let fixture: ComponentFixture<InicioTenant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioTenant],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioTenant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
