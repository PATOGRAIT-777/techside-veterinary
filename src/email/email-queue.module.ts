import { BullModule, getQueueToken } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { Queue } from 'bull';

const EMAIL_QUEUE_ALIAS = 'EmailQueue';

@Module({
  imports: [BullModule.registerQueue({ name: 'email-queue' })],
  providers: [
    {
      provide: EMAIL_QUEUE_ALIAS,
      useFactory: (queue: Queue) => queue,
      inject: [getQueueToken('email-queue')],
    },
  ],
  exports: [EMAIL_QUEUE_ALIAS],
})
export class EmailQueueModule {}
