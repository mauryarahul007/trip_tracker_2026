import { describe, it, expect } from 'vitest';
import { getNotificationDisplay } from './NotificationsPanel';
import type { AppNotification } from '../types';

describe('getNotificationDisplay', () => {
  it('formats expense_deleted notifications cleanly without redundant "was deleted" suffix', () => {
    const notif: AppNotification = {
      id: 'n-1',
      tripId: 'trip-1',
      title: 'Expense Deleted • Himachal 2',
      body: '"This is a really really long expense title to test text truncation and wrapping behavior in the UI" was deleted',
      data: {
        type: 'expense_deleted',
        tripName: 'Himachal 2',
      },
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = getNotificationDisplay(notif, 'Himachal 2');
    expect(result.headline).toBe('Expense Deleted');
    expect(result.badge).toBe('Himachal 2');
    expect(result.body).toBe(
      'This is a really really long expense title to test text truncation and wrapping behavior in the UI'
    );
  });

  it('formats expense_deleted with structured data including amount and currency', () => {
    const notif: AppNotification = {
      id: 'n-2',
      tripId: 'trip-1',
      title: 'Expense Deleted • Himachal 2',
      body: '"Hotel Stay" was deleted',
      data: {
        type: 'expense_deleted',
        tripName: 'Himachal 2',
        expenseTitle: 'Hotel Stay',
        amount: '4500',
        currency: 'INR',
      },
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = getNotificationDisplay(notif, 'Himachal 2');
    expect(result.headline).toBe('Expense Deleted');
    expect(result.badge).toBe('Himachal 2');
    expect(result.body).toBe('Hotel Stay — INR 4500.00');
  });

  it('formats expense_added without trailing "added" suffix', () => {
    const notif: AppNotification = {
      id: 'n-3',
      tripId: 'trip-1',
      title: 'Expense Added • Himachal 2',
      body: 'Airport Taxi — INR 8000.00 added',
      data: {
        type: 'expense_added',
        tripName: 'Himachal 2',
      },
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = getNotificationDisplay(notif, 'Himachal 2');
    expect(result.headline).toBe('Expense Added');
    expect(result.badge).toBe('Himachal 2');
    expect(result.body).toBe('Airport Taxi — INR 8000.00');
  });

  it('formats expense_updated without trailing "was updated" suffix', () => {
    const notif: AppNotification = {
      id: 'n-4',
      tripId: 'trip-1',
      title: 'Expense Updated • Himachal 2',
      body: '"Dinner at Cafe" was updated',
      data: {
        type: 'expense_updated',
        tripName: 'Himachal 2',
      },
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = getNotificationDisplay(notif, 'Himachal 2');
    expect(result.headline).toBe('Expense Updated');
    expect(result.badge).toBe('Himachal 2');
    expect(result.body).toBe('Dinner at Cafe');
  });

  it('formats trip_deleted notifications cleanly', () => {
    const notif: AppNotification = {
      id: 'n-5',
      tripId: null,
      title: 'Trip Deleted',
      body: '"Sikkim Bagpacking" was deleted',
      data: {
        type: 'trip_deleted',
        tripName: 'Sikkim Bagpacking',
      },
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = getNotificationDisplay(notif, 'Sikkim Bagpacking');
    expect(result.headline).toBe('Trip Deleted');
    expect(result.badge).toBe('Sikkim Bagpacking');
    expect(result.body).toBe('"Sikkim Bagpacking" was deleted');
  });

  it('handles historical settlement reminders correctly', () => {
    const notif: AppNotification = {
      id: 'n-6',
      tripId: 'trip-1',
      title: 'Settlement reminder',
      body: 'You owe Suyog Gadhave ₹9819.00 for this trip',
      data: {
        type: 'settlement_reminder',
        tripName: 'Himachal 2',
      },
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = getNotificationDisplay(notif, 'Himachal 2');
    expect(result.headline).toBe('Settlement Reminder');
    expect(result.badge).toBe('Himachal 2');
    expect(result.body).toBe('You owe Suyog Gadhave ₹9819.00 for this trip');
  });
});
