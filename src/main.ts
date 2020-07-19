/* tslint:disable:radix */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ZeebeServer } from '@payk/nestjs-zeebe';

function getPort(): number {
  const args = process.argv;
  return args.length > 2 ? parseInt(args[2]) : 15000;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const microservice = app.connectMicroservice({
    strategy: app.get(ZeebeServer),
  });

  await app.startAllMicroservicesAsync();

  const port = getPort();
  await app.listen(port);

  setTimeout(() => console.log(`\nNow browse http://localhost:${port} to start a workflow.\n`), 500);
}
bootstrap();
