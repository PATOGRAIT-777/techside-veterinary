import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEMPLATE_VAR_REGEX = /{{\.([A-Za-z0-9_]+)}}/g;

@Injectable()
export class EmailTemplateService {
  render(
    templateName: 'cuentanueva' | 'cuentaexistente',
    variables: Record<string, string>,
  ): string {
    const templatePath = join(
      process.cwd(),
      'public',
      'emailTemplates',
      `${templateName}.html`,
    );
    const template = readFileSync(templatePath, 'utf-8');

    return template.replace(
      TEMPLATE_VAR_REGEX,
      (_match: string, key: string) => {
        return variables[key] ?? '';
      },
    );
  }
}
