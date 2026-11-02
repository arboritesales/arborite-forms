-- ============================================================================
-- Method Statement Builder — staff competency updates (2026-08-21)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Updates the competency lists for
-- 8 staff (Jon Challinor and Joel Cripps are unchanged, per instruction).
--
-- Two small corrections made against what was typed, both flagged for a
-- second look:
--  - Jack Fisher: "City & Guilds - Level 3 Extended in Forestry &
--    Arboriculture" — kept as "...Extended Diploma in Forestry &
--    Arboriculture" (matches the existing record; "Diploma" looked like a
--    dropped word rather than an intentional removal).
--  - James Hilborn: "Manual Handing" -> "Manual Handling" (typo), and
--    "City & Guilds NPTC Use of Manually Fed Chipper" was listed twice —
--    kept once.
-- ============================================================================

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"CITB - Site Supervisors'' Safety Training Scheme (SSSTS)","expiry":null},
  {"name":"City & Guilds NPTC Cs30 - Chainsaw maintenance and crosscutting","expiry":null},
  {"name":"City & Guilds NPTC 31 - Fell and process small trees","expiry":null},
  {"name":"City & Guilds NPTC 38 - Climb trees and perform aerial rescue","expiry":null},
  {"name":"City & Guilds NPTC 39 - Use of a chainsaw from rope and harness","expiry":null},
  {"name":"City & Guilds NPTC Level 2 use of Remote-controlled mower (flail)","expiry":null},
  {"name":"City & Guilds NPTC Use of Manually Fed Chipper","expiry":null},
  {"name":"BAM CAT and Genny Training","expiry":null},
  {"name":"FAA Level 3 in Emergency First Aid at Work","expiry":null},
  {"name":"FAA Level 3 in Forestry First Aid (RQF)","expiry":null},
  {"name":"NPORS Tracked 1-10 tonnes 360-degree Excavator includes log grab and flail attachments","expiry":null},
  {"name":"ROLO Operative Health, Safety & Environmental Awareness Course","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null}
]'::jsonb where id = 's2'; -- Dave Norris

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"City & Guilds NPTC - Felling and Processing Trees up to 380mm","expiry":null},
  {"name":"City & Guilds NPTC - Tree Climbing and Rescue","expiry":null},
  {"name":"City & Guilds NPTC - Safe Use of Manually Fed Wood-Chipper","expiry":null},
  {"name":"City & Guilds NPTC - Aerial Cutting of Trees with a Chainsaw using Free Fall Techniques","expiry":null},
  {"name":"City & Guilds NPTC - Chainsaw Maintenance and Crosscutting","expiry":null},
  {"name":"City & Guilds - Level 3 Extended Diploma in Forestry & Arboriculture","expiry":null},
  {"name":"City & Guilds - Level 3 Subsidiary Diploma in Forestry & Arboriculture","expiry":null},
  {"name":"FAA - Level 3 Forestry First Aid (RQF)","expiry":null},
  {"name":"FAA - Level 3 Emergency First Aid at Work (RQF)","expiry":null},
  {"name":"NPTC Chainsaw & Land based Machinery","expiry":null},
  {"name":"Certificate of Fitness for Work","expiry":null},
  {"name":"CITB - Site Supervisors'' Safety Training Scheme (SSSTS)","expiry":null},
  {"name":"NPORS - N304 Cable Avoidance Tools Includes CAT & Genny","expiry":null},
  {"name":"City & Guilds - Level 3 Competence in Felling and Processing Medium Trees over 380mm and up to 760mm","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null}
]'::jsonb where id = 's6'; -- Jack Fisher

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"SSSTS - Site Supervision Safety Training Scheme","expiry":null},
  {"name":"LANTRA - Basic Tree Survey and Inspection","expiry":null},
  {"name":"Fit to Work Assessment","expiry":null},
  {"name":"LANTRA - Traffic Management","expiry":null},
  {"name":"City & Guilds NPTC - Chainsaws","expiry":null},
  {"name":"City & Guilds NPTC - Level 3 in the Safe Use of a Chainsaw from a Mobile Elevated Work Platform","expiry":null},
  {"name":"City & Guilds NPTC - Level 2 in the Safe Use of Stump Grinders","expiry":null},
  {"name":"City & Guilds NPTC - Level 2 Tree Climbing and Rescue","expiry":null},
  {"name":"City & Guilds NPTC - Level 2 Felling and processing Trees up to 380mm","expiry":null},
  {"name":"City & Guilds NPTC - Level 3 in Aerial cutting of Trees with a Chainsaw using Free Fall Techniques","expiry":null},
  {"name":"EFA - Emergency First Aid at Work (RQF)","expiry":null},
  {"name":"EFA - Level 3 Award in Forestry First Aid","expiry":null},
  {"name":"Fire Warden Training","expiry":null},
  {"name":"Abbott - Training in the use of Oral Fluid point of Care Test kits & COF303 Oral Fluid Kits","expiry":null},
  {"name":"IPAF - Operator Training in Static Boom & Mobile Boom","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null},
  {"name":"NPORS - N304 Cable Avoidance Tools Includes CAT & Genny","expiry":null},
  {"name":"City & Guilds - Level 3 Competence in Felling and Processing Medium Trees over 380mm and up to 760mm","expiry":null}
]'::jsonb where id = 's7'; -- Jason Hiscock

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"City & Guilds NPTC CS30 - Chainsaw maintenance and crosscutting","expiry":null},
  {"name":"City & Guilds NPTC 31 - Fell and process small trees","expiry":null},
  {"name":"City & Guilds NPTC 38 - Climb trees and perform aerial rescue","expiry":null},
  {"name":"City & Guilds NPTC 39 - Use of a chainsaw from rope and harness","expiry":null},
  {"name":"City & Guilds NPTC Level 2 use of Remote-controlled mower (flail)","expiry":null},
  {"name":"City & Guilds NPTC cs39 - Aerial cutting of trees with a chainsaw using free fall techniques","expiry":null},
  {"name":"NPORS - Excavator 360 Above & Below 10 tonnes","expiry":null},
  {"name":"City & Guilds NPTC Use of Manually Fed Chipper","expiry":null},
  {"name":"FAA Level 3 in Emergency First Aid at Work (RQF)","expiry":null},
  {"name":"FAA Level 3 in Forestry First Aid (RQF)","expiry":null},
  {"name":"CITB - Site Supervisors'' Safety Training Scheme (SSSTS)","expiry":null},
  {"name":"NPORS - N304 Cable Avoidance Tools Includes CAT & Genny","expiry":null},
  {"name":"NPORS - N202TK Excavator 360/Includes Vosch Grapple Saw & Buckets","expiry":null},
  {"name":"Fit for Work Assessment","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null}
]'::jsonb where id = 's4'; -- Liam Couling-Foulkes

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"City & Guilds NPTC Cs30 - Chainsaw maintenance and crosscutting","expiry":null},
  {"name":"City & Guilds NPTC 31 - Fell and process small trees","expiry":null},
  {"name":"City & Guilds NPTC 38 - Climb trees and perform aerial rescue","expiry":null},
  {"name":"City & Guilds NPTC 39 - Use of a chainsaw from rope and harness","expiry":null},
  {"name":"City & Guilds NPTC 41 - Aerial tree rigging","expiry":null},
  {"name":"City & Guilds NPTC Use of Manually Fed Chipper","expiry":null},
  {"name":"City & Guilds NPTC 201 - Safe use of a Mobile Elevated Work Platform","expiry":null},
  {"name":"FAA Level 3 in Emergency First Aid (RQF)","expiry":null},
  {"name":"FAA Level 3 in Forestry First Aid (RQF)","expiry":null},
  {"name":"CITB - Site Supervisors'' Safety Training Scheme (SSSTS)","expiry":null},
  {"name":"NPORS - N304 Cable Avoidance Tools Includes CAT & Genny","expiry":null},
  {"name":"NPORS - N202TK Excavator 360/Includes Vosch Grapple Saw & Buckets","expiry":null},
  {"name":"Fit for Work Assessment","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null}
]'::jsonb where id = 's5'; -- Luke Richardson

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"City & Guilds Level 2 - Principles of Safe Handling and Application of Pesticides","expiry":null},
  {"name":"City & Guilds Level 2 - In the Safe Application of Pesticides using Pedestrian Handheld Equipment","expiry":null},
  {"name":"City & Guilds Level 2 - Competence in Climbing Trees and Aerial Rescue","expiry":null},
  {"name":"LANTRA - Ride-On Mowers","expiry":null},
  {"name":"NPORS - Chainsaw Maintenance & Crosscutting","expiry":null},
  {"name":"NPORS - Woodchipper","expiry":null},
  {"name":"NPORS - Forward Tipping Dumper (Wheeled all sizes excluding mini dumper/skip loader)","expiry":null},
  {"name":"HS&E Test for Operator","expiry":null},
  {"name":"Fit for Work Assessment","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null}
]'::jsonb where id = 's8'; -- Liam Cooper

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"SSSTS - Site Safety Supervisor","expiry":null},
  {"name":"CITB - Site Safety Plus Health & Safety Awareness","expiry":null},
  {"name":"CPCS - Agricultural Tractor","expiry":null},
  {"name":"NPORS - Excavator 360 Above & Below 10t","expiry":null},
  {"name":"NPORS - Wheeled & Tracked Materials Re-handler","expiry":null},
  {"name":"NPORS - Forward Tipping Dumper","expiry":null},
  {"name":"NPORS - Rear Tipping Dumper","expiry":null},
  {"name":"NPORS - Road Roller","expiry":null},
  {"name":"NPORS - Skid Steer","expiry":null},
  {"name":"NPORS - Material Re-Handler 360 Wheeled/Above & Below 10t","expiry":null},
  {"name":"NPORS - Material Re-Handler 360 Tracked/Above & Below 10t","expiry":null},
  {"name":"NPORS - Cable Avoidance Tools Includes CAT & Genny","expiry":null},
  {"name":"NPTC Award in Chainsaw Maintenance and Crosscutting (Cs30)","expiry":null},
  {"name":"NPTC Award in Chainsaw Maintenance and Crosscutting (Cs36)","expiry":null},
  {"name":"CPC Driver Qualification Card","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null},
  {"name":"NPORS CAT and Genny Training","expiry":null},
  {"name":"Fit to Work Assessment","expiry":null},
  {"name":"FAA Level 3 Emergency First Aid at Work (RQF)","expiry":null},
  {"name":"FAA Level 3 Forestry First Aid (RQF)","expiry":null}
]'::jsonb where id = 's9'; -- Joe Grace

