import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    private selectedToolSubject = new BehaviorSubject<{ tool: string; image: string }>({
        tool: '',
        image: 'assets/images/clay.png',
    });
    selectedTool$ = this.selectedToolSubject.asObservable();

    setSelectedTool(tool: string, image: string): void {
        this.selectedToolSubject.next({ tool, image });
    }

    getSelectedTool(): { tool: string; image: string } | null {
        return this.selectedToolSubject.value;
    }
}
