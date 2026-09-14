import test from "node:test";
import assert from "node:assert/strict";
import {reportAudiences,reportRecipientWhere} from "../src/modules/documents/audience";
test("Report audiences restrict administrator broadcasts and allow director all-users",()=>{
 const admin={id:"a",role:{name:"ADMIN"},profile:{position:"Administrator"}};
 assert.deepEqual(reportAudiences(admin),["SELF","SELF_EMPLOYEES"]);
 assert.deepEqual(reportRecipientWhere(admin,"SELF"),{id:"a"});
 assert.deepEqual(reportRecipientWhere(admin,"SELF_EMPLOYEES"),{OR:[{id:"a"},{role:{name:"EMPLOYEE"}}]});
 assert.throws(()=>reportRecipientWhere(admin,"ALL"),{status:403});
 assert.deepEqual(reportRecipientWhere({...admin,role:{name:"SUPER_ADMIN"}},"ALL"),{});
 assert.deepEqual(reportRecipientWhere({...admin,role:{name:"EMPLOYEE"},profile:{position:"Direktor"}},"ALL"),{});
 assert.throws(()=>reportRecipientWhere({...admin,role:{name:"EMPLOYEE"}},"SELF_EMPLOYEES"),{status:403});
});
