// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { NgModule } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { getTestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { GoogleAuthService } from './app/core/services/google-auth.service';

const swUpdateStub = {
  isEnabled: false,
  versionUpdates: EMPTY,
  unrecoverable: EMPTY,
  checkForUpdate: () => Promise.resolve(false),
  activateUpdate: () => Promise.resolve(false),
};

const googleAuthStub = {
  isConfigured: false,
  renderButton: () => Promise.resolve(),
  waitForCredential: () => Promise.resolve(''),
};

@NgModule({
  imports: [
    BrowserDynamicTestingModule,
    HttpClientTestingModule,
    RouterTestingModule,
    TranslateModule.forRoot(),
  ],
  providers: [
    { provide: SwUpdate, useValue: swUpdateStub },
    { provide: GoogleAuthService, useValue: googleAuthStub },
  ],
})
class OneHealthTestingModule {}

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  OneHealthTestingModule,
  platformBrowserDynamicTesting(),
);
