import { Injectable } from '@nestjs/common';
import { Publisher } from 'rabbitmq-provider/publisher';

@Injectable()
export class RabbitmqPublisherService {
  publisher: Publisher;

  async create() {
    this.publisher = await Publisher.createPublisher({
        connUrl: 'amqp://guest:1237@localhost:5672',
        exchange: 'exchange-direct-notification',
        exchangeType: 'direct',
        durable: true,
        persistent: true,
      },
      null);
  }

  publish(...msg: any[]) {
    this.publisher.publish(msg);
  }
}
