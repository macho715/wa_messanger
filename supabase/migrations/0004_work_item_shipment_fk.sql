-- Enable PostgREST embed: work_item → shipment_ref (anon read for label display)

alter table public.work_item
  drop constraint if exists work_item_shipment_ref_id_fkey;

alter table public.work_item
  add constraint work_item_shipment_ref_id_fkey
  foreign key (shipment_ref_id) references public.shipment_ref (id)
  on delete set null;
