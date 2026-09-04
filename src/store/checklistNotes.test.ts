import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { useTripStore } from './tripStore';
import type { Trip } from '../types';

describe('tripStore checklist and notes actions', () => {
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store: Record<string, string> = {};
      globalThis.localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        length: 0,
        key: () => null,
      } as any;
    }
  });

  const dummyTrip: Trip = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Sikkim Backpacking',
    destination: 'Gangtok, Sikkim',
    startDate: '2026-09-10',
    endDate: '2026-09-20',
    baseCurrency: 'INR',
    memberIds: [],
    groupIds: [],
    ownerId: 'user-1',
    joinCode: 'SIK123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    checklist: [],
    notes: [],
  };

  beforeEach(() => {
    useTripStore.setState({
      trips: [{ ...dummyTrip }],
    });
  });

  it('adds a checklist item to the trip', async () => {
    const { addChecklistItem } = useTripStore.getState();
    await addChecklistItem('11111111-1111-4111-8111-111111111111', {
      text: 'Passport and Government ID',
      completed: false,
      category: 'documents',
      assignedTo: 'Rahul',
    });

    const trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.checklist).toBeDefined();
    expect(trip?.checklist?.length).toBe(1);
    expect(trip?.checklist?.[0].text).toBe('Passport and Government ID');
    expect(trip?.checklist?.[0].category).toBe('documents');
    expect(trip?.checklist?.[0].assignedTo).toBe('Rahul');
    expect(trip?.checklist?.[0].completed).toBe(false);
  });

  it('toggles a checklist item completed state and manages completedAt', async () => {
    const { addChecklistItem, toggleChecklistItem } = useTripStore.getState();
    await addChecklistItem('11111111-1111-4111-8111-111111111111', {
      text: 'Raincoat',
      completed: false,
      category: 'packing',
    });

    let trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    const itemId = trip!.checklist![0].id;

    // Toggle to completed
    await toggleChecklistItem('11111111-1111-4111-8111-111111111111', itemId);
    trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.checklist?.[0].completed).toBe(true);
    expect(trip?.checklist?.[0].completedAt).toBeDefined();

    // Toggle back to incomplete
    await toggleChecklistItem('11111111-1111-4111-8111-111111111111', itemId);
    trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.checklist?.[0].completed).toBe(false);
    expect(trip?.checklist?.[0].completedAt).toBeUndefined();
  });

  it('updates a checklist item', async () => {
    const { addChecklistItem, updateChecklistItem } = useTripStore.getState();
    await addChecklistItem('11111111-1111-4111-8111-111111111111', {
      text: 'Original Text',
      completed: false,
      category: 'general',
    });

    const trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    const itemId = trip!.checklist![0].id;

    await updateChecklistItem('11111111-1111-4111-8111-111111111111', itemId, {
      text: 'Updated Text',
      category: 'medical',
    });

    const updatedTrip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(updatedTrip?.checklist?.[0].text).toBe('Updated Text');
    expect(updatedTrip?.checklist?.[0].category).toBe('medical');
  });

  it('deletes a checklist item', async () => {
    const { addChecklistItem, deleteChecklistItem } = useTripStore.getState();
    await addChecklistItem('11111111-1111-4111-8111-111111111111', {
      text: 'Item to delete',
      completed: false,
      category: 'general',
    });

    let trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.checklist?.length).toBe(1);
    const itemId = trip!.checklist![0].id;

    await deleteChecklistItem('11111111-1111-4111-8111-111111111111', itemId);
    trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.checklist?.length).toBe(0);
  });

  it('adds, updates, and deletes travel notes', async () => {
    const { addTripNote, updateTripNote, deleteTripNote } = useTripStore.getState();

    // 1. Add Note
    await addTripNote('11111111-1111-4111-8111-111111111111', {
      title: 'Homestay Wi-Fi',
      content: 'SSID: MountainStay\nPass: Everest@2026',
      category: 'wifi',
      isPinned: true,
    });

    let trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.notes?.length).toBe(1);
    expect(trip?.notes?.[0].title).toBe('Homestay Wi-Fi');
    expect(trip?.notes?.[0].category).toBe('wifi');
    expect(trip?.notes?.[0].isPinned).toBe(true);
    const noteId = trip!.notes![0].id;

    // 2. Update Note
    await updateTripNote('11111111-1111-4111-8111-111111111111', noteId, {
      title: 'Homestay Wi-Fi & Gate Code',
      content: 'SSID: MountainStay\nPass: Everest@2026\nGate: 4321',
      isPinned: false,
    });

    trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.notes?.[0].title).toBe('Homestay Wi-Fi & Gate Code');
    expect(trip?.notes?.[0].isPinned).toBe(false);
    expect(trip?.notes?.[0].content).toContain('Gate: 4321');

    // 3. Delete Note
    await deleteTripNote('11111111-1111-4111-8111-111111111111', noteId);
    trip = useTripStore.getState().trips.find((t) => t.id === '11111111-1111-4111-8111-111111111111');
    expect(trip?.notes?.length).toBe(0);
  });
});
