import { expect, test, type Page } from '@playwright/test';

const READY_MS = 60_000;

/** Hermetic smoke: stub PostgREST so CI/sandboxes without DB still get the board shell + empty table. */
async function stubWorkItemSelectEmpty(page: Page) {
  await page.route(
    '**/rest/v1/work_item**',
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: '[]',
      });
    },
  );
}

async function gotoWorkBoardAndWaitForBoardTitle(page: Page) {
  await stubWorkItemSelectEmpty(page);
  await page.goto('/work-board');
  await expect(page.getByRole('navigation', { name: /operations navigation/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: /message work board/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'All work items' })).toBeVisible({
    timeout: READY_MS,
  });
}

test.describe('work board smoke', () => {
  test('loads nav, table, and virtual scroll container', async ({ page }) => {
    await gotoWorkBoardAndWaitForBoardTitle(page);

    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });

    const scroll = page.getByTestId('work-board-scroll');
    await expect(scroll).toBeVisible();

    const overflowY = await scroll.evaluate((el) => getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflowY);

    await expect(scroll.locator('table')).toBeVisible();
  });

  test('tbody shows empty state or at least one data row', async ({ page }) => {
    await gotoWorkBoardAndWaitForBoardTitle(page);

    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });

    const emptyMessage = page.getByText(/no work items yet/i);
    const dataRows = page.locator('tbody tr[data-index]');

    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    } else {
      await expect(dataRows.first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('scroll region can scroll when content overflows', async ({ page }) => {
    await gotoWorkBoardWithManyStubRows(page);
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });

    const scroll = page.getByTestId('work-board-scroll');
    const canScroll = await scroll.evaluate(
      (el) => el.scrollHeight > el.clientHeight + 8,
    );

    if (canScroll) {
      const before = await scroll.evaluate((el) => el.scrollTop);
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const after = await scroll.evaluate((el) => el.scrollTop);
      expect(after).toBeGreaterThan(before);
    } else {
      const overflowY = await scroll.evaluate((el) => getComputedStyle(el).overflowY);
      expect(['auto', 'scroll']).toContain(overflowY);
    }
  });
});

/** One row shape minimal for PostgREST embed omitted (no shipment_ref join in stub). */
function buildStubRows(count: number) {
  const t = new Date().toISOString();
  return Array.from({ length: count }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: `Stub item ${i + 1}`,
    type_code: 'TASK',
    board_state: 'OPEN',
    event_status: 'open',
    owner_name: null,
    hold_reason: null,
    last_message_at: t,
    group_id: 'stub-group',
    shipment_ref_id: null,
    shipment_ref: null,
  }));
}

async function gotoWorkBoardWithManyStubRows(page: Page) {
  const many = buildStubRows(80);
  await page.route(
    '**/rest/v1/work_item**',
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(many),
      });
    },
  );
  await page.goto('/work-board');
  await expect(page.getByRole('navigation', { name: /operations navigation/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'All work items' })).toBeVisible({
    timeout: READY_MS,
  });
}
