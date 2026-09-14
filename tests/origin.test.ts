import test from "node:test";
import assert from "node:assert/strict";
import { checkOrigin } from "../src/modules/auth/service";
test("development permits local browser plus configured tunnel; production remains strict",()=>{
 const env=process.env as Record<string,string|undefined>;const old=env.NODE_ENV,app=env.APP_URL;
 const request=(origin?:string)=>new Request("http://localhost:3000/api/employees/x",{method:"PATCH",headers:origin?{origin}:{}});
 try{
  env.APP_URL="https://specific.trycloudflare.com";env.NODE_ENV="development";
  for(const origin of ["http://localhost:3000","http://127.0.0.1:3000",env.APP_URL])assert.doesNotThrow(()=>checkOrigin(request(origin)));
  for(const origin of [undefined,"null","https://other.trycloudflare.com","http://localhost:3001","http://localhost:3000.attacker.test"])assert.throws(()=>checkOrigin(request(origin)),{status:403});
  env.NODE_ENV="production";assert.doesNotThrow(()=>checkOrigin(request(env.APP_URL)));
  assert.throws(()=>checkOrigin(request("http://localhost:3000")),{status:403});
 }finally{if(old===undefined)delete env.NODE_ENV;else env.NODE_ENV=old;if(app===undefined)delete env.APP_URL;else env.APP_URL=app}
});
