import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Http, Headers } from '@angular/http';
import { BehaviorSubject } from 'rxjs/Rx';

import { ConfigurationService } from './configuration.service';
import { Error } from './api.service';

export interface Authenticated {
  state: boolean;
  error?: string
}

export interface LoginToken {
  token: string;
}

@Injectable()
export class AuthenticationService {

  public isAuthenticated: BehaviorSubject<Authenticated> = new BehaviorSubject({ state: false });

  constructor(
    private config: ConfigurationService,
    private http: Http,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      let token = localStorage.getItem('auth');
      let lastLogin = localStorage.getItem('auth_time');
      // token expires after 12 hours
      const expire = 12 * 60 * 60 * 1000;
      if (!lastLogin || (Date.now() - Date.parse(lastLogin) > expire)) {
        localStorage.removeItem('auth');
        token = null;
      }
      if (token) {
        this.isAuthenticated.next({ state: true });
      }
    }
  }

  getUserInfo() {
    if (isPlatformBrowser(this.platformId)) {
      let token = localStorage.getItem('auth');
      if (token) {
        let tokenParts = token.split('.');
        return JSON.parse(atob(tokenParts[1]));
      } else {
        return null;
      }
    }
  }

  login(login: string, password: string) {
    if (isPlatformBrowser(this.platformId)) {
      let headers = this.getHeaders();
      let body = JSON.stringify({
        login: login,
        password: password
      });
      this.http.post(
        this.config.get('BACKEND_URL') + '/@login', body, { headers: headers })
        .subscribe(
        res => {
          const data: LoginToken = res.json();
          if (data.token) {
            localStorage.setItem('auth', data.token);
            localStorage.setItem('auth_time', (new Date()).toISOString());
            this.isAuthenticated.next({ state: true });
          } else {
            localStorage.removeItem('auth');
            localStorage.removeItem('auth_time');
            this.isAuthenticated.next({ state: false });
          }
        },
        err => {
          localStorage.removeItem('auth');
          localStorage.removeItem('auth_time');
          this.isAuthenticated.next({ state: false, error: ((<Error>err.json()).message) });
        }
      );
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth');
      localStorage.removeItem('auth_time');
      this.isAuthenticated.next({ state: false });
    }
  }

  getHeaders(): Headers {
    let headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    if (isPlatformBrowser(this.platformId)) {
      let auth = localStorage.getItem('auth');
      if (auth) {
        headers.append('Authorization', 'Bearer ' + auth);
      }
    }
    return headers;
  }
}
