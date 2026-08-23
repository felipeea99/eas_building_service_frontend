import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioHandler } from './inicio-handler';

describe('InicioHandler', () => {
  let component: InicioHandler;
  let fixture: ComponentFixture<InicioHandler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioHandler],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioHandler);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
