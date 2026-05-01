import type { Order } from '@/types/menu';

const deliveryWhatsappNumber = '97433612194';
const expectedTimeLabel = 'Expected delivery time';

export const getOrderNumber = (orderId?: string | null) => {
  if (!orderId) return 'PENDING';
  return orderId.replace(/-/g, '').slice(-6).toUpperCase();
};

export const isDeliveryOrder = (order: Pick<Order, 'notes'>) =>
  Boolean(order.notes?.toLowerCase().includes('order type: delivery'));

export const getNoteValue = (notes: string | null | undefined, label: string) => {
  if (!notes) return '';
  const line = notes
    .split('\n')
    .find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return line ? line.slice(label.length + 1).trim() : '';
};

const getFreeformNotes = (notes: string | null | undefined) => {
  if (!notes) return '';
  const structuredLabels = [
    'Order type',
    'Delivery address',
    'Google Maps',
    'Contact number',
    'Delivery comment',
    expectedTimeLabel,
  ];

  return notes
    .split('\n')
    .filter((entry) => !structuredLabels.some((label) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`)))
    .join('\n')
    .trim();
};

export const getExpectedDeliveryTime = (notes: string | null | undefined) =>
  getNoteValue(notes, expectedTimeLabel);

export const withExpectedDeliveryTime = (notes: string | null | undefined, expectedTime: string) => {
  const nextExpectedTime = expectedTime.trim();
  const noteLines = notes
    ? notes.split('\n').filter((entry) => !entry.toLowerCase().startsWith(`${expectedTimeLabel.toLowerCase()}:`))
    : [];

  if (nextExpectedTime) {
    noteLines.push(`${expectedTimeLabel}: ${nextExpectedTime}`);
  }

  return noteLines.filter(Boolean).join('\n') || null;
};

export const getOrderStatusUrl = (orderId: string, origin = window.location.origin) =>
  `${origin}/order-status/${orderId}`;

export const getOrderWhatsappMessage = (order: Order, statusUrl?: string) => {
  const orderNumber = getOrderNumber(order.id);
  const address = getNoteValue(order.notes, 'Delivery address');
  const mapsUrl = getNoteValue(order.notes, 'Google Maps');
  const phone = getNoteValue(order.notes, 'Contact number');
  const deliveryComment = getNoteValue(order.notes, 'Delivery comment');
  const expectedTime = getExpectedDeliveryTime(order.notes);
  const freeformNotes = getFreeformNotes(order.notes);
  const items = order.items
    .map((item) => {
      const addOns = item.addOns?.length ? ` (+ ${item.addOns.join(', ')})` : '';
      return `- ${item.quantity}x ${item.name}${addOns} - ${(item.price * item.quantity).toFixed(2)} QAR`;
    })
    .join('\n');

  return [
    `Delivery order #${orderNumber}`,
    order.id ? `Full order ID: ${order.id}` : null,
    `Status: ${order.status === 'new' ? 'received' : order.status}`,
    expectedTime ? `Expected time: ${expectedTime}` : null,
    statusUrl ? `Status link: ${statusUrl}` : null,
    mapsUrl ? `Google Maps: ${mapsUrl}` : null,
    address ? `Address: ${address}` : null,
    phone ? `Contact number: ${phone}` : null,
    deliveryComment ? `Delivery comment: ${deliveryComment}` : null,
    freeformNotes ? `Order notes: ${freeformNotes}` : null,
    '',
    'Items:',
    items,
    `Total: ${order.totalPrice.toFixed(2)} QAR`,
  ].filter((line) => line !== null).join('\n');
};

export const getOrderWhatsappUrl = (order: Order, statusUrl?: string) =>
  `https://wa.me/${deliveryWhatsappNumber}?text=${encodeURIComponent(getOrderWhatsappMessage(order, statusUrl))}`;
