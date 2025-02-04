import html2canvas, { Options } from 'html2canvas';

export class Html2CanvasWrapper {
    static async captureElement(element: HTMLElement, options?: Partial<Options>): Promise<HTMLCanvasElement> {
        return html2canvas(element, options);
    }
}
