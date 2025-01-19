import { Component } from '@angular/core';

@Component({
    selector: 'app-toolbar',
    standalone: true,
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
    activeTool: string | null = null;
    activeToolImage: string = '';

    selectTool(tool: string, imageURL: string): void {
        this.activeTool = tool;
        this.activeToolImage = imageURL;
    }

    isToolActive(tool: string): boolean {
        return this.activeTool === tool;
    }
}
