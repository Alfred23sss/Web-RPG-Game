import { Injectable } from '@angular/core';
import { TileType } from '@app/interfaces/tile';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    private selectedToolSubject = new BehaviorSubject<{ tool: TileType; image: string }>({
        tool: TileType.Default,
        image: 'assets/images/clay.png',
    });
    selectedTool$ = this.selectedToolSubject.asObservable();

    setSelectedTool(tool: TileType, image: string): void {
        this.selectedToolSubject.next({ tool, image });
    }

    getSelectedTool(): { tool: TileType; image: string } | null {
        return this.selectedToolSubject.value;
    }
}
