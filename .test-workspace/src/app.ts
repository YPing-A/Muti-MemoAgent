import { AuthService } from './auth';
export class App { private auth = new AuthService(); start() { this.auth.initialize(); } handleRequest() { return this.auth.authenticate(); } }