import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileType } from '@app/enums/global.enums';
import { ToolService } from '@app/services/tool/tool.service';
import { of } from 'rxjs';
import { ToolbarComponent } from './toolbar.component';
import { ImageType } from '@common/enums';

describe('ToolbarComponent', () => {
    let component: ToolbarComponent;
    let fixture: ComponentFixture<ToolbarComponent>;
    let toolService: ToolService;

    beforeEach(async () => {
        const toolServiceMock = {
            selectedTool$: of({ tool: TileType.Wall, image: ImageType.Wall }),
            getSelectedTool: jasmine.createSpy('getSelectedTool').and.returnValue({ tool: TileType.Wall, image: ImageType.Wall }),
            setSelectedTool: jasmine.createSpy('setSelectedTool'),
        };

        await TestBed.configureTestingModule({
            imports: [ToolbarComponent],
            providers: [{ provide: ToolService, useValue: toolServiceMock }],
        }).compileComponents();

        toolService = TestBed.inject(ToolService);
        fixture = TestBed.createComponent(ToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with tool from service', () => {
        expect(component.activeTool).toEqual({
            tool: TileType.Wall,
            image: ImageType.Wall,
        });
        expect(toolService.getSelectedTool).toHaveBeenCalled();
    });

    it('should call setSelectedTool with correct parameters', () => {
        const tool = TileType.Ice;
        const image = ImageType.Ice;

        component.selectTool(tool, image);

        expect(toolService.setSelectedTool).toHaveBeenCalledWith({
            tool: TileType.Ice,
            image: ImageType.Ice,
        });
    });

    it('should return true from isSelected when tool matches active tool', () => {
        component.activeTool = { tool: TileType.Door, image: ImageType.ClosedDoor };
        expect(component.isSelected(TileType.Door)).toBeTrue();
    });

    it('should return false from isSelected when tool does not match active tool', () => {
        component.activeTool = { tool: TileType.Water, image: ImageType.Water };
        expect(component.isSelected(TileType.Ice)).toBeFalse();
    });

    it('should return false from isSelected when no tool is selected', () => {
        component.activeTool = null;
        expect(component.isSelected(TileType.Wall)).toBeFalse();
    });

    describe('when no tool is selected', () => {
        beforeEach(() => {
            (toolService.selectedTool$ as unknown) = of(null);
            (toolService.getSelectedTool as jasmine.Spy).and.returnValue(null);
            component.ngOnInit();
            fixture.detectChanges();
        });

        it('should handle null selection', () => {
            expect(component.activeTool).toBeNull();
        });

        it('isSelected should return false for any tool', () => {
            expect(component.isSelected(TileType.Wall)).toBeFalse();
            expect(component.isSelected(TileType.Door)).toBeFalse();
        });
    });

    describe('when Default tool is selected', () => {
        beforeEach(() => {
            const defaultTool = { tool: TileType.Default, image: ImageType.Default };
            (toolService.selectedTool$ as unknown) = of(defaultTool);
            (toolService.getSelectedTool as jasmine.Spy).and.returnValue(defaultTool);
            component.ngOnInit();
            fixture.detectChanges();
        });

        it('should recognize Default selection', () => {
            expect(component.isSelected(TileType.Default)).toBeTrue();
        });

        it('should not recognize other tools as selected', () => {
            expect(component.isSelected(TileType.Wall)).toBeFalse();
        });
    });
});
