import { Injectable } from '@angular/core';
import { ImageType } from '@app/interfaces/images';
import { TileType } from '@app/interfaces/tile';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    selectedTool$!: Observable<{ tool: TileType; image: ImageType }>;

    private selectedToolSubject = new BehaviorSubject<{ tool: TileType; image: ImageType }>({
        tool: TileType.Default,
        image: ImageType.Default,
    });

    constructor() {
        this.selectedTool$ = this.selectedToolSubject.asObservable();
    }

    setSelectedTool(tool: TileType, image: ImageType): void {
        this.selectedToolSubject.next({ tool, image });
    }

    getSelectedTool(): { tool: TileType; image: ImageType } | null {
        return this.selectedToolSubject.value;
    }
}
