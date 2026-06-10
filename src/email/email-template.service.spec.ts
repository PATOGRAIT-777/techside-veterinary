import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import { readFileSync } from 'fs';

const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTemplateService],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
    mockReadFileSync.mockReset();
  });

  it('should replace all template variables', () => {
    mockReadFileSync.mockReturnValue(
      'Hello {{.UserName}}, welcome to {{.ClinicName}} {{.Year}}',
    );

    const result = service.render('cuentanueva', {
      UserName: 'Juan',
      ClinicName: 'VETEC',
      Year: '2026',
    });

    expect(result).toBe('Hello Juan, welcome to VETEC 2026');
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining('cuentanueva.html'),
      'utf-8',
    );
  });

  it('should leave unknown variable placeholders empty', () => {
    mockReadFileSync.mockReturnValue('{{.Known}} and {{.Unknown}}');

    const result = service.render('cuentanueva', { Known: 'value' });

    expect(result).toBe('value and ');
  });

  it('should render cuentaexistente template', () => {
    mockReadFileSync.mockReturnValue(
      '{{.ClinicName}} login: {{.LoginURL}} {{.Year}}',
    );

    const result = service.render('cuentaexistente', {
      ClinicName: 'VETEC',
      LoginURL: 'https://vetec.app/login',
      Year: '2026',
    });

    expect(result).toBe('VETEC login: https://vetec.app/login 2026');
  });
});
