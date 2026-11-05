'use client';
import { useActionState, useEffect, useState } from 'react';
import { upsertVisaRule } from './actions';

export interface RuleView {
  code: string;
  name: string;
  feeUsd: number;
  maxStayDays: number;
  sourceUrl: string;
  verifiedOn: string;
  verifiedLabel: string;
  stale: boolean;
}

export function VisaRuleRow({ rule, canEdit }: { rule: RuleView; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(upsertVisaRule, { error: null, ok: false });

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);

  return (
    <tr className={rule.stale ? 'stale' : undefined}>
      <td><strong>{rule.name}</strong></td>
      <td className="mono">{rule.code}</td>
      {editing ? (
        <td colSpan={5}>
          <form action={action} className="inline-form">
            <input type="hidden" name="countryIso2" value={rule.code} />
            <label>Fee (US$)<input id={`fee-${rule.code}`} name="feeUsd" type="number" min="0" step="1" defaultValue={rule.feeUsd} required /></label>
            <label>Max stay (days)<input id={`stay-${rule.code}`} name="maxStayDays" type="number" min="1" step="1" defaultValue={rule.maxStayDays} required /></label>
            <label>Source link<input id={`src-${rule.code}`} name="sourceUrl" type="url" defaultValue={rule.sourceUrl} required /></label>
            <button className="btn" disabled={pending}>Save</button>
            <button type="button" className="btn secondary" onClick={() => setEditing(false)}>Cancel</button>
            {state.error ? <p className="error" role="alert">{state.error}</p> : null}
          </form>
        </td>
      ) : (
        <>
          <td className="num">{rule.feeUsd === 0 ? 'Free' : `US$${rule.feeUsd}`}</td>
          <td className="num">{rule.maxStayDays} days</td>
          <td className="num" title={rule.stale ? 'Checked more than 90 days ago' : undefined}>{rule.verifiedLabel}</td>
          <td><a href={rule.sourceUrl} target="_blank" rel="noreferrer">Source</a></td>
          <td>{canEdit ? <button type="button" className="btn secondary" onClick={() => setEditing(true)}>Edit</button> : null}</td>
        </>
      )}
    </tr>
  );
}

export function AddRuleForm() {
  const [state, action, pending] = useActionState(upsertVisaRule, { error: null, ok: false });
  return (
    <form action={action} className="card inline-form" key={state.ok ? 'saved' : 'new'}>
      <label>Country code<input id="new-code" name="countryIso2" placeholder="DE" maxLength={2} required /></label>
      <label>Fee (US$)<input id="new-fee" name="feeUsd" type="number" min="0" step="1" placeholder="0 = free" required /></label>
      <label>Max stay (days)<input id="new-stay" name="maxStayDays" type="number" min="1" step="1" defaultValue={30} required /></label>
      <label>Source link<input id="new-src" name="sourceUrl" type="url" defaultValue="https://www.eta.gov.lk/" required /></label>
      <button className="btn" disabled={pending}>Add country</button>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    </form>
  );
}
