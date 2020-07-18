// app.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { ZBClient } from 'zeebe-node';
import { CreateWorkflowInstanceResponse } from 'zeebe-node/interfaces';
import {
  ZEEBE_CONNECTION_PROVIDER,
  ZeebeWorker,
  ZeebeServer,
} from '@payk/nestjs-zeebe';
// import { tsIndexSignature } from '@babel/types';

@Controller()
export class AppController {
  constructor(
    @Inject(ZEEBE_CONNECTION_PROVIDER) private readonly zbClient: ZBClient,
    private readonly zeebeServer: ZeebeServer,
    private readonly appService: AppService,
  ) {}

  // Use the client to create a new workflow instance
  @Get()
  async getHello(): Promise<CreateWorkflowInstanceResponse> {
    const res = await this.zbClient.createWorkflowInstance('order-process', {
      sessionId: 1,
      tracer: 'init',
      payload: 'some data'
    });
    console.log(`getHello() ${JSON.stringify(res)}`);
    return res;
  }

  // Subscribe to events of type 'inventory-service and create a worker with the options as passed below (zeebe-node ZBWorkerOptions)
  @ZeebeWorker('inventory-service', { maxJobsToActivate: 10, timeout: 300 })
  inventoryService(job, complete) {
    // tslint:disable-next-line: no-console
    console.log('Inventory-service, Task variables', job.variables);
    const variableUpdate = {
      tracer: 'inventory',
      resultInventory: 'success'
    };

    // Task worker business logic goes here

    complete.success(variableUpdate);
  }

  // Subscribe to events of type 'payment-service
  @ZeebeWorker('payment-service')
  paymentService(job, complete) {
    // tslint:disable-next-line: no-console
    console.log('Payment-service, Task variables', job.variables);
    const variableUpdate = {
      tracer: 'payment',
      resultPayment: 'success'
    };

    // Task worker business logic goes here

    complete.success(variableUpdate);
  }
}
