import { Module } from '@nestjs/common';

import { LicensesController } from './licenses.controller';
import { LicensingService } from './licensing.service';

@Module({
  controllers: [LicensesController],
  providers: [LicensingService],
  exports: [LicensingService],
})
export class LicensingModule {}
