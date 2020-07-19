// app.controller.ts
import { Guid } from 'guid-typescript';
import { Request, Response } from 'express';
import { Controller, Inject, Get, Post, Req, Res, Body, HttpStatus, UsePipes, UseInterceptors } from '@nestjs/common';
import { ZBClient } from 'zeebe-node';
import { CreateWorkflowInstanceResponse } from 'zeebe-node/interfaces';
import { ZEEBE_CONNECTION_PROVIDER, ZeebeWorker, ZeebeServer } from '@payk/nestjs-zeebe';
import { AppService } from './../services/app.service';
// import { tsIndexSignature } from '@babel/types';

@Controller()
export class AppController {
  responses = new Map<string, Response>();

  constructor(
    @Inject(ZEEBE_CONNECTION_PROVIDER) private readonly zbClient: ZBClient,
    private readonly zeebeServer: ZeebeServer,
    private readonly appService: AppService,
  ) {}

  sendResultToClient(sessionId: string, payload: any) {
    const response = this.responses.get(sessionId);
    if (response) {
      response.status(HttpStatus.OK).send(`Workflow result -> ${JSON.stringify(payload)}`);
      this.responses.delete(sessionId);
    }
  }

  // Use the client to create a new workflow instance
  @Get()
  async getHello(@Req() req: Request, @Res() res: Response): Promise<CreateWorkflowInstanceResponse> {
    const sessionId = `${Guid.create()}`;
    const wfi = await this.zbClient.createWorkflowInstance('order-process', {
      sessionId,
      tracer: 'init',
    });

    console.log(`getHello() ${JSON.stringify(wfi)}`);

    // res.status(HttpStatus.OK).send(`getHello() ${JSON.stringify(wfi)}`);

    this.responses.set(sessionId, res);
    return wfi;
  }

  // Subscribe to events of type 'task-1' and
  //   create a worker with the options as passed below (zeebe-node ZBWorkerOptions)
  @ZeebeWorker('task-1', { maxJobsToActivate: 10, timeout: 300 })
  task1(job, complete) {
    console.log('task-1 -> Task variables', job.variables);

    // Task worker business logic
    const payload = '1';

    const variableUpdate = {
      tracer: 'task-1',
      result: 'success',
      payload,
    };

    complete.success(variableUpdate);
  }

  // Subscribe to events of type 'task-2'
  @ZeebeWorker('task-2')
  task2(job, complete) {
    console.log('task-2 -> Task variables', job.variables);

    // Task worker business logic
    const payload = job.variables.payload + '2';

    const variableUpdate = {
      tracer: 'task-2',
      result: 'success',
      payload,
      nextTask: 3,
    };

    complete.success(variableUpdate);
  }

  // Subscribe to events of type 'task-3'
  @ZeebeWorker('task-3')
  task3(job, complete) {
    console.log('task-3 -> Task variables', job.variables);

    // Task worker business logic
    const payload = job.variables.payload + '.3... ' + job.variables.sessionId;

    const variableUpdate = {
      tracer: 'task-3',
      result: 'success',
      payload,
    };

    complete.success(variableUpdate);

    this.sendResultToClient(job.variables.sessionId, payload);
  }

  // Subscribe to events of type 'task-4'
  @ZeebeWorker('task-4')
  task4(job, complete) {
    console.log('task-4 -> Task variables', job.variables);

    // Task worker business logic
    const payload = job.variables.payload + '.4... ' + job.variables.sessionId;

    const variableUpdate = {
      tracer: 'task-4',
      result: 'success',
      payload,
    };

    complete.success(variableUpdate);

    this.sendResultToClient(job.variables.sessionId, payload);
  }
}
