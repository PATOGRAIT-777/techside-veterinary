import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from './email.service';
import {
  SendVerificationEmailJobData,
  SendAccountExistsEmailJobData,
} from './interfaces/email-job.interface';

@Processor('email-queue')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-verification')
  async handleVerification(
    job: Job<SendVerificationEmailJobData>,
  ): Promise<void> {
    this.logger.log(`Processing verification email for ${job.data.to}`);
    await this.emailService.sendVerificationEmail(
      job.data.to,
      job.data.userName,
      job.data.token,
    );
    this.logger.log(`Verification email sent to ${job.data.to}`);
  }

  @Process('send-account-exists')
  async handleAccountExists(
    job: Job<SendAccountExistsEmailJobData>,
  ): Promise<void> {
    this.logger.log(`Processing account-exists email for ${job.data.to}`);
    await this.emailService.sendAccountExistsEmail(job.data.to);
    this.logger.log(`Account-exists email sent to ${job.data.to}`);
  }
}
