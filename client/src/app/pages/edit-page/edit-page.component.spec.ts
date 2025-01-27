import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditPageComponent } from './edit-page.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game.service';

describe('CreatePageComponent', () => {
    let component: EditPageComponent;
    let fixture: ComponentFixture<EditPageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['getCurrentGame']);
        await TestBed.configureTestingModule({
            imports: [EditPageComponent],
            providers: [{ provide: GameService, useValue: mockGameService }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set selectedGameSize and selectedGameMode on ngOnInit when current game exists', () => {
        const mockGame: Game = {
            name: 'Test Game',
            size: '15',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'assets/images/example.png',
            description: 'A Classic game on a 15 map.',
            grid: [],
        };
        mockGameService.getCurrentGame.and.returnValue(mockGame);

        component.ngOnInit();

        expect(component.selectedGameMode).toBe('Classic');
        expect(component.selectedGameSize).toBe('15');
        expect(mockGameService.getCurrentGame).toHaveBeenCalled();
    });

    it('should leave selectedGameSize and selectedGameMode empty on ngOnInit when no current game exists', () => {
        mockGameService.getCurrentGame.and.returnValue(undefined);

        component.ngOnInit();

        expect(component.selectedGameMode).toBe('');
        expect(component.selectedGameSize).toBe('');
        expect(mockGameService.getCurrentGame).toHaveBeenCalled();
    });
});
