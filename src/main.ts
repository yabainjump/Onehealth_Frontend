import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

void platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((error: unknown) => Promise.reject(error));
