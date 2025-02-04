import { ComponentFixture, TestBed } from '@angular/core/testing';

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

    const CODE_LENGTH = 4;
    const MIN_VALUE = 1000;
    const RANGE = 9000;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const EDGE_CASES = [0, 0.999];

    it('should generate a valid random access code', () => {
        component.generateAccessCode();
        const accessCode = component.accessCode;

        expect(accessCode).toBeDefined();
        expect(accessCode.length).toBe(CODE_LENGTH);

        const numericValue = parseInt(accessCode, 10);
        expect(numericValue).toBeGreaterThanOrEqual(MIN_VALUE);
        expect(numericValue).toBeLessThanOrEqual(RANGE);
    });

    EDGE_CASES.forEach((randomValue) => {
        it(`should generate the correct access code when Math.random returns ${randomValue}`, () => {
            spyOn(Math, 'random').and.returnValue(randomValue);

            component.generateAccessCode();
            const accessCode = component.accessCode;

            const expectedCode = (MIN_VALUE + Math.floor(randomValue * RANGE)).toString();
            expect(accessCode).toBe(expectedCode);
            expect(accessCode.length).toBe(CODE_LENGTH);
        });
    });

    it('each call should generate a new access code', () => {
        component.generateAccessCode();
        const firstCode = component.accessCode;

        component.generateAccessCode();
        const secondCode = component.accessCode;

        expect(firstCode).not.toEqual(secondCode);
    });
});
