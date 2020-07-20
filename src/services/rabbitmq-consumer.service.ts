import { Injectable } from '@nestjs/common';
import { Consumer } from 'rabbitmq-provider/consumer';

@Injectable()
export class RabbitmqConsumerService {
  consumer: Consumer;

  async createAndStartProcessing(fnConsume: Function) {
    this.consumer = await Consumer.createConsumer({
        connUrl: 'amqp://guest:1237@localhost:5672',
        queue: 'queue-gateway',
      },
      null,
      fnConsume);
  }
}
