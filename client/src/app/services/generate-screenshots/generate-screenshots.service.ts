import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Html2CanvasWrapper } from './html2canvas-wrapper';

interface CaptureOptions {
    scale?: number;
    quality?: number;
    imageFormat?: string;
}

@Injectable({
    providedIn: 'root',
})
export class ScreenshotService {
    constructor(@Inject(DOCUMENT) private document: Document) {}

    async generateScreenshot(elementId: string): Promise<string> {
        return this.captureElement(elementId);
    }

    async generatePreview(elementId: string): Promise<string> {
        const previewOptions: CaptureOptions = {
            scale: 0.8,
            quality: 0.7,
            imageFormat: 'image/jpeg',
        };
        return this.captureElement(elementId, previewOptions);
    }

    private async captureElement(elementId: string, options?: CaptureOptions): Promise<string> {
        window.scrollTo(0, 0);

        const target = this.document.getElementById(elementId);

        if (!target) {
            return Promise.reject(`Element '${elementId}' not found`);
        }

        try {
            const canvas = await Html2CanvasWrapper.captureElement(target, {
                logging: false,
                scale: options?.scale || 1,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById(elementId);
                    clonedElement?.classList.add('html2canvas');
                },
            });

            return canvas.toDataURL(options?.imageFormat || 'image/png', options?.quality);
        } catch (error) {
            return Promise.reject(`Failed to capture: ${error}`);
        }
    }
}
