interface QueueItemLike {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

const named = (prefix: string, name: unknown) => (typeof name === 'string' && name.trim() ? `${prefix}: ${name.trim()}` : prefix);

/** Human-readable description of a queued offline change, for the sync queue drawer. */
export function describeSyncItem(item: QueueItemLike): string {
  const p = item.payload ?? {};
  switch (item.type) {
    case 'addExpense': return named('Add expense', p.expenseData?.title);
    case 'updateExpense': return named('Edit expense', p.expenseData?.title);
    case 'deleteExpense': return 'Delete expense';
    case 'restoreExpense': return 'Restore expense';
    case 'permanentlyDeleteExpense': return 'Permanently delete expense';
    case 'emptyRecycleBin': return 'Empty recycle bin';
    case 'createTrip': return named('Create trip', p.name);
    case 'addMember': return named('Add member', p.name);
    case 'updateMember': return named('Update member', p.name);
    case 'toggleArchiveMember': return named(p.archived ? 'Archive member' : 'Unarchive member', p.name);
    case 'deleteMember': return named('Delete member', p.name);
    case 'createGroup': return named('Create group', p.name);
    case 'updateGroup': return named('Update group', p.name);
    case 'deleteGroup': return 'Delete group';
    case 'addCategory': return named('Add category', p.name);
    case 'deleteCategory': return 'Delete category';
    default: return item.type.replace(/([A-Z])/g, ' $1').toLowerCase();
  }
}
