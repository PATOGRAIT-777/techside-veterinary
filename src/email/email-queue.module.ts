import { BullModule, getQueueToken } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { Queue } from 'bull';

@Module({
  imports: [BullModule.registerQueue({ name: 'email-queue' })],
  providers: [
    {
      provide: 'BullQueue_email-queue',
      useFactory: (queue: Queue) => queue,
      inject: [getQueueToken('email-queue')],
    },
  ],
  exports: ['BullQueue_email-queue'],
})
export class EmailQueueModule {}
