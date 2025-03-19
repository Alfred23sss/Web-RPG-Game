import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Game } from '@app/interfaces/game';
import { GameInfoComponent } from './game-info.component';

describe('GameInfoComponent', () => {
    let component: GameInfoComponent;
    let fixture: ComponentFixture<GameInfoComponent>;
    let mockGame: Game;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameInfoComponent, DatePipe],
        }).compileComponents();

        fixture = TestBed.createComponent(GameInfoComponent);
        component = fixture.componentInstance;

        mockGame = {
            id: '1',
            name: 'Test Game',
            size: '10x10',
            mode: 'Classique',
            lastModified: new Date('2024-01-01'),
            previewImage: '',
            description: '',
            isVisible: true,
            grid: [],
        };

        component.game = mockGame;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display game name', () => {
        const compiled = fixture.nativeElement;
        expect(compiled.querySelector('h3').textContent).toContain(mockGame.name);
    });

    it('should display game size in "NxN" format', () => {
        const compiled = fixture.nativeElement;
        const sizeElement = compiled.querySelectorAll('p')[0];
        expect(sizeElement.textContent).toContain(`Taille: ${mockGame.size}x${mockGame.size}`);
    });

    it('should display game mode', () => {
        const compiled = fixture.nativeElement;
        const modeElement = compiled.querySelectorAll('p')[1];
        expect(modeElement.textContent).toContain(`Mode de jeu: ${mockGame.mode}`);
    });

    it('should format last modified date correctly', () => {
        const compiled = fixture.nativeElement;
        const dateElement = compiled.querySelectorAll('p')[2];
        const expectedDate = new DatePipe('en-US').transform(mockGame.lastModified, 'short');
        expect(dateElement.textContent).toContain(expectedDate);
    });

    it('should update when game input changes', () => {
        const newGame = { ...mockGame, name: 'Updated Game' };
        component.game = newGame;
        fixture.detectChanges();

        const compiled = fixture.nativeElement;
        expect(compiled.querySelector('h3').textContent).toContain('Updated Game');
    });
});
