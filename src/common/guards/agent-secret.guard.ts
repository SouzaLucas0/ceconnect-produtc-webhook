import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

// Valida a senha enviada no header "x-zpro-agent-secret" (usado pelo agente)
@Injectable()
export class AgentSecretGuard implements CanActivate {
  private readonly logger = new Logger(AgentSecretGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const provided: unknown = req.headers['x-zpro-agent-secret'];
    const expected = this.config.getOrThrow<string>('API_PASSWORD');

    if (typeof provided !== 'string' || !this.safeCompare(provided, expected)) {
      // Loga método e rota, nunca a senha enviada
      this.logger.warn(`Acesso negado: ${req.method} ${req.url} (ip: ${req.ip})`);
      throw new UnauthorizedException('Senha inválida');
    }

    return true;
  }

  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }
}
