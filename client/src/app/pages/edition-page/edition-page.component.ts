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
    isDragging = false;
    activeToolImage: string = '';
    grid: string[][];
    gameName: string = '';
    gameDescription: string = '';

    constructor() {
        this.grid = this.generateGrid(10, 10); // Générer une grille 10x10 par défaut
    }

    selectTool(tool: string, imageURL: string): void {
        this.activeTool = tool;
        this.activeToolImage = imageURL;
    }

    isToolActive(tool: string): boolean {
        return this.activeTool === tool;
    }

    startDrag() {
        this.isDragging = true;
    }

    stopDrag() {
        this.isDragging = false;
    }

    dragItem(rowIndex: number, colIndex: number) {
        if (this.isDragging) {
            this.addItem(rowIndex, colIndex);
        }
    }

    private generateGrid(rows: number, cols: number): string[][] {
        return Array.from({ length: rows }, () => Array(cols).fill(''));
    }

    addItem(rowIndex: number, colIndex: number): void {
        this.grid[rowIndex][colIndex] = this.activeToolImage;
    }

    getImageFromCell(rowIndex: number, colIndex: number): string {
        const image = this.grid[rowIndex][colIndex];
        return image ? `url(${image})` : `url(${`assets/images/clay.png`})`;
    }
}
