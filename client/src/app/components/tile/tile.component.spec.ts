import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileComponent } from './tile.component';
import { ToolService } from '@app/services/tool/tool.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ImageType, TileType } from '@app/interfaces/tile';

describe('TileComponent', () => {
    let component: TileComponent;
    let fixture: ComponentFixture<TileComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TileComponent],
            providers: [{ provide: ToolService, useValue: {} }],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(TileComponent);
        component = fixture.componentInstance;

        component.tile = {
            id: 'test_id',
            type: TileType.Default,
            imageSrc: ImageType.Default,
            isOpen: false,
            isOccupied: false,
        };

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
