-- ============================================================================
-- Restore the Kilnbridge method statement (2026-09-18)
-- ============================================================================
-- Run this in the Supabase SQL editor. This record (MSB-20260918-487) failed
-- to save because the editor's login session had expired (401), and the
-- browser's own retry never fired since the connection itself was never
-- actually lost. The content below was recovered directly from that
-- browser's localStorage cache (key msb_local_MSB-20260918-487) before it
-- could be lost, and is being restored here independently of that browser
-- session ever working again. Safe to re-run — it always overwrites the same
-- MSB-20260918-487 row with whatever's in this file.
--
-- NOT restored: no site control photos or route map image were present in
-- the cached copy, so none to restore here.
-- ============================================================================

insert into job_forms (quote_ref, updated_at, form_data)
values (
  'MSB-20260918-487',
  now(),
  jsonb_build_object(
    'job', jsonb_build_object(
      'titleOfDocument', 'QU2957 - Kilnbridge Construction Services Limited ',
      'client', 'Kilnbridge Constuction Services Limited ',
      'siteAddress', 'Didcot Power Station, Didcot OX11 7YS ',
      'what3words', '///torch.reward.odds',
      'workingDays', '',
      'scope', '<div>Tree Clearance&nbsp;</div><div>Using the following reference:-</div><div>- RPS Consulting UK</div><div>Tile CONSTRAINTS PLAN Project LHR108 Sheet No SK09008&nbsp;</div><div>Tile LHR108 WATER INFRASTRUCTURE&nbsp; C-01144&nbsp;</div><div><br></div><div>-Mechanically dismantle to ground level all tree&nbsp; marked for removal on the above plans.</div><div><span style="font-family: inherit;">- Forward to roadside ready for chipping.</span></div><div><span style="font-family: inherit;">- Whole tree chip and remove from site in bulk haulage vehicles.</span></div><div>&nbsp;<span style="font-family: inherit;">- Leave site clean and tidy with a machine mulched finish.&nbsp;</span></div><div><span style="font-family: inherit;">- To supply PID security for the duration of the works.&nbsp;</span></div><div><span style="font-family: inherit;"><br></span></div><div><br></div>',
      'methodology', '',
      'methodologyPoints', jsonb_build_array(
        'When operators arrive for the first time on site, a site induction will have been booked in with the client. This induction will be site specific, and an operative cannot start work until this has been completed.',
        'A pre commencement meeting shall take place between all operators prior to works starting to be briefed on the method statement and ensure everyone understands the agreed systems of work.',
        'All machinery and equipment shall be subject to pre use checks by competent operators to confirm their suitability for use.',
        'Checklists on plant prior to commencing works shall be completed.',
        'Works will be undertaken within a site signed and guarded on all reasonably foreseeable approaches, using banks person deployed to manage third party access.',
        'Assisted Felling of all trees using excavator and grapple saw and motor manual felling.',
        'Stacking of arisings on clean ground ready for chipping',
        'Whole tree chip all arisings and remove from site in bulk haulage vehicles.',
        'Rake over site  leaving a brown field site ready for development',
        'Site to be left clean and tidy.',
        'Hand site back to client'
      ),
      'permitsIssuedBy', jsonb_build_object('highways', 'N/A', 'breakingGround', 'N/A'),
      'clientContactName', 'Joe Grace ',
      'clientContactPhone', '07960609971',
      'clientContactEmail', 'joe@arborite.co.uk',
      'siteControlImages', '[]'::jsonb,
      'siteControlComments', 'All staff&nbsp; must sign / out in at the gate hut every morning and do a brief induction if they haven''t been on site before . Red box in above map&nbsp;<div><br></div><div>Site access is vial the blue arrows on the above.&nbsp;</div><div><br></div><div>Work site is the other red box.&nbsp;</div><div><br></div><div>There are underground services on site NO breaking ground on site by Arborite teams&nbsp;</div><div><br></div><div>There will be a brief induction at 7am on site on the first morning&nbsp;</div>',
      'signOffDate', '2026-09-18'
    ),
    'team', '[
      {"staffId":"s9","roleOverride":"Machine Operator and Site Supervisor"},
      {"staffId":"s1","roleOverride":"Managing Director and Arborist"},
      {"staffId":"s3","roleOverride":"Arborist and Site Supervisor"},
      {"staffId":"s2","roleOverride":"Arborist and Site Supervisor"},
      {"staffId":"s5","roleOverride":"Arborist and Site Supervisor"}
    ]'::jsonb,
    'equipment', '[
      {"id":"eq_chainsaws","name":"Chainsaws","sound":"110 dB","vibration":"3.5 m/s²"},
      {"id":"eq_greenclimber","name":"Greenclimber LV800","sound":"110 dB","vibration":"N/A"},
      {"id":"eq_volvo_excavator","name":"Volvo EC145EL Excavator","sound":"110 dB","vibration":"0.5 m/s²"},
      {"id":"eq_vosch_grab","name":"Vosch Saw Head Grab Attachment","sound":"120 dB","vibration":"N/A"},
      {"id":"eq_eschlbock_biber","name":"Eschlböck Biber 92 Whole Tree Chipper","sound":"110 dB","vibration":"N/A"}
    ]'::jsonb,
    'selectedSOPs', '[
      "sop_refuelling","sop_chainsaw_ground","sop_crane_fed_chipper",
      "sop_remote_flail","sop_tree_shear_grapple","sop_forwarder_timber_loading"
    ]'::jsonb,
    'selectedExclusionZones', '[
      "ez_felling","ez_branch","ez_crosscut","ez_chipping","ez_excavator","ez_refuel","ez_flail"
    ]'::jsonb,
    'ppeAssignments', '{
      "s1": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":false,"ppe_hearing":false,"ppe_chainsaw_gloves":false,"ppe_chainsaw_trousers":false,"ppe_chainsaw_boots":false,"ppe_visor":false},
      "s2": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true},
      "s3": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":false,"ppe_hearing":false,"ppe_chainsaw_gloves":false,"ppe_chainsaw_trousers":false,"ppe_chainsaw_boots":false,"ppe_visor":false},
      "s5": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true},
      "s9": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true}
    }'::jsonb,
    'emergency', jsonb_build_object(
      'hospitalName', 'John Radcliffe Hospital ',
      'hospitalAddress', 'Headley Way, Headington, Oxford, Oxfordshire, OX3 9DU ',
      'hospitalPhone', '0300 304 7777 ',
      'routeMap', jsonb_build_object('storagePath', '', 'status', ''),
      'routeDistance', '15.3 miles ',
      'routeTime', '36 mins '
    ),
    'status', 'sent',
    'sentAt', to_jsonb('2026-09-18T13:42:50.770Z'::text)
  )
)
on conflict (quote_ref) do update set form_data = excluded.form_data, updated_at = excluded.updated_at;

-- Verify — should show the restored record with real content this time
select quote_ref, updated_at, form_data->'job'->>'client' as client, form_data->'job'->>'titleOfDocument' as title
from job_forms where quote_ref = 'MSB-20260918-487';
