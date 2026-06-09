import { Job } from 'bull';
import { EmailQueueProcessor } from './email-queue.processor';
import { EmailService } from './email.service';
import {
  SendVerificationEmailJobData,
  SendAccountExistsEmailJobData,
} from './interfaces/email-job.interface';

describe('EmailQueueProcessor', () => {
  let processor: EmailQueueProcessor;
  let mockSendVerificationEmail: jest.Mock;
  let mockSendAccountExistsEmail: jest.Mock;

  beforeEach(() => {
    mockSendVerificationEmail = jest.fn().mockResolvedValue(undefined);
    mockSendAccountExistsEmail = jest.fn().mockResolvedValue(undefined);

    const emailService = {
      sendVerificationEmail: mockSendVerificationEmail,
      sendAccountExistsEmail: mockSendAccountExistsEmail,
    } as unknown as EmailService;

    processor = new EmailQueueProcessor(emailService);
  });

  describe('handleVerification', () => {
    it('should delegate to EmailService.sendVerificationEmail', async () => {
      const job = {
        data: {
          to: 'user@example.com',
          userName: 'Juan Pérez',
          token: 'abc123',
        },
      } as Job<SendVerificationEmailJobData>;

      await processor.handleVerification(job);

      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Juan Pérez',
        'abc123',
      );
    });
  });

  describe('handleAccountExists', () => {
    it('should delegate to EmailService.sendAccountExistsEmail', async () => {
      const job = {
        data: { to: 'user@example.com' },
      } as Job<SendAccountExistsEmailJobData>;

      await processor.handleAccountExists(job);

      expect(mockSendAccountExistsEmail).toHaveBeenCalledWith(
        'user@example.com',
      );
    });
  });
});
