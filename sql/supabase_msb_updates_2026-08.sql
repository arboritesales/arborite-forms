-- ============================================================================
-- Method Statement Builder — data updates (2026-08-20)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Updates ms_equipment_library (Section 5.0 plant & machinery list)
-- and adds a new ms_sop_library entry for the Magni RTH 6.31-VID crane.
-- ============================================================================

-- Renamed machines (same slot, new make/model)
update ms_equipment_library set name = 'Kubota KX027-4' where id = 'eq_kubota';
update ms_equipment_library set name = 'FSI D74 Stump Grinder' where id = 'eq_stumpgrinder';

-- New machines
insert into ms_equipment_library (id, name, sound, vibration) values
  ('eq_volvo_excavator', 'Volvo EC145EL Excavator', '110 dB', '0.5 m/s²'),
  ('eq_vosch_grab', 'Vosch Saw Head Grab Attachment', '120 dB', 'N/A'),
  ('eq_magni_rth', 'Magni RTH 6.31-VID', '120 dB', 'N/A'),
  ('eq_eschlbock_biber', 'Eschlböck Biber 92 Whole Tree Chipper', '110 dB', 'N/A'),
  ('eq_jd_tractor', 'John Deere Tractor', '110 dB', 'N/A')
on conflict (id) do nothing;

-- Verify — should show 14 rows including the two renamed and five new ones
select id, name, sound, vibration from ms_equipment_library order by name;

-- ============================================================================
-- New SOP: Magni RTH 6.31-VID (truck-mounted crane / grapple saw)
-- ============================================================================
insert into ms_sop_library (id, category, heading, description, required_ppe, exclusion_zones) values
  ('sop_magni_crane', 'Machinery & plant', 'Magni RTH 6.31-VID (Truck-Mounted Crane / Grapple Saw)', '["Prior to use, the operator confirms the cutting head is correctly mounted on the carrier vehicle and that a test run of all functions is carried out. A visual leak test of the hydraulic system is also carried out.","The cutting head is only used to process woody material. Loose, broken or hanging limbs are, if practicable, dealt with first. Once cutting has commenced it is finished — partially cut trees are never left.","Taller and thicker trees are processed into short sections to prevent the carrier vehicle tipping. Prior to cutting, the operator estimates the weight of the section to be removed and consults the load ratings/lift plan to confirm it is within the rated capacity of the machine.","Cutting starts with the gripper opened all the way. The cutting head is aligned to the tree before cutting to obtain a straight cut. The gripper is closed, cutting takes place, and once complete the guide bar of the saw retracts into the saw unit.","Once cut, the operator moves the material to the set-down area.","When the machine is not in use, such as during breaks, it is parked on a load-bearing surface with the gripper closed and pressure relieved. The cutting head is lowered to the ground and the machine secured against unintentional start.","Post-works, dirt and foreign bodies are removed from the machine, lubrication is carried out, and any sharp components are covered.","During use, if the operator is unsure of any aspect of the lifting operation, they must immediately stop.","Stop work immediately if any form of malfunction occurs. The operator must be in good health and fit to carry out the required task, and their physical, mental or sensory capacities must not be impaired. The machine is never operated under the influence of drugs or alcohol.","On arrival on site, the operator ensures the correct PPE is worn for the site and liaises with the client or their representative.","The operator inspects the lifting area with the client to confirm its suitability, including for the machine to drive on and for stabiliser deployment. If not satisfied with the condition of the lifting or set-down/processing area, work does not proceed and the operator liaises with the client to address the issues raised.","Communication links and signalling methods between the operator and ground staff are confirmed.","The operator positions the machine.","The site supervisor ensures exclusion zones have been established.","Pre-use checks of the machine and attachments are carried out. The operator checks the load-sensing equipment and display are fully operational, confirming to the site supervisor that the machine is safe to operate.","The machine is set up, deploying stabiliser mats or pads as required.","The operator and site supervisor inspect what is to be cut, looking for insecure or broken material to be dealt with first.","The operator carries out dry runs to confirm the cutting attachment can reach the required height and radius, and that the route of the lift and processing areas are unobstructed.","The operator always operates the machine in accordance with the manufacturer''s guidance.","The cutting head is equipped with a powerful gripper used to ensure safe handling of the tree, with a saw unit — a chainsaw mounted in the lower part of the machine — used as the cutting instrument.","The operator checks that the machine is properly maintained and free from defect before use.","Report any damage or faults immediately."]'::jsonb, '["ppe_hearing"]'::jsonb, '["ez_excavator"]'::jsonb)
on conflict (id) do nothing;

-- Verify
select id, category, heading, jsonb_array_length(description) as point_count from ms_sop_library where id = 'sop_magni_crane';
