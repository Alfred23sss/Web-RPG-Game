import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopUpUnavailableComponent } from './pop-up-unavailable.component';

describe('PopUpUnavailableComponent', () => {
  let component: PopUpUnavailableComponent;
  let fixture: ComponentFixture<PopUpUnavailableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopUpUnavailableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopUpUnavailableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
