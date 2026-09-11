import test from "node:test";
import assert from "node:assert/strict";
import { limitedText } from "../src/lib/request-body";
import { sanitizeCarImage } from "../src/modules/media/image";
test("request size is bounded even without or with forged content-length", async () => {
  for (const headers of [{}, { "content-length": "1" }]) {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(40000));
        c.enqueue(new Uint8Array(40000));
        c.close();
      },
    });
    const request = new Request("http://localhost", {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    } as RequestInit);
    await assert.rejects(limitedText(request), { status: 413 });
  }
});
test("invalid UTF-8 and disguised image payloads are rejected", async () => {
  await assert.rejects(
    limitedText(
      new Request("http://localhost", {
        method: "POST",
        body: new Uint8Array([255, 254]),
      }),
    ),
    { status: 400 },
  );
  await assert.rejects(
    sanitizeCarImage(
      `data:image/jpeg;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`,
    ),
    { status: 400 },
  );
});
