import { Component, OnInit } from '@angular/core';
import { ImageType } from '@app/interfaces/images';
import { TileType } from '@app/interfaces/tile';
import { ToolService } from '@app/services/tool/tool.service';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
    activeTool: { tool: TileType; image: string } | null = null;
    tileType = TileType;
    imageType = ImageType;

    constructor(private toolService: ToolService) {}

    ngOnInit(): void {
        this.toolService.selectedTool$.subscribe((tool) => {
            this.activeTool = tool;
        });

        this.activeTool = this.toolService.getSelectedTool();
    }

    selectTool(tool: TileType, image: ImageType): void {
        this.toolService.setSelectedTool(tool, image);
    }
}
