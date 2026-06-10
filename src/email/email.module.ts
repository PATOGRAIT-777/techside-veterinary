import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { EmailQueueModule } from './email-queue.module';
import { EmailQueueProcessor } from './email-queue.processor';

@Module({
  imports: [EmailQueueModule],
  providers: [EmailService, EmailTemplateService, EmailQueueProcessor],
  exports: [EmailService, EmailQueueModule],
})
export class EmailModule {}
