-- Tourists may only attach their own kinds of document, and only files stored under that request's folder.
-- Approvals and permits (eta_approval, permit) can only come from staff.

drop policy documents_insert on public.request_documents;

create policy documents_insert on public.request_documents for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id
        and storage_path like r.profile_id::text || '/' || r.id::text || '/%'
        and (
          public.is_staff()
          or (r.profile_id = auth.uid() and kind not in ('eta_approval', 'permit'))
        )
    )
  );
