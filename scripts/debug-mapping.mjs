import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });

  page.on("pageerror", (error) => {
    console.log(`[pageerror] ${error?.message || error}`);
    if (error?.stack) {
      console.log(error.stack);
    }
  });

  console.log("Navigating to app...");
  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(1000);

  // Select first client (fallback to first button in list)
  try {
    await page
      .getByRole("button", { name: /John Smith/i })
      .first()
      .click({ timeout: 5000 });
  } catch {
    const buttons = page.getByRole("button", { name: /Client/i });
    if (await buttons.count()) {
      await buttons.first().click();
    } else {
      throw new Error("Could not find any client button to select.");
    }
  }
  console.log("Client selected.");

  await page.getByRole("tab", { name: /Plan Writer/i }).click();
  console.log("Plan tab opened.");

  await page
    .getByText(/4 February 2025 Soa Template/i, { exact: false })
    .first()
    .click();
  console.log("Template selected.");

  const generateBtn = page
    .getByRole("button", { name: /Generate Document/i })
    .first();
  await generateBtn.waitFor({ state: "visible", timeout: 10000 });
  await generateBtn.click();
  console.log("Generate button clicked.");

  const dialog = page.getByRole("dialog", { name: /Map Template Variables/i });
  await dialog.waitFor({ state: "visible", timeout: 20000 });
  console.log("Mapping dialog opened.");

  const mappedCells = dialog.getByText("(click to set)", { exact: true });
  await mappedCells.first().click();
  console.log("Editing first placeholder...");

  const comboBox = dialog.getByRole("combobox").first();
  await comboBox.click();
  await page.getByRole("option", { name: /Advisor Name/i }).first().click();
  console.log("Mapped placeholder to Advisor Name.");

  // Generate document with current mappings
  const dialogGenerateBtn = dialog.getByRole("button", { name: "Generate Document" });
  await dialogGenerateBtn.click();
  console.log("Submitted mapping dialog.");

  await dialog.waitFor({ state: "hidden", timeout: 30000 });
  await page.getByRole("button", { name: /Download Generated Document/i }).waitFor({ timeout: 60000 });
  console.log("Document generated and download button available.");

  await browser.close();
}

run().catch((err) => {
  console.error("Debug script failed:", err);
  process.exit(1);
});

