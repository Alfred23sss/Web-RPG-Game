import { TestBed } from '@angular/core/testing';
import { ImageType, TileType } from '@app/enums/global.enums';
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
        service.selectedTool$.subscribe((selection) => {
            expect(selection).toEqual({
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
    ].forEach((testCase) => {
        it(`should emit ${testCase.tool} with ${testCase.image} when selected`, (done) => {
            service.setSelectedTool(testCase);

            service.selectedTool$.subscribe((selection) => {
                expect(selection).toEqual(testCase);
                done();
            });
        });
    });
});