update ms_staff set competencies = '[
  {"name":"CSCS - Construction Skills Certification Scheme","expiry":null},
  {"name":"City & Guilds NPTC Use of Manually Fed Chipper","expiry":null},
  {"name":"City & Guilds NPTC Cs30 - Chainsaw maintenance and crosscutting","expiry":null},
  {"name":"City & Guilds NPTC 31 - Fell and process small trees","expiry":null},
  {"name":"City & Guilds NPTC 38 - Climb trees and perform aerial rescue","expiry":null},
  {"name":"Manual Handling","expiry":null},
  {"name":"Asbestos Awareness Training","expiry":null},
  {"name":"FAA Level 3 Emergency First Aid at Work (RQF)","expiry":null},
  {"name":"FAA Level 3 Forestry First Aid (RQF)","expiry":null}
]'::jsonb where id = 's10'; -- James Aston Hilborn

-- Olly Key is new to the method statement builder's staff list (was only in
-- the separate Staff Portal roster before) — added as a Trainee Arborist,
-- not a first aider, per instruction.
insert into ms_staff (id, name, default_role, first_aider, competencies) values (
  's11', 'Olly Key', 'Trainee Arborist', false,
  '[
    {"name":"Ofqual Regulated Qualsafe Level 3 Award in Emergency First Aid","expiry":null},
    {"name":"City & Guilds NPTC Level 2 Competence in Chainsaw Maintenance Cross-Cutting","expiry":null}
  ]'::jsonb
)
on conflict (id) do update set
  name = excluded.name, default_role = excluded.default_role,
  first_aider = excluded.first_aider, competencies = excluded.competencies;

-- Verify
select id, name, jsonb_array_length(competencies) as competency_count
from ms_staff where id in ('s2','s4','s5','s6','s7','s8','s9','s10','s11')
order by id;
