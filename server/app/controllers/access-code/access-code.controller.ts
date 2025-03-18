import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Controller, Delete, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('AccessCodes')
@Controller('accessCodes')
export class AccessCodesController {
    constructor(private readonly accessCodesService: AccessCodesService) {}

    @Post()
    generateAccessCode(): { code: string } {
        try {
            const code = this.accessCodesService.generateAccessCode();
            return { code };
        } catch (error) {
            throw new HttpException({ message: 'Failed to generate access code', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get(':code/validate')
    validateAccessCode(@Param('code') code: string): { isValid: boolean } {
        try {
            const isValid = this.accessCodesService.validateAccessCode(code);
            return { isValid };
        } catch (error) {
            throw new HttpException({ message: 'Failed to validate access code', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    // @Get()
    // getAllAccessCodes(): string[] {
    //     try {
    //         return this.accessCodesService.getAllAccessCodes();
    //     } catch (error) {
    //         throw new HttpException({ message: 'Failed to fetch access codes', error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    // }

    @Delete(':code')
    removeAccessCode(@Param('code') code: string): { message: string } {
        try {
            this.accessCodesService.removeAccessCode(code);
            return { message: `Access code ${code} removed successfully` };
        } catch (error) {
            throw new HttpException({ message: 'Failed to remove access code', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }
}
