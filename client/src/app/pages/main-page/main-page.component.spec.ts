import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Routes, provideRouter } from '@angular/router';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { of } from 'rxjs';

const routes: Routes = [];

describe('MainPageComponent', () => {
    let component: MainPageComponent;
    let fixture: ComponentFixture<MainPageComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);

        await TestBed.configureTestingModule({
            imports: [MainPageComponent],
            providers: [provideHttpClientTesting(), provideRouter(routes), { provide: MatDialog, useValue: mockDialog }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(MainPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it("should have as title 'William's Wonderland'", () => {
        expect(component.title).toEqual("William's Wonderland");
    });

    it('should open the dialog when openDialog is called', () => {
        component.openDialog();
        expect(mockDialog.open).toHaveBeenCalled();
    });
});
