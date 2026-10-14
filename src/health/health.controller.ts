import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  // Rota pública, sem senha, para o Render verificar se a API está no ar
  @Get()
  @ApiOkResponse({ schema: { type: 'boolean', example: true } })
  check(): boolean {
    return true;
  }
}
