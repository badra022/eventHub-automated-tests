async (page) => {
  const out = {};
  const count = async (name, locator) => { out[name] = await locator.count(); };
  const text = async (name, locator) => { out[name] = (await locator.textContent())?.trim(); };
  const valueOf = (label) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');

  await page.goto('https://eventhub.rahulshettyacademy.com/events/285');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Confirm Booking' }) });
  const dec = form.getByRole('button', { name: '−', exact: true });
  const inc = form.getByRole('button', { name: '+', exact: true });
  const qty = dec.locator('xpath=following-sibling::*[1]');
  await form.getByRole('button', { name: 'Confirm Booking' }).waitFor();
  await count('form', form);
  await text('qtyStart', qty);
  out.decDisabledAt1 = await dec.isDisabled();
  await inc.click();
  await text('qtyAfterPlus', qty);
  await dec.click();
  await text('maxLabel', form.getByText(/\(max \d+\)/));
  await text('title', page.getByRole('heading', { level: 1 }));
  await text('price', valueOf('Price per ticket'));
  await text('availableSeats', valueOf('Available'));

  const name = form.locator('#customerName');
  const email = form.getByTestId('customer-email');
  const phone = form.locator('#phone');
  await name.fill('A');
  await email.fill('validator@example.com');
  await phone.fill('123');
  await form.getByRole('button', { name: 'Confirm Booking' }).click();
  await text('nameError', name.locator('xpath=following-sibling::*[1]'));
  await text('phoneError', phone.locator('xpath=following-sibling::*[1]'));

  await name.fill('Selector Check');
  await phone.fill('9876543210');
  await form.getByRole('button', { name: 'Confirm Booking' }).click();
  await page.getByRole('heading', { name: /Booking Confirmed/i }).waitFor();
  await text('ref', valueOf('Booking Ref'));
  await text('customer', valueOf('Customer'));
  await text('tickets', valueOf('Tickets'));
  await text('total', valueOf('Total'));
  await count('browseMoreButton', page.getByRole('button', { name: 'Browse More Events' }));
  await page.getByRole('button', { name: 'View My Bookings' }).click();

  await page.getByRole('heading', { name: 'My Bookings', level: 1 }).waitFor();
  const card = page.getByTestId('booking-card').filter({ hasText: out.ref });
  await count('card', card);
  await text('cardTitle', card.getByRole('heading'));
  await text('cardTickets', card.getByText(/\d+ tickets?/));
  await text('cardTotal', card.getByText(/^\$[\d,.]+$/));
  await text('cardStatus', card.getByText(/^(confirmed|cancelled)$/));
  await count('navEvents', page.getByTestId('nav-events'));
  await count('logout', page.getByTestId('logout-btn'));

  const dialog = page.getByRole('dialog');
  await card.getByTestId('cancel-booking-btn').click();
  await text('dialogTitle', dialog.getByRole('heading'));
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await count('cardAfterDismiss', card);
  await card.getByTestId('cancel-booking-btn').click();
  await page.getByTestId('confirm-dialog-yes').click();
  await page.getByText('Booking cancelled successfully').waitFor();
  out.cancelledMessage = true;
  await card.waitFor({ state: 'detached' });
  await count('cardAfterCancel', card);
  await count('emptyState', page.getByRole('heading', { name: 'No bookings yet' }));
  return out;
}
