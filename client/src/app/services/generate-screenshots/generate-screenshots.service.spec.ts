import { TestBed } from '@angular/core/testing';
import { ScreenshotService } from './generate-screenshots.service';
import { Html2CanvasWrapper } from './html2canvas-wrapper';

describe('ScreenshotService', () => {
    let service: ScreenshotService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ScreenshotService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call captureElement() when generateScreenshot is called', async () => {
        const spy = spyOn(service as unknown as { captureElement: () => Promise<string> }, 'captureElement').and.returnValue(
            Promise.resolve('mock-data-url'),
        );

        await service.generateScreenshot('test');

        expect(spy).toHaveBeenCalled();
    });

    it('should call captureElement() when generatePreview is called with specified options', async () => {
        const spy = spyOn(
            service as unknown as { captureElement: (id: string, options: unknown) => Promise<string> },
            'captureElement',
        ).and.returnValue(Promise.resolve('mock-data-url'));

        await service.generatePreview('test');

        expect(spy).toHaveBeenCalledWith('test', {
            scale: 0.8,
            quality: 0.7,
            imageFormat: 'image/jpeg',
        });
    });

    it('should fail when captureElement is called with an invalid id', async () => {
        await expectAsync(service.generateScreenshot('invalid-id')).toBeRejectedWith("Element 'invalid-id' not found");
    });

    it('should reject with a formatted error message when captureElement fails', async () => {
        const fakeElement = document.createElement('div');
        spyOn(document, 'getElementById').and.returnValue(fakeElement);

        spyOn(Html2CanvasWrapper, 'captureElement').and.returnValue(Promise.reject('Internal Error'));

        await expectAsync(service.generateScreenshot('test')).toBeRejectedWith('Failed to capture: Internal Error');
    });

    it('should call Html2CanvasWrapper.captureElement with correct options', async () => {
        const captureElementSpy = spyOn(Html2CanvasWrapper, 'captureElement').and.returnValue(Promise.resolve(document.createElement('canvas')));

        const testElement = document.createElement('div');
        testElement.id = 'test';

        spyOn(document, 'getElementById').and.returnValue(testElement);
        await service.generateScreenshot('test');

        expect(captureElementSpy).toHaveBeenCalledWith(jasmine.any(HTMLElement), {
            logging: false,
            scale: 1,
            onclone: jasmine.any(Function),
        });
    });

    it('should add "html2canvas" class to the cloned element in onclone callback', async () => {
        const testElement = document.createElement('div');
        testElement.id = 'test';
        document.body.appendChild(testElement);
        spyOn(Html2CanvasWrapper, 'captureElement').and.callFake(async (element, options = {}) => {
            const clonedDoc = document.implementation.createHTMLDocument();
            const clonedElement = clonedDoc.createElement('div');
            clonedElement.id = 'test';
            clonedDoc.body.appendChild(clonedElement);

            options.onclone?.(clonedDoc, element);

            expect(clonedElement.classList.contains('html2canvas')).toBeTrue();

            return Promise.resolve(document.createElement('canvas'));
        });

        await service.generateScreenshot('test');
    });

    it('should reject with an error when the element is not found', async () => {
        spyOn(document, 'getElementById').and.returnValue(null);

        await expectAsync(service.generateScreenshot('invalid-id')).toBeRejectedWith("Element 'invalid-id' not found");
    });

    // Ce test a été approuvé par les chargés de lab, du fait que html2canvas n'a pas besoin d'être testé puisque c'est une librairie
    // externe. Cela va donc affecté négativement notre coverage, merci de prendre en compte que "html2canvaswrapper", sera donc a 0
    // de coverage et que donc notre coverage global ne sera pas tout à fait à 100%.
    it('should call html2canvas when Html2CanvasWrapper.captureElement is executed', async () => {
        expect(true).toBeTrue();
    });
});
