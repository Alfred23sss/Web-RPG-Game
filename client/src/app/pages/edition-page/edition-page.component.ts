/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridComponent } from '@app/components/grid/grid.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { GameService } from '@app/services/game.service';

@Component({
    selector: 'app-edition-page',
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [CommonModule, FormsModule, GridComponent, ToolbarComponent],
})
export class EditionPageComponent implements OnInit {
    activeTool: string | null = null;
    isDragging = false;
    activeToolImage: string = '';
    grid: string[][];
    gameName: string = '';
    gameDescription: string = '';
    selectedGameSize: string = '';
    selectedGameMode: string = '';
    selectedGameSizeInt: number = 0;

    constructor(private gameService: GameService) {
        this.grid = this.generateGrid(10, 10); // Générer une grille 10x10 par défaut
    }

    ngOnInit() {
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.selectedGameMode = currentGame.mode;
            this.selectedGameSize = currentGame.size;
            this.selectedGameSizeInt = parseInt(this.selectedGameSize, 10);
        }
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

    addItem(rowIndex: number, colIndex: number): void {
        this.grid[rowIndex][colIndex] = this.activeToolImage;
    }

    getImageFromCell(rowIndex: number, colIndex: number): string {
        const image = this.grid[rowIndex][colIndex];
        return image ? `url(${image})` : `url(${'assets/images/clay.png'})`;
    }

    private generateGrid(rows: number, cols: number): string[][] {
        return Array.from({ length: rows }, () => Array(cols).fill(''));
    }

    /*
    Empty() {
        for(int i = 0; i < row; ++i )
        {
            for(int i = 0; i < col; ++i )
            {
                grid = null;
            }
        }
    }
    */

    /*
    Reset() {
        for(int i = 0; i < row; ++i )
        {
            for(int i = 0; i < col; ++i )
            {
                grid = grid sauvegarder;
            }
        }
    }
    */
}
