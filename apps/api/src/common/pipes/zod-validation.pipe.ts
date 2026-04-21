import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import type { ZodType } from "zod";

type NestMetatype = abstract new (...args: never[]) => unknown;

type ZodMetatype = {
  schema?: ZodType;
} & NestMetatype;

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype as ZodMetatype | undefined;
    const schema = metatype?.schema;

    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        issues: result.error.flatten(),
        message: "Request validation failed",
      });
    }

    return result.data;
  }
}
