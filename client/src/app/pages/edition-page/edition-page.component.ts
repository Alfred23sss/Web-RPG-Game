/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-edition-page',
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [CommonModule, FormsModule],
})
export class EditionPageComponent {
    activeTool: string | null = null;
    grid: string[][];
    gameName: string = '';
    gameDescription: string = '';

    constructor() {
        this.grid = this.generateGrid(10, 10); // Générer une grille 10x10 par défaut
    }

    selectTool(tool: string): void {
        this.activeTool = tool;
    }

    isToolActive(tool: string): boolean {
        return this.activeTool === tool;
    }

    private generateGrid(rows: number, cols: number): string[][] {
        return Array.from({ length: rows }, () => Array(cols).fill(''));
    }
}
