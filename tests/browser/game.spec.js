const { test, expect } = require("@playwright/test");

test("river scenery moves during travel and freezes on pause", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Start patrol" }).click();
  const bankPixels = () =>
    page.locator("#game").evaluate((canvas) => {
      const pixels = canvas.getContext("2d").getImageData(8, 200, 24, 100).data;
      return Array.from(pixels).join(",");
    });
  const initial = await bankPixels();
  await page.clock.runFor(1500);
  expect(await bankPixels()).not.toBe(initial);
  await expect(page.locator("#distance")).not.toHaveText("0 m DOWNRIVER");
  await page.keyboard.press("p");
  const paused = await bankPixels();
  const distance = await page.locator("#distance").textContent();
  await page.clock.runFor(1000);
  expect(await bankPixels()).toBe(paused);
  await expect(page.locator("#distance")).toHaveText(distance);
});

test("visible board, start, pause, resume, and tab safety", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const board = await page.locator("#game").boundingBox();
  expect(board.height).toBeGreaterThan(200);
  const arcade = await page.locator(".arcade").boundingBox();
  expect(Math.abs(board.width - arcade.width)).toBeLessThan(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/screenshots/${info.project.name}-ready.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start patrol" }).click();
  await expect(page.locator("#overlay")).toBeHidden();
  await page.keyboard.press("p");
  await expect(
    page.getByRole("heading", { name: "On a river break." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume patrol" }).click();
  await expect(page.locator("#overlay")).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(
    page.getByRole("heading", { name: "On a river break." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("real shots score and personal best survives reload", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Math.random = () => 0.6;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start patrol" }).click();
  await page.keyboard.down("Space");
  await expect(page.locator("#score")).not.toHaveText("00000", {
    timeout: 16000,
  });
  await page.keyboard.up("Space");
  await page.screenshot({
    path: `artifacts/screenshots/${info.project.name}-playing.png`,
    fullPage: true,
  });
  expect(
    await page.locator("#game").evaluate((canvas) => {
      const data = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data;
      return data[3] === 255 && data[data.length - 1] === 255;
    }),
  ).toBe(true);
  const best = await page.locator("#best").textContent();
  // Full-page captures can temporarily resize the viewport; play must survive.
  await page.keyboard.down("Space");
  await expect(page.locator("#score")).not.toHaveText(best, { timeout: 5000 });
  await page.keyboard.up("Space");
  // Freeze in-flight shots before taking the persistence snapshot.
  await page.keyboard.press("p");
  const savedBest = await page.locator("#best").textContent();
  await page.reload();
  await expect(page.locator("#best")).toHaveText(savedBest);
  await page.selectOption("#difficulty", "hard");
  await expect(page.locator("#best")).toHaveText("00000");
});

test("touch controls release on cancellation and game over can restart", async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith("mobile"), "Touch layout only");
  test.setTimeout(60000);
  await page.addInitScript(() => {
    Math.random = () => 0.6;
  });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Start patrol" }).tap();
  const fire = await page.locator("#fire").boundingBox();
  await page.mouse.move(fire.x + fire.width / 2, fire.y + fire.height / 2);
  await page.mouse.down();
  await page.clock.runFor(250);
  await page
    .locator("#fire")
    .dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch" });
  await page.clock.runFor(23000);
  await page.mouse.up();
  await expect(
    page.getByRole("heading", { name: "Patrol complete." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).tap();
  await expect(page.locator("#score")).toHaveText("00000");
  await expect(page.locator("#lives")).toHaveAttribute(
    "aria-label",
    "4 lives remaining",
  );
  await expect(page.locator("#overlay")).toBeHidden();
});

test("storage denial is nonfatal and keyboard can activate the start button", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto("/");
  await page.locator("#start").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#overlay")).toBeHidden();
  await page.keyboard.press("p");
  await page.keyboard.down("p");
  await page.keyboard.down("p");
  await page.keyboard.up("p");
  await expect(page.locator("#overlay")).toBeHidden();
});
