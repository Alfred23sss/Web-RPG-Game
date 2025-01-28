import { Injectable } from '@angular/core';
import { ImageType, TileType } from '@app/interfaces/tile';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    private selectedToolSubject = new BehaviorSubject<{ tool: TileType; image: ImageType }>({
        tool: TileType.Default,
        image: ImageType.Default,
    });
    // eslint-disable-next-line @typescript-eslint/member-ordering
    selectedTool$ = this.selectedToolSubject.asObservable();

    setSelectedTool(tool: TileType, image: ImageType): void {
        this.selectedToolSubject.next({ tool, image });
    }

    getSelectedTool(): { tool: TileType; image: ImageType } | null {
        return this.selectedToolSubject.value;
    }
}
