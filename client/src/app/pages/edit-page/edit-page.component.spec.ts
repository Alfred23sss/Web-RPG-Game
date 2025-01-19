import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditPageComponent } from './edit-page.component';

describe('CreatePageComponent', () => {
    let component: EditPageComponent;
    let fixture: ComponentFixture<EditPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditPageComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
