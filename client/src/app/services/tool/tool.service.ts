import { Injectable } from '@angular/core';
import { Tool } from '@app/interfaces/tool';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    selectedTool$!: Observable<Tool | null>;
    private selectedToolSubject = new BehaviorSubject<Tool | null>(null);

    constructor() {
        this.selectedTool$ = this.selectedToolSubject.asObservable();
    }

    setSelectedTool(toolConfig: Tool): void {
        this.selectedToolSubject.next(toolConfig);
    }

    getSelectedTool(): Tool | null {
        return this.selectedToolSubject.value;
    }
}
