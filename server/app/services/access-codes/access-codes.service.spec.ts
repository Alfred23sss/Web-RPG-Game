import { AccessCodesService } from './access-codes.service';
import { AccessCodes } from './access-codes.service.constant';

describe('AccessCodesService', () => {
    let accessCodesService: AccessCodesService;

    beforeEach(() => {
        accessCodesService = new AccessCodesService();
    });

    it('should be defined', () => {
        expect(accessCodesService).toBeDefined();
    });

    it('should generate a unique access code', () => {
        const generatedCode = accessCodesService.generateAccessCode();
        expect(generatedCode).toHaveLength(AccessCodes.MinValue.toString().length);
        expect(accessCodesService.validateAccessCode(generatedCode)).toBe(true);
    });

    it('should validate an existing access code', () => {
        const code = accessCodesService.generateAccessCode();
        expect(accessCodesService.validateAccessCode(code)).toBe(true);
    });

    it('should not validate a non-existing access code', () => {
        const code = '123456';
        expect(accessCodesService.validateAccessCode(code)).toBe(false);
    });

    it('should remove an access code', () => {
        const code = accessCodesService.generateAccessCode();
        accessCodesService.removeAccessCode(code);
        expect(accessCodesService.validateAccessCode(code)).toBe(false);
    });

    it('should return all access codes', () => {
        const code1 = accessCodesService.generateAccessCode();
        const code2 = accessCodesService.generateAccessCode();
        const allCodes = accessCodesService.getAllAccessCodes();
        expect(allCodes).toContain(code1);
        expect(allCodes).toContain(code2);
        expect(allCodes.length).toBe(2);
    });
});
