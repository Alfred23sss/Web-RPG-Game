import { TestBed } from '@angular/core/testing';
import { TileType } from '@app/enums/global.enums';
import { ImageType } from '@app/interfaces/images';
import { ToolService } from './tool.service';

describe('TimeService', () => {
    let service: ToolService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToolService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have default selected tool and image', () => {
        const defaultTool = service.getSelectedTool();
        expect(defaultTool).toEqual({
            tool: TileType.Default,
            image: ImageType.Default,
        });
    });

    it('should emit the default selected tool on subscription', (done) => {
        service.selectedTool$.subscribe((tile) => {
            expect(tile).toEqual({
                tool: TileType.Default,
                image: ImageType.Default,
            });
            done();
        });
    });

    [
        { tool: TileType.Water, image: ImageType.Water },
        { tool: TileType.Wall, image: ImageType.Wall },
        { tool: TileType.Door, image: ImageType.OpenDoor },
    ].forEach(({ tool, image }) => {
        it(`should emit the updated tool : ${tool}, with image : ${image}`, (done) => {
            service.setSelectedTool(tool, image);

            service.selectedTool$.subscribe((tile) => {
                expect(tile).toEqual({ tool, image });
                done();
            });
        });
    });
});
