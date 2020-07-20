import { Injectable } from '@nestjs/common';
import { Consumer } from 'rabbitmq-provider/consumer';

@Injectable()
export class RabbitmqChunkConsumerService {
  consumer: Consumer;

  async createAndStartChunksProcessing(fnChunks: Function) {
    this.consumer = (await Consumer.createConsumer({
        connUrl: 'amqp://guest:1237@localhost:5672',
        exchange: 'exchange-direct-notification',
        exchangeType: 'direct',
        queue: 'queue-service-01',
        noAck: true,
      },
      null))
     .startProcessChunks(events => fnChunks(events), 5000);
  }
}
