import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessCodesController } from './access-code.controller';

describe('AccessCodesController', () => {
    let controller: AccessCodesController;
    let service: AccessCodesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AccessCodesController],
            providers: [
                {
                    provide: AccessCodesService,
                    useValue: {
                        generateAccessCode: jest.fn(),
                        validateAccessCode: jest.fn(),
                        getAllAccessCodes: jest.fn(),
                        removeAccessCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AccessCodesController>(AccessCodesController);
        service = module.get<AccessCodesService>(AccessCodesService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('generateAccessCode', () => {
        it('should return a generated access code', () => {
            const mockCode = '123456';
            jest.spyOn(service, 'generateAccessCode').mockReturnValue(mockCode);

            expect(controller.generateAccessCode()).toEqual({ code: mockCode });
        });

        it('should throw an error if generation fails', () => {
            jest.spyOn(service, 'generateAccessCode').mockImplementation(() => {
                throw new Error('Service error');
            });

            expect(() => controller.generateAccessCode()).toThrow(
                new HttpException({ message: 'Failed to generate access code', error: 'Service error' }, HttpStatus.BAD_REQUEST),
            );
        });
    });

    describe('validateAccessCode', () => {
        it('should return true if the access code is valid', () => {
            jest.spyOn(service, 'validateAccessCode').mockReturnValue(true);
            expect(controller.validateAccessCode('123456')).toEqual({ isValid: true });
        });

        it('should return false if the access code is invalid', () => {
            jest.spyOn(service, 'validateAccessCode').mockReturnValue(false);
            expect(controller.validateAccessCode('invalid')).toEqual({ isValid: false });
        });

        it('should throw an error if validation fails', () => {
            jest.spyOn(service, 'validateAccessCode').mockImplementation(() => {
                throw new Error('Service error');
            });

            expect(() => controller.validateAccessCode('123456')).toThrow(
                new HttpException({ message: 'Failed to validate access code', error: 'Service error' }, HttpStatus.BAD_REQUEST),
            );
        });
    });

    describe('removeAccessCode', () => {
        it('should remove an access code and return a success message', () => {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            jest.spyOn(service, 'removeAccessCode').mockImplementation(() => {});

            expect(controller.removeAccessCode('123456')).toEqual({ message: 'Access code 123456 removed successfully' });
        });

        it('should throw an error if removal fails', () => {
            jest.spyOn(service, 'removeAccessCode').mockImplementation(() => {
                throw new Error('Service error');
            });

            expect(() => controller.removeAccessCode('123456')).toThrow(
                new HttpException({ message: 'Failed to remove access code', error: 'Service error' }, HttpStatus.BAD_REQUEST),
            );
        });
    });
});
