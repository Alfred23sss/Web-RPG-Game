import { Component, OnInit } from '@angular/core';
import { ToolService } from '@app/services/tool.service';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
    activeTool: { tool: string; image: string } | null = null;

    constructor(private toolService: ToolService) {}

    ngOnInit(): void {
        this.toolService.selectedTool$.subscribe((tool) => {
            this.activeTool = tool;
        });

        this.activeTool = this.toolService.getSelectedTool();
    }

    selectTool(tool: string, image: string): void {
        this.toolService.setSelectedTool(tool, image);
    }
}
