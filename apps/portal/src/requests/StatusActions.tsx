'use client';
import { nextStatuses, type RequestStatus, type RequestType } from '@tourist/core';
import { useActionState, useState } from 'react';
import { strings } from '@/strings';
import { changeStatus } from './actions';

const NOTE_REQUIRED: RequestStatus[] = ['needs_info', 'rejected'];

export function StatusActions({ requestId, status, type }: { requestId: string; status: RequestStatus; type: RequestType }) {
  const [state, formAction, pending] = useActionState(changeStatus, { error: null });
  const [note, setNote] = useState('');
  const moves = nextStatuses(status, 'staff');

  if (moves.length === 0) return <p className="muted">This request is closed.</p>;

  const attachLabel = type === 'eta_application' ? 'Attach the ETA approval (optional)' : 'Attach the permit (optional)';

  return (
    <form action={formAction} className="actions" onSubmit={() => setTimeout(() => setNote(''), 0)}>
      <input type="hidden" name="requestId" value={requestId} />
      <label>
        Note to the tourist
        <textarea id="note" name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown to the tourist in the app" />
      </label>
      {moves.includes('completed') ? (
        <label>
          {attachLabel}
          <input id="attachment" type="file" name="attachment" accept="image/*,application/pdf" />
        </label>
      ) : null}
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <div className="row">
        {moves.map((to) => (
          <button
            key={to}
            name="toStatus"
            value={to}
            className={`btn ${to === 'rejected' ? 'danger' : to === 'completed' || to === 'in_review' ? '' : 'secondary'}`}
            disabled={pending || (NOTE_REQUIRED.includes(to) && !note.trim())}
          >
            {strings.action[to]}
          </button>
        ))}
      </div>
    </form>
  );
}
