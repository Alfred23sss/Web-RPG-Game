import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemBarComponent } from './item-bar.component';

fdescribe('ItemBarComponent', () => {
    let component: ItemBarComponent;
    let fixture: ComponentFixture<ItemBarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ItemBarComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
