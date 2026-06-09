import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailTemplateService } from './email-template.service';
import { Env } from '../config/env.validation';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClient: Resend | null = null;

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly templateService: EmailTemplateService,
  ) {}

  private getResendClient(): Resend {
    if (!this.resendClient) {
      const apiKey = this.configService.get('RESEND_API_KEY', {
        infer: true,
      });
      this.resendClient = new Resend(apiKey);
    }
    return this.resendClient;
  }

  async sendVerificationEmail(
    to: string,
    userName: string,
    token: string,
  ): Promise<void> {
    const backendBaseUrl = this.configService.get('BACKEND_BASE_URL', {
      infer: true,
    });
    const verificationUrl = `${backendBaseUrl}/auth/verify?token=${token}`;
    const year = String(new Date().getFullYear());

    const html = this.templateService.render('cuentanueva', {
      UserName: userName,
      ClinicName: 'Clínica Veterinaria VETEC',
      VerificationURL: verificationUrl,
      Year: year,
    });

    const resend = this.getResendClient();
    await resend.emails.send({
      from: 'VETEC <onboarding@resend.dev>',
      to,
      subject: 'Verificar mi cuenta - VETEC',
      html,
    });

    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendAccountExistsEmail(to: string): Promise<void> {
    const backendBaseUrl = this.configService.get('BACKEND_BASE_URL', {
      infer: true,
    });
    const loginUrl = `${backendBaseUrl}/auth/login`;
    const year = String(new Date().getFullYear());

    const html = this.templateService.render('cuentaexistente', {
      ClinicName: 'Clínica Veterinaria VETEC',
      LoginURL: loginUrl,
      Year: year,
    });

    const resend = this.getResendClient();
    await resend.emails.send({
      from: 'VETEC <onboarding@resend.dev>',
      to,
      subject: 'Intento de registro - VETEC',
      html,
    });

    this.logger.log(`Account-exists email sent to ${to}`);
  }

  /**
   * Legacy generic send method for backwards compatibility
   * with existing consumers (citas-cron, citas services).
   */
  async send(to: string, subject: string, body: string): Promise<void> {
    const resend = this.getResendClient();
    await resend.emails.send({
      from: 'VETEC <onboarding@resend.dev>',
      to,
      subject,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${body}</pre>`,
    });
    this.logger.log(`Legacy email sent to ${to}: ${subject}`);
  }
}
