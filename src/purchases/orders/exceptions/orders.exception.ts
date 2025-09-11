import { PreconditionFailedException } from '@nestjs/common';

export class AlreadyExistException extends PreconditionFailedException {};

export class IsBeingUsedException extends PreconditionFailedException {};