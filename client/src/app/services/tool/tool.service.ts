import { Injectable } from '@angular/core';
import { ImageType, TileType } from '@app/enums/global.enums';
import { BehaviorSubject, Observable } from 'rxjs';

interface ToolSelection {
    tool: TileType;
    image: ImageType;
}

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    selectedTool$: Observable<ToolSelection>;
    private selectedToolSubject = new BehaviorSubject<ToolSelection>({
        tool: TileType.Default,
        image: ImageType.Default,
    });

    constructor() {
        this.selectedTool$ = this.selectedToolSubject.asObservable();
    }

    setSelectedTool(selection: ToolSelection): void {
        this.selectedToolSubject.next(selection);
    }

    getSelectedTool(): ToolSelection | null {
        return this.selectedToolSubject.value;
    }
}
