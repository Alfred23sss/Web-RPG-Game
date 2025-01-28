import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageType, TileType } from '@app/interfaces/tile';
import { ToolService } from '@app/services/tool.service';
import { of } from 'rxjs';
import { ToolbarComponent } from './toolbar.component';

describe('ToolbarComponent', () => {
    let component: ToolbarComponent;
    let fixture: ComponentFixture<ToolbarComponent>;
    let toolService: ToolService;

    beforeEach(async () => {
        const toolServiceMock = {
            selectedTool$: of({ tool: TileType.Wall, image: ImageType.Wall }),
            getSelectedTool: jasmine.createSpy().and.returnValue({ tool: TileType.Wall, image: ImageType.Wall }),
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

    it('should call selectTool on ToolService when selectTool is called', () => {
        const tool = TileType.Ice;
        const image = ImageType.Ice;
        component.selectTool(tool, image);
        expect(toolService.setSelectedTool).toHaveBeenCalledWith(tool, image);
    });
});
