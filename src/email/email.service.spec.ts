import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    service.clear();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should store message in memory and log to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.send('test@example.com', 'Test Subject', 'Test Body');

      const messages = service.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        '[EMAIL] To: test@example.com | Subject: Test Subject | Body: Test Body',
      );

      consoleSpy.mockRestore();
    });

    it('should store multiple messages', () => {
      jest.spyOn(console, 'log').mockImplementation();

      service.send('a@example.com', 'Subject A', 'Body A');
      service.send('b@example.com', 'Subject B', 'Body B');

      expect(service.getSentMessages()).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should empty the messages array', () => {
      jest.spyOn(console, 'log').mockImplementation();
      service.send('test@example.com', 'Subject', 'Body');

      service.clear();

      expect(service.getSentMessages()).toHaveLength(0);
    });
  });
});
