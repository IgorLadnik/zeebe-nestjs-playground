// app.controller.ts
import { Guid } from 'guid-typescript';
import { Request, Response } from 'express';
import { Controller, Inject, Get, Post, Req, Res, Body, HttpStatus, UsePipes, UseInterceptors } from '@nestjs/common';
import { ZBClient } from 'zeebe-node';
import { CreateWorkflowInstanceResponse } from 'zeebe-node/interfaces';
import { ZEEBE_CONNECTION_PROVIDER, ZeebeWorker, ZeebeServer } from '@payk/nestjs-zeebe';
import { Consumer } from 'rabbitmq-provider/consumer';
import { AppService } from '../services/app.service';
import { RabbitmqPublisherService } from '../services/rabbitmq-publisher.service';
import { RabbitmqExchDirectPublisherService } from '../services/rabbitmq-exch-direct-publisher.service';
import { RabbitmqConsumerService } from '../services/rabbitmq-consumer.service';
import { RabbitmqChunkConsumerService } from '../services/rabbitmq-chunk-consumer.service';

class Message {
  constructor(public id: number, public text: string) { }
}

@Controller()
export class AppController {
  responses = new Map<string, Response>();

  constructor(
    @Inject(ZEEBE_CONNECTION_PROVIDER) private readonly zbClient: ZBClient,
    private readonly zeebeServer: ZeebeServer,
    private readonly appService: AppService,
    private readonly rabbitmqPublisherService: RabbitmqPublisherService, // publisher to submit result to gateway
    private readonly rabbitmqExchDirectPublisherService: RabbitmqExchDirectPublisherService, // exchange direct publisher
    private readonly rabbitmqConsumerService: RabbitmqConsumerService, // gateway consumer
    private readonly rabbitmqChunkConsumerService: RabbitmqChunkConsumerService, // chunks exchange direct consumer
  ) {
    // Gateway consumer
    this.rabbitmqConsumerService.createAndStartProcessing((_, messages) => {
      const payloads = Consumer.getPayloads(messages);
      console.log(`@@@ send back events: ${JSON.stringify(messages)}`);
      payloads.forEach(item => this.sendResultToClient(item.sessionId, item.result));
    })
      .then(() => console.log('Gateway consumer created and started processing'));

    // Chunks exchange direct consumer
    this.rabbitmqChunkConsumerService.createAndStartChunksProcessing(events => {
      console.log(`*** events: ${JSON.stringify(events)}`);
    })
      .then(() => console.log('Exchange direst consumer created and started chunks processing'));

    // Publisher to submit result to gateway
    this.rabbitmqPublisherService.create()
      .then(() => console.log('Gateway publisher created'));

    // Exchange direct publisher
    this.rabbitmqExchDirectPublisherService.create()
      .then(() => console.log('Exchange direst publisher created'));
  }

  sendResultToClient(sessionId: string, result: any) {
    const response = this.responses.get(sessionId);
    if (response) {
      response.status(HttpStatus.OK).send(`Workflow result -> ${JSON.stringify(result)}`);
      this.responses.delete(sessionId);
    }
  }

  sendResultToGateway = (sessionId: string, result: any) =>
    this.rabbitmqPublisherService.publish({ sessionId, result })

  // Use the client to create a new workflow instance
  @Get()
  async start(@Req() req: Request, @Res() res: Response): Promise<CreateWorkflowInstanceResponse> {
    const sessionId = `${Guid.create()}`;
    const wfi = await this.zbClient.createWorkflowInstance('order-process', {
      sessionId,
      tracer: 'init',
    });

    console.log(`getHello() ${JSON.stringify(wfi)}`);

    // res.status(HttpStatus.OK).send(`getHello() ${JSON.stringify(wfi)}`);

    this.rabbitmqExchDirectPublisherService.publish(new Message(1, 'aa'));

    this.responses.set(sessionId, res);
    return wfi;
  }

  // Subscribe to events of type 'task-1' and
  //   create a worker with the options as passed below (zeebe-node ZBWorkerOptions)
  @ZeebeWorker('task-1', { maxJobsToActivate: 10, timeout: 300 })
  task1(job, complete) {
    console.log('task-1 -> Task variables', job.variables);

    // Task worker business logic
    const result = '1';

    const variableUpdate = {
      tracer: 'task-1',
      status: 'ok',
      result,
    };

    complete.success(variableUpdate);
  }

  // Subscribe to events of type 'task-2'
  @ZeebeWorker('task-2')
  task2(job, complete) {
    console.log('task-2 -> Task variables', job.variables);

    // Task worker business logic
    const result = job.variables.result + '2';

    const variableUpdate = {
      tracer: 'task-2',
      status: 'ok',
      result,
      nextTask: 3,
    };

    complete.success(variableUpdate);
  }

  // Subscribe to events of type 'task-3'
  @ZeebeWorker('task-3')
  task3(job, complete) {
    console.log('task-3 -> Task variables', job.variables);

    // Task worker business logic
    const result = job.variables.result + '.3... ' + job.variables.sessionId;

    const variableUpdate = {
      tracer: 'task-3',
      status: 'ok',
      result,
    };

    complete.success(variableUpdate);

    this.sendResultToGateway(job.variables.sessionId, result);
  }

  // Subscribe to events of type 'task-4'
  @ZeebeWorker('task-4')
  task4(job, complete) {
    console.log('task-4 -> Task variables', job.variables);

    // Task worker business logic
    const result = job.variables.result + '.4... ' + job.variables.sessionId;

    const variableUpdate = {
      tracer: 'task-4',
      status: 'ok',
      result,
    };

    complete.success(variableUpdate);

    this.sendResultToGateway(job.variables.sessionId, result);
  }
}
