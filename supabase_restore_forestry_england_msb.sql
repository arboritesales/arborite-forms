-- ============================================================================
-- Restore the Forestry England method statement (2026-08-21)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Rebuilds the Forestry England
-- ("Newtown Road, Lyndhurst") method statement from the content Brook sent
-- as a PDF earlier, after the original record was lost. Once run, it will
-- appear in the Method Statement Builder list in the app immediately.
-- ============================================================================

insert into job_forms (quote_ref, updated_at, form_data)
values (
  'MSB-20260821-701',
  now(),
  jsonb_build_object(
    'job', jsonb_build_object(
      'titleOfDocument', 'Appendix 1 -Quality Questions Method Statement',
      'client', 'Forestry England',
      'siteAddress', 'Newtown Road, Lyndhurst, SO43 7GL',
      'what3words', 'Shining.dynasties.couches',
      'workingDays', '',
      'scope', 'The removal of Roadside Trees in decline. Mostly Ash trees and dead wooding of Veteran Oak.',
      'methodology', 'On site assessment and site specific risk assessment

On arrival, Jason Hiscock, Site Supervisor (SSSTS), will walk the site and complete the site-specific assessment before the team sets up.

The assessment will confirm:
a. Tree condition: whether there has been any further deterioration or failure.
b. MEWP access: suitable access route, operating positions and ground bearing conditions.
c. Powerlines: their position relative to the MEWP, trees and work zone.
d. Public access: road, footpath, car park and residential movements.
e. Watercourse: safe stand-off for the MEWP, timber, brash and fuel.
f. Ecology: any evidence or features requiring further consideration before work starts.
g. Ground conditions: suitability for MEWP travel and set-up, including slopes, soft ground, edges and changes in ground level.

Any change that affects the planned method will be recorded and the RAMS amended before work starts.

Ecological checks

The trees will be checked for ecological constraints before work starts, with particular attention to potential bat roost features within the veteran oak and declining ash.

As the work is planned for May, the Forestry England Bat Protocol will be followed. If a potential bat roost feature, evidence of bats or another ecological constraint is identified, work to the affected tree will stop and Forestry England will be contacted before work proceeds.

Emergency and public-access arrangements

Before tree work starts, the team will be briefed on the RAMS and emergency plan in accordance with FISA 802 – Emergency Planning.

The briefing will cover the site location, emergency access, rendezvous point, first aid, Forestry England contacts and emergency lowering/rescue from the MEWP.

Traffic management, barriers and signs will then be installed. The footpath, car park and other approaches to the work zone will be controlled using barriers and signage, with James Hilborn acting as lookout/banksman where required.

Where vehicle or pedestrian access needs to pass through the controlled area, tree work will stop and the area will be made safe before access is permitted.

Nobody will be permitted within the drop zone while cutting is taking place. Where material is being lowered, only those ground staff directly involved in the operation will enter when required and when instructed by the MEWP operator.

Position and set up the MEWP

The Hinowa 2010 MEWP will be tracked/driven to the first agreed operating position under the control of Luke Richardson

Before raising the platform, the operator will check:
a. Ground conditions and machine stability
b. Slopes and changes in ground level.
c. Proximity to the watercourse.
d. Overhead powerlines.
e. Underground services where relevant.
f. Available working height and outreach.
g. Position of the drop/work zone; and
h. Emergency lowering controls.

Where required, suitable spreader pads/mats will be used. The operator will remain attached to the platform using a suitable work-restraint system while working from the MEWP.

The Hinowa 2010 20m tracked MEWP will be operated by Luke Richardson who holds City & Guilds Level 3 in the safe use of Mobile Elevating Work Platforms, along with L3 in the safe use a chainsaw from a MEWP.

The machine will be set up and operated in accordance with the manufacturer''s instructions and current arboricultural MEWP good practice.

Work methodology

Due to the condition of the ash trees, the aerial work will be undertaken from a MEWP rather than by climbing.

Before starting each tree, Jason Hiscock and Luke Richardson will reassess its condition and agree the dismantling sequence.

The operator will progressively reduce the crown in manageable sections from the MEWP. Sections that can safely be allowed to fall will be cut to manageable sizes and dropped into the established drop zone.

Where branches or sections could affect the road, footpath, car park, watercourse, or retained trees, they will be cut into smaller sections or lowered under control.

The stem will then be progressively reduced until the remaining section can be safely felled into the agreed drop zone.

Chainsaw operations will follow FISA chainsaw guidance, aerial tree work and machinery operations shall be conducted in accordance with AA Technical Guide 2 and 5, with the work itself carried out to BS 3998:2010 Tree work – Recommendations.

Work progression

Once each tree is complete, ground staff will process the material and make the immediate area safe.

The MEWP platform will be fully lowered before the machine is repositioned. James Hilborn will control the movement of the machine where visibility or public access requires assistance.

The next MEWP position, drop zone and work zone will then be established before work starts on the next tree. The team will work progressively through the site so that only one active tree-work area is being managed at any one time.

Deadwooding

The veteran oak will be treated as a separate operation.

Luke Richardson and Jason Hiscock will inspect the tree from the ground before the MEWP is positioned. The platform will then be used to access the specified deadwood without unnecessary contact with the retained crown.

The ecological check will be repeated from the MEWP as the crown becomes visible at close quarters. If any previously unidentified potential bat roost feature or evidence of bats is found, work will stop and the supervisor will contact Forestry England.

Only the deadwood identified for removal will be cut. Larger branches will be removed in manageable sections and lowered where they cannot safely be allowed to fall.

The work will be undertaken in accordance with the Forestry England specification and BS 3998:2010, with particular care taken to avoid unnecessary damage to the veteran tree.

Timber, deadwood and the watercourse

Ground staff will only enter the drop zone to process material once cutting has stopped and the MEWP operator confirms that it is safe to do so. Timber and brash will be kept clear of the road, footpath, residential access, car park and watercourse.

No timber, brash, fuel or oil will be allowed to enter the watercourse. Lop and top will be pulled back at least 2 m from the watercourse.

Deadwood and suitable timber will be retained on site in accordance with the Forestry England Deadwood Policy and instructions given by the Contract Manager rather than automatically being chipped and removed.

Fuel and oil will be kept the required distance from the watercourse, and a pollution spill kit will be available on site.

Final inspection and hand back

Once the tree work is complete, Jason Hiscock will carry out a final walkover of the site. This will confirm that the specified work has been completed, the road, residential access, footpath and car park are clear and safe, and that no brash or timber has entered the watercourse.

The supervisor will also check that retained trees have not been unnecessarily damaged, timber and deadwood have been left in the agreed locations, and all equipment and waste have been removed.

Traffic management and barriers will only be removed once the work area is confirmed safe.

Jason Hiscock will then advise the Forestry England Contract Manager that the works are complete and the site is ready for handback.',
      'clientContactName', 'TBC - Forestry England representative',
      'clientContactPhone', 'TBC',
      'clientContactEmail', 'TBC',
      'siteControlImages', '[]'::jsonb,
      'siteControlComments', ''
    ),
    'team', '[
      {"staffId":"s5","roleOverride":"Arborist"},
      {"staffId":"s10","roleOverride":"Arborist"},
      {"staffId":"s3","roleOverride":"Project Manager"},
      {"staffId":"s1","roleOverride":"Managing Director and Arborist"},
      {"staffId":"s7","roleOverride":"Arborist and Site Supervisor"}
    ]'::jsonb,
    'equipment', '[]'::jsonb,
    'selectedSOPs', '[
      "sop_powered_hand_tools","sop_refuelling","sop_chainsaw_ground",
      "sop_dismantling_rigging","sop_chainsaw_from_mewp","sop_hand_fed_chipper","sop_mewp"
    ]'::jsonb,
    'selectedExclusionZones', '["ez_chipping","ez_mewp","ez_refuel"]'::jsonb,
    'ppeAssignments', '{
      "s1": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true,"ppe_harness":true},
      "s3": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true,"ppe_harness":true},
      "s5": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true,"ppe_harness":true},
      "s7": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true,"ppe_harness":true},
      "s10": {"ppe_helmet":true,"ppe_hivis":true,"ppe_boots":true,"ppe_gloves":true,"ppe_eye":true,"ppe_hearing":true,"ppe_chainsaw_gloves":true,"ppe_chainsaw_trousers":true,"ppe_chainsaw_boots":true,"ppe_visor":true,"ppe_harness":true}
    }'::jsonb,
    'emergency', jsonb_build_object(
      'hospitalName', 'Southampton General Hospital',
      'hospitalAddress', 'Tremona Road, Southampton, Hampshire, SO16 6YD',
      'hospitalPhone', '023 8077 7222',
      'routeMap', jsonb_build_object('storagePath', '', 'status', ''),
      'routeDistance', '',
      'routeTime', ''
    ),
    'status', 'sent',
    'sentAt', to_jsonb(now())
  )
)
on conflict (quote_ref) do update set form_data = excluded.form_data, updated_at = excluded.updated_at;

-- Verify — should show the restored record with real content this time
select quote_ref, updated_at, form_data->'job'->>'client' as client, form_data->'job'->>'titleOfDocument' as title
from job_forms where quote_ref = 'MSB-20260821-701';
