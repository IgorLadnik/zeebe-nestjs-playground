// app.module.ts
import { Module, Inject } from '@nestjs/common';
import { AppController } from './../controllers/app.controller';
import {
  ZeebeModule,
  ZeebeServer,
  ZEEBE_CONNECTION_PROVIDER,
} from '@payk/nestjs-zeebe';
import { ZBClient } from 'zeebe-node';

import { AppService } from './../services/app.service';

@Module({
  imports: [
    ZeebeModule.forRoot({
      gatewayAddress: 'localhost',
      options: { loglevel: 'INFO', longPoll: 30000 },
    }),
  ],
  controllers: [AppController],
  providers: [ZeebeServer, AppService],
})
export class AppModule {
  constructor(@Inject(ZEEBE_CONNECTION_PROVIDER) private readonly zbClient: ZBClient) {
    this.zbClient.deployWorkflow('./bpmn/order-process.bpmn').then(res => {
      console.log('Workflow deployed:');
      console.log(res);
    });
  }
}
