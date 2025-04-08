import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Item } from '@app/classes/item';
import { ItemPopUpComponent } from './item-pop-up.component';

describe('ItemPopUpComponent', () => {
    let component: ItemPopUpComponent;
    let fixture: ComponentFixture<ItemPopUpComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<ItemPopUpComponent>>;

    const mockItems: [Item, Item, Item] = [
        { id: 1, name: 'Item 1', description: 'Description 1' } as unknown as Item,
        { id: 2, name: 'Item 2', description: 'Description 2' } as unknown as Item,
        { id: 3, name: 'Item 3', description: 'Description 3' } as unknown as Item,
    ];

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [ItemPopUpComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { items: mockItems } },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ItemPopUpComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog with selected item when selectItem is called', () => {
        const selectedItem = mockItems[1];
        component.selectItem(selectedItem);
        expect(mockDialogRef.close).toHaveBeenCalledOnceWith(selectedItem);
    });
});
