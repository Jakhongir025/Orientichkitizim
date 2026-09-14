import test from "node:test";
import assert from "node:assert/strict";
import type {Prisma} from "@prisma/client";
import {dailyOperationsLines} from "../src/modules/car-reports/daily-operations";
test("Closing report keeps work expenses and original rental end after automatic release",async()=>{
 const car={brand:"Toyota",model:"LC",plateNumber:"01 A 001 AA"};const user={profile:{firstName:"Aziz",lastName:"Karimov"}};
 let range:any;
 const tx={carService:{findMany:async()=>[{car,employee:user,serviceType:{name:"Car Wash"},mileage:500,notes:"Yuvildi"}]},dailyTask:{findMany:async()=>[{car,employee:user,description:"Moy almashtirildi",expenseAmount:250000,expenseNotes:"Moy narxi"}]},car:{findMany:async()=>[]},auditLog:{findMany:async(q:any)=>{range=q.where.timestamp;return [{newValue:{...car,status:"RENTED",occupiedUntil:"2026-09-13T15:00:00Z"},user,timestamp:new Date("2026-09-13T05:00:00Z")}]}}} as unknown as Prisma.TransactionClient;
 const text=(await dailyOperationsLines(tx,"2026-09-13")).join("\n");
 assert.match(text,/Aziz Karimov/);assert.match(text,/250000 so‘m/);assert.match(text,/13.09.2026 20:00/);assert.match(text,/Ijaradagi avtomobil yo‘q/);
 assert.equal(range.gte.toISOString(),"2026-09-12T19:00:00.000Z");assert.equal(range.lt.toISOString(),"2026-09-13T19:00:00.000Z");
});
