import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ScreenshotService } from './generate-screenshots.service';

describe('ScreenshotService', () => {
    let service: ScreenshotService;
    let mockHtml2Canvas: jasmine.Spy;
    let mockElement: HTMLElement;
    let mockDocument: { getElementById: (id: string) => HTMLElement | null };

    beforeEach(() => {
        mockDocument = {
            getElementById: (id: string) => null,
        };

        mockHtml2Canvas = jasmine.createSpy('html2canvas').and.callFake((element, options) => {
            if (options?.onclone) {
                const clonedDoc = {
                    getElementById: (id: string) => (id === element.id ? element : null),
                } as unknown as Document;
                options.onclone(clonedDoc);
            }

            return Promise.resolve({
                toDataURL: () => 'data:image/png;base64,...',
            });
        });

        TestBed.configureTestingModule({
            providers: [ScreenshotService, { provide: DOCUMENT, useValue: mockDocument }, { provide: 'HTML2CANVAS', useValue: mockHtml2Canvas }],
        });

        service = TestBed.inject(ScreenshotService);
    });

    describe('Element found', () => {
        beforeEach(() => {
            mockElement = document.createElement('div');
            mockElement.id = 'test';
            mockDocument.getElementById = jasmine.createSpy('getElementById').and.returnValue(mockElement);
        });

        it('should call html2canvas with default options', async () => {
            await service.generateScreenshot('test');

            expect(mockHtml2Canvas).toHaveBeenCalledWith(mockElement, {
                logging: false,
                scale: 1,
                onclone: jasmine.any(Function),
            });
        });
    });
});
