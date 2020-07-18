// app.controller.ts
import _ from 'lodash';
import { Guid } from 'guid-typescript';
import { Request, Response } from 'express';
import { Controller, Inject, Get, Post, Req, Res, Body, HttpStatus, UsePipes, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { ZBClient } from 'zeebe-node';
import { CreateWorkflowInstanceResponse } from 'zeebe-node/interfaces';
import { ZEEBE_CONNECTION_PROVIDER, ZeebeWorker, ZeebeServer } from '@payk/nestjs-zeebe';
// import { tsIndexSignature } from '@babel/types';

@Controller()
export class AppController {
  responses = new Map<string, Response>();

  constructor(
    @Inject(ZEEBE_CONNECTION_PROVIDER) private readonly zbClient: ZBClient,
    private readonly zeebeServer: ZeebeServer,
    private readonly appService: AppService,
  ) {}

  // Use the client to create a new workflow instance
  @Get()
  async getHello(@Req() req: Request, @Res() res: Response): Promise<CreateWorkflowInstanceResponse> {
    const sessionId = `${Guid.create()}`;
    const wfi = await this.zbClient.createWorkflowInstance('order-process', {
      sessionId,
      tracer: 'init',
    });
    // tslint:disable-next-line: no-console
    console.log(`getHello() ${JSON.stringify(wfi)}`);

    // res.status(HttpStatus.OK).send(`getHello() ${JSON.stringify(wfi)}`);

    this.responses.set(sessionId, res);
    return wfi;
  }

  // Subscribe to events of type 'inventory-service and create a worker with the options as passed below (zeebe-node ZBWorkerOptions)
  @ZeebeWorker('inventory-service', { maxJobsToActivate: 10, timeout: 300 })
  inventoryService(job, complete) {
    // tslint:disable-next-line: no-console
    console.log('Inventory-service -> Task variables', job.variables);

    // Task worker business logic
    const payload = 'A';

    const variableUpdate = {
      tracer: 'inventory',
      resultInventory: 'success',
      payload,
    };

    complete.success(variableUpdate);
  }

  // Subscribe to events of type 'payment-service
  @ZeebeWorker('payment-service')
  paymentService(job, complete) {
    // tslint:disable-next-line: no-console
    console.log('Payment-service -> Task variables', job.variables);

    // Task worker business logic
    const payload = job.variables.payload + 'B... ' + job.variables.sessionId;

    const variableUpdate = {
      tracer: 'payment',
      resultPayment: 'success',
      payload,
    };

    complete.success(variableUpdate);

    this.responses.get(job.variables.sessionId).status(HttpStatus.OK).send(`paymentService() =>  ${JSON.stringify(payload)}`);
    this.responses.delete(job.variables.sessionId);
  }
}
