import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ACCESS_CODE_LENGTH,
    ACCESS_CODE_MAX_VALUE,
    ACCESS_CODE_MIN_VALUE,
    ACCESS_CODE_RANGE,
    CODE_EDGE_CASES,
} from '@app/constants/global.constants';
import { WaitingViewComponent } from './waiting-view.component';

describe('WaitingViewComponent', () => {
    let component: WaitingViewComponent;
    let fixture: ComponentFixture<WaitingViewComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WaitingViewComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingViewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should generate a valid random access code', () => {
        component.ngOnInit();
        const accessCode = component.accessCode;

        expect(accessCode).toBeDefined();
        expect(accessCode.length).toBe(ACCESS_CODE_LENGTH);

        const numericValue = parseInt(accessCode, 10);
        expect(numericValue).toBeGreaterThanOrEqual(ACCESS_CODE_MIN_VALUE);
        expect(numericValue).toBeLessThanOrEqual(ACCESS_CODE_MAX_VALUE);
    });

    CODE_EDGE_CASES.forEach((randomValue) => {
        it(`should generate the correct access code when Math.random returns ${randomValue}`, () => {
            spyOn(Math, 'random').and.returnValue(randomValue);

            component.ngOnInit();
            const accessCode = component.accessCode;

            const expectedCode = (ACCESS_CODE_MIN_VALUE + Math.floor(randomValue * ACCESS_CODE_RANGE)).toString();
            expect(accessCode).toBe(expectedCode);
            expect(accessCode.length).toBe(ACCESS_CODE_LENGTH);
        });
    });

    it('each call should generate a new access code', () => {
        component.ngOnInit();
        const firstCode = component.accessCode;

        component.ngOnInit();
        const secondCode = component.accessCode;

        expect(firstCode).not.toEqual(secondCode);
    });
});
