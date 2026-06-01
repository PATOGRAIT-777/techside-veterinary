import { Injectable } from '@nestjs/common';

interface SentMessage {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private sentMessages: SentMessage[] = [];

  send(to: string, subject: string, body: string): void {
    const message: SentMessage = { to, subject, body };
    this.sentMessages.push(message);

    console.log(`[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}`);
  }

  getSentMessages(): SentMessage[] {
    return this.sentMessages;
  }

  clear(): void {
    this.sentMessages = [];
  }
}
