// import { CommonModule } from '@angular/common';
// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// import { MatTooltipModule } from '@angular/material/tooltip';
// // import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
// import { GameService } from '@app/services/game/game.service';
// import { CreatePageComponent } from './create-page.component';

// describe('CreatePageComponent', () => {
//     let component: CreatePageComponent;
//     let fixture: ComponentFixture<CreatePageComponent>;
//     // let dialog: MatDialog;
//     let mockGameService: jasmine.SpyObj<GameService>;

//     beforeEach(async () => {
//         mockGameService = jasmine.createSpyObj('GameService', ['getGames']);

//         await TestBed.configureTestingModule({
//             imports: [MatDialogModule, MatTooltipModule, CommonModule, CreatePageComponent],
//             providers: [{ provide: GameService, useValue: mockGameService }],
//         }).compileComponents();
//     });

//     beforeEach(() => {
//         fixture = TestBed.createComponent(CreatePageComponent);
//         component = fixture.componentInstance;
//         // dialog = TestBed.inject(MatDialog);
//         mockGameService.getGames.and.returnValue([]);

//         fixture.detectChanges();
//     });

//     it('should create', () => {
//         expect(component).toBeTruthy();
//     });
// });
