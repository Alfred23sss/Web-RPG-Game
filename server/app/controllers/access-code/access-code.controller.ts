import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Body, Controller, Get, HttpException, HttpStatus, Logger, Param, Post } from '@nestjs/common';

@Controller('accessCodes')
export class AccessCodesController {
    constructor(
        private readonly accessCodesService: AccessCodesService,
        private readonly logger: Logger,
    ) {}

    @Post('generate')
    generateAccessCode() {
        try {
            const accessCode = this.accessCodesService.generateAccessCode();
            return { accessCode };
        } catch (error) {
            throw new HttpException('Error generating access code', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('validate/:code')
    validateAccessCode(@Param('code') code: string) {
        try {
            const isValid = this.accessCodesService.validateAccessCode(code);
            return { isValid };
        } catch (error) {
            throw new HttpException('Error validating access code', HttpStatus.BAD_REQUEST);
        }
    }

    @Get('all')
    getAllAccessCodes() {
        try {
            return this.accessCodesService.getAllAccessCodes();
        } catch (error) {
            throw new HttpException('Error fetching all access codes', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('remove')
    removeAccessCode(@Body() { code }: { code: string }) {
        try {
            this.accessCodesService.removeAccessCode(code);
            return { message: `Access code ${code} removed successfully` };
        } catch (error) {
            throw new HttpException('Error removing access code', HttpStatus.BAD_REQUEST);
        }
    }
}
