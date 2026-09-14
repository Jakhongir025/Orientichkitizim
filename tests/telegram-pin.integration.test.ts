import test from "node:test";
import assert from "node:assert/strict";
import {createHmac,randomUUID} from "node:crypto";
import bcrypt from "bcryptjs";
import {db} from "../src/lib/db";
import {telegramLogin,telegramPinStatus} from "../src/modules/telegram/auth";
import {hashToken} from "../src/lib/crypto";
test("PIN enrollment, identity binding, replay prevention, password reset and attempt limit",{skip:process.env.RUN_INTEGRATION!=="1"},async()=>{
 const old=process.env.TELEGRAM_BOT_TOKEN;process.env.TELEGRAM_BOT_TOKEN="pin-test-token";
 const tg=String(Math.floor(Date.now()/10));const role=await db.role.findFirstOrThrow({where:{name:"EMPLOYEE"}});const office=await db.office.findFirstOrThrow();
 const user=await db.user.create({data:{login:`pin-${randomUUID()}`,passwordHash:await bcrypt.hash("Test-password-123",4),roleId:role.id,profile:{create:{firstName:"Pin",lastName:"Test",phone:"test",position:"Test",officeId:office.id,telegramUserId:tg}}}});
 const launches:string[]=[];
 function launch(id=tg){const p=new URLSearchParams({user:JSON.stringify({id:Number(id)}),auth_date:String(Math.floor(Date.now()/1000)),query_id:randomUUID()});const key=createHmac("sha256","WebAppData").update("pin-test-token").digest();p.set("hash",createHmac("sha256",key).update([...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n")).digest("hex"));launches.push(p.toString());return p.toString()}
 try{
 assert.equal((await telegramPinStatus(launch())).hasPin,false);
 await telegramLogin(launch(),{login:user.login,password:"Test-password-123",newPin:"1234"});
 const record=await db.miniAppPin.findUniqueOrThrow({where:{userId:user.id}});assert.notEqual(record.pinHash,"1234");assert.equal(await bcrypt.compare("1234",record.pinHash),true);
 assert.equal((await telegramPinStatus(launch())).hasPin,true);
 await assert.rejects(telegramLogin(launch(),{pin:"0000"}),{status:401});
 const signed=launch();assert.match((await telegramLogin(signed,{pin:"1234"})).token,/^mini_/);
 await assert.rejects(telegramLogin(signed,{pin:"1234"}),{status:401});
 await assert.rejects(telegramLogin(launch(String(Number(tg)+1)),{pin:"1234"}),{status:401});
 await db.user.update({where:{id:user.id},data:{passwordHash:await bcrypt.hash("Changed-password",4)}});
 assert.equal((await telegramPinStatus(launch())).hasPin,false);
 await assert.rejects(telegramLogin(launch(),{pin:"1234"}),{status:401});
 await assert.rejects(telegramLogin(launch(),{pin:"1234"}),{status:429});
 }finally{await db.auditLog.deleteMany({where:{userId:user.id}});await db.session.deleteMany({where:{userId:user.id}});await db.employeeProfile.deleteMany({where:{userId:user.id}});await db.user.delete({where:{id:user.id}});await db.loginAttempt.deleteMany({where:{key:{in:launches.map(x=>hashToken(`telegram-launch:${x}`))}}});if(old===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=old;await db.$disconnect()}
});
