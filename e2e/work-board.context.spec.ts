import { expect, test } from '@playwright/test';

const rowId = '11111111-1111-4111-8111-111111111111';
const sourceMessageId = 'verify-source-msg';

test('clicking a row shows live context in the detail panel', async ({ page }) => {
  await page.route('**/rest/v1/work_item**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify([
        {
          id: rowId,
          title: 'Gate pass pending',
          type_code: 'DOC_CUSTOMS',
          board_state: 'HOLD',
          event_status: 'WAITING_DOC',
          owner_name: 'Jay',
          hold_reason: 'WAIT_DOC',
          last_message_at: '2026-04-01T00:00:00.000Z',
          group_id: 'ops-verify@g.us',
          source_message_id: sourceMessageId,
          shipment_ref_id: null,
          meta: {
            summary: 'Gate pass pending',
            source_event: 'message.any',
            linkage_status: 'UNRESOLVED',
            keywords_hit: ['BOE', 'pending'],
            shipment_key_candidates: ['HVDC-VERIFY-001'],
          },
          shipment_ref: null,
        },
      ]),
    });
  });

  await page.route(`**/api/work-items/${rowId}/context`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        ok: true,
        context: {
          workItem: {
            id: rowId,
            groupId: 'ops-verify@g.us',
            sourceMessageId,
            replyToMessageId: null,
            title: 'Gate pass pending',
            boardState: 'HOLD',
            eventStatus: 'WAITING_DOC',
            ownerName: 'Jay',
            holdReason: 'WAIT_DOC',
            lastMessageAt: '2026-04-01T00:00:00.000Z',
            shipmentRefId: null,
            meta: {},
          },
          evidence: {
            messages: [
              {
                messageId: sourceMessageId,
                matches: ['source'],
                fromJid: 'tester@c.us',
                replyToMessageId: null,
                bodyRaw: 'HVDC-VERIFY-001 BOE pending at customs owner: Jay',
                bodyNorm: 'hvdc-verify-001 boe pending at customs owner: jay',
                sentAt: '2026-04-01T00:00:00.000Z',
              },
            ],
            missingMessageIds: [],
          },
        },
      }),
    });
  });

  const contextRequest = page.waitForRequest(
    (request) => request.url().endsWith(`/api/work-items/${rowId}/context`),
  );

  await page.goto('/work-board');

  await expect(page.getByRole('heading', { level: 2, name: 'All work items' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();

  const row = page.locator(`tbody tr[data-index]`).first();
  await expect(row).toBeVisible();
  await row.click();
  const request = await contextRequest;
  expect(request.url()).toContain(`/api/work-items/${rowId}/context`);

  const detailPanel = page.getByRole('complementary').first();
  await expect(detailPanel.getByText('Live source-message context')).toBeVisible();
  await expect(detailPanel.getByText(`/api/work-items/${rowId}/context`)).toBeVisible();
  await expect(detailPanel.getByText('workItem.sourceMessageId')).toBeVisible();
  await expect(detailPanel.getByText(sourceMessageId, { exact: true }).first()).toBeVisible();
  await expect(detailPanel.getByText('workItem.holdReason')).toBeVisible();
  await expect(detailPanel.getByText('WAIT_DOC', { exact: true }).last()).toBeVisible();
});
