import test from "node:test";
import assert from "node:assert/strict";
import { fleetStatusPdf } from "../src/modules/cars/status-pdf";
test("fleet PDF generates an empty report and a multipage fleet with Unicode text", async () => {
  for (const count of [0, 40]) {
    const pdf = await fleetStatusPdf(
      Array.from({ length: count }, (_, i) => ({
        brand: "Mercedes-Benz",
        model: "GLS 450",
        plateNumber: `01 A ${i} AA`,
        status: "CAR_WASH",
        occupiedUntil: null,
      })),
      "Asia/Tashkent",
      "",
    );
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const pages = pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length || 0;
    assert.ok(count === 0 ? pages === 1 : pages > 1);
  }
});
