import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ToolService } from '@app/services/tool/tool.service';
import { ImageType, TileType } from '@common/enums';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
    activeTool: { tool: TileType; image: string } | null = null;
    tileType = TileType;
    imageType = ImageType;

    constructor(
        private toolService: ToolService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.toolService.selectedTool$.subscribe((tool) => {
            this.activeTool = tool;

            this.cdr.detectChanges();
        });

        this.activeTool = this.toolService.getSelectedTool();
    }

    selectTool(tool: TileType, image: ImageType): void {
        this.toolService.setSelectedTool({ tool, image });
    }

    isSelected(tool: TileType): boolean {
        return this.activeTool?.tool === tool;
    }
}
