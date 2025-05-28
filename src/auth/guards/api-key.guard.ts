import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {

  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());

    if (isPublic) { // * allow the request if the route is public
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];
    const expectedKey = process.env.API_KEY;

    // this.logger.log(`canActivate: apiKeyHeader=${apiKeyHeader}, expectedKey=${expectedKey}`);

    if(!expectedKey){ // * allow the request if API_KEY is not defined in .env file
      this.logger.error('API_KEY not defined in .env file');
      return true;
    }

    if(!apiKeyHeader){
      this.logger.warn('x-api-key header not defined in request');
    }
    
    if (!apiKeyHeader || apiKeyHeader !== expectedKey) {
      throw new UnauthorizedException('request not authorized');
    }

    return true;
  }
}
