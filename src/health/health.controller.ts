import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  // Rota pública, sem senha, para o Render verificar se a API está no ar
  @Get()
  @ApiOkResponse({ schema: { type: 'boolean', example: true } })
  check(): boolean {
    this.logger.log('Health check recebido');
    return true;
  }
}
