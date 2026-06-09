import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';

const mockResendSend = jest.fn().mockResolvedValue({ id: 'test-email-id' });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockTemplateService: { render: jest.Mock };

  beforeEach(async () => {
    mockTemplateService = { render: jest.fn() };
    mockResendSend.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RESEND_API_KEY') return 'test-api-key';
              if (key === 'BACKEND_BASE_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
        {
          provide: EmailTemplateService,
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendVerificationEmail', () => {
    it('should render template and send via Resend', async () => {
      mockTemplateService.render.mockReturnValue('<html>verification</html>');

      await service.sendVerificationEmail(
        'user@example.com',
        'Juan Pérez',
        'abc123token',
      );

      expect(mockTemplateService.render).toHaveBeenCalledWith(
        'cuentanueva',
        expect.objectContaining({
          UserName: 'Juan Pérez',
          ClinicName: 'Clínica Veterinaria VETEC',
          VerificationURL:
            'http://localhost:3000/auth/verify?token=abc123token',
          Year: String(new Date().getFullYear()),
        }),
      );

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'VETEC <onboarding@resend.dev>',
          to: 'user@example.com',
          subject: 'Verificar mi cuenta - VETEC',
          html: '<html>verification</html>',
        }),
      );
    });
  });

  describe('sendAccountExistsEmail', () => {
    it('should render template and send via Resend', async () => {
      mockTemplateService.render.mockReturnValue('<html>exists</html>');

      await service.sendAccountExistsEmail('user@example.com');

      expect(mockTemplateService.render).toHaveBeenCalledWith(
        'cuentaexistente',
        expect.objectContaining({
          ClinicName: 'Clínica Veterinaria VETEC',
          LoginURL: 'http://localhost:3000/auth/login',
          Year: String(new Date().getFullYear()),
        }),
      );

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'VETEC <onboarding@resend.dev>',
          to: 'user@example.com',
          subject: 'Intento de registro - VETEC',
          html: '<html>exists</html>',
        }),
      );
    });
  });
});
