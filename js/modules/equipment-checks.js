// ── EQUIPMENT CHECKS (generic engine for stump grinder, woodchippers, diggers, green climber, hand held tools, etc.) ──
var CHECK_CATEGORIES = {
  stump: {
    label: 'Stump Grinder', icon: '🪵', table: 'stump_grinder_checks',
    machineLabel: 'Serial / Reference / Model / Reg No',
    machines: ['FSI D74'],
    fields: [
      {key:'used_since_last', label:'Has the machine been used since its last inspection?', options:['Yes','No']},
      {key:'teeth_condition', label:'In what condition are the teeth?', options:['Good','Fair','Poor']},
      {key:'greased', label:'Has the machine been greased in accordance with manufacturers instructions?', options:['Yes','No']},
      {key:'guards', label:'Are all the machine guards in place?', options:['Yes','No']},
      {key:'fasteners', label:'Are all retaining nuts, bolts and fasteners present and secure?', options:['Yes','No']},
      {key:'no_stress', label:'Is the "no stress" system operable?', options:['Yes','No']},
      {key:'engine_oil', label:'Is the engine oil level correct?', options:['Yes','No']},
      {key:'engine_coolant', label:'Is the engine coolant level correct?', options:['Yes','No']},
      {key:'hydraulic_oil', label:'Is the hydraulic oil level correct?', options:['Yes','No']},
      {key:'drive_belts', label:'Are the drive belts in visually good condition, do not appear obviously loose and are free from defects?', options:['Yes','No']},
      {key:'radiator_screen', label:'Is the radiator screen clear of debris and free from defects?', options:['Yes','No']},
      {key:'fuel', label:'Is there enough fuel in the machine for the intended tasks?', options:['Yes','No']},
      {key:'handbook', label:'Is the handbook / operators manual present?', options:['Yes','No']},
      {key:'tyres', label:'Where fitted, are the machine’s tyre pressures correct, tread depth legal and tyre condition free from defect?', options:['Yes','No','N/A']},
      {key:'tracks', label:'Where fitted, are tracks free from defect and correctly tensioned?', options:['Yes','No','N/A']},
      {key:'decals', label:'Are all warning decals present and clearly visible?', options:['Yes','No']}
    ]
  },
  chipper: {
    label: 'Woodchippers', icon: '🪚', table: 'woodchipper_checks',
    machineLabel: 'Serial / Reference / Model / Reg No',
    machines: ['Forst - ST6P', 'Forst - TR8 (Old)', 'Forst - TR8 (New)'],
    hasMileage: true, mileageLabel: 'Mileage or Hours (if applicable)',
    fields: [
      {key:'used_since_last', label:'Has this item of equipment been used since its last inspection?', options:['Yes','No']},
      {key:'blades', label:'In what condition are the blades?', options:['Good','Fair','Poor']},
      {key:'greased', label:'Has the machine been greased in accordance with manufacturers instructions?', options:['Yes','No']},
      {key:'feed_springs', label:'Are the feed roller springs clear of debris?', options:['Yes','No']},
      {key:'guards', label:'Are all the machine guards in place?', options:['Yes','No']},
      {key:'fasteners', label:'Are all retaining nuts, bolts and fasteners present and secure?', options:['Yes','No']},
      {key:'no_stress', label:'Is the "no stress" system operable?', options:['Yes','No']},
      {key:'feed_reset', label:'Does any feed roller reset function operate correctly?', options:['Yes','No']},
      {key:'engine_oil', label:'Is the engine oil level correct?', options:['Yes','No']},
      {key:'engine_coolant', label:'Is the engine coolant level correct?', options:['Yes','No','N/A']},
      {key:'hydraulic_oil', label:'Is the hydraulic oil level correct?', options:['Yes','No']},
      {key:'drive_belts', label:'Are the drive belts in visually good condition, do not appear obviously loose and are free from defects?', options:['Yes','No']},
      {key:'radiator_screen', label:'Is the radiator screen clear of debris and free from defects?', options:['Yes','No']},
      {key:'fuel', label:'Is there enough fuel in the machine for the intended tasks?', options:['Yes','No']},
      {key:'tyres', label:'Where fitted, are the machine’s tyre pressures correct, tread depth legal and tyre condition free from defect?', options:['Yes','No','N/A']},
      {key:'tracks', label:'Where fitted, are tracks free from defect and correctly tensioned?', options:['Yes','No','N/A']},
      {key:'tow_lights', label:'(If a tow behind machine) Are all lights, plugs and cables correctly fitted, fastened and functioning?', options:['Yes','No','N/A']},
      {key:'handbrake', label:'Does the handbrake function correctly?', options:['Yes','No','N/A']},
      {key:'breakaway', label:'Is the breakaway cable correctly fitted, and the jockey wheel functions?', options:['Yes','No','N/A']},
      {key:'decals', label:'Are all warning decals present and clearly visible?', options:['Yes','No']}
    ]
  },
  digger: {
    label: 'Diggers', icon: '🚜', table: 'digger_checks',
    machineLabel: 'Serial / Reference / Model / Reg No',
    machines: ['KX027-4', 'Volvo ECR145E'],
    hasMileage: true, mileageLabel: 'Hours of the Machine',
    fields: [
      {key:'used_since_last', label:'Has the machine been used since its last inspection?', options:['Yes','No']},
      {key:'shear_vosch', label:'In what condition is the Shear / Vosch in?', options:['Good','Fair','Poor','Not using on site']},
      {key:'rotator_grab', label:'In what condition is the Rotator Grab in?', options:['Good','Fair','Poor','Not using on site']},
      {key:'flail_teeth', label:'In what condition are the teeth on the flail head?', options:['Good','Fair','Poor','Not using on site']},
      {key:'greased', label:'Has the machine been greased in accordance with manufacturers instructions?', options:['Yes','No']},
      {key:'guards', label:'Are all the machine guards in place?', options:['Yes','No']},
      {key:'walkaround', label:'Walk around inspection — look for visible damage, loose nuts/screws and leaks; check for accumulated dirt near hot components (engine/DPF/muffler/exhaust/manifold/tubes) and remove as necessary; check for accumulated residues from operation.', options:['Yes','No'], stack:true},
      {key:'engine_oil', label:'Is the engine oil level correct?', options:['Yes','No']},
      {key:'engine_coolant', label:'Is the engine coolant level correct?', options:['Yes','No']},
      {key:'hydraulic_oil', label:'Is the hydraulic oil level correct?', options:['Yes','No']},
      {key:'hydraulic_leaks', label:'Have you checked for leaks or damages to hydraulic systems?', options:['Yes','No']},
      {key:'dust_valve', label:'Has the dust valve cartridge been cleaned out?', options:['Yes','No']},
      {key:'radiator_screen', label:'Is the radiator screen clear of debris and free from defects?', options:['Yes','No']},
      {key:'fuel', label:'Is there enough fuel in the machine for the intended tasks?', options:['Yes','No']},
      {key:'radiator_oil_cooler', label:'Is the radiator and oil cooler clean?', options:['Yes','No']},
      {key:'controls', label:'Are the controls all working including lights?', options:['Yes','No']},
      {key:'tracks', label:'Where fitted, are tracks free from defect and correctly tensioned?', options:['Yes','No','N/A']},
      {key:'decals', label:'Are all warning decals present and clearly visible?', options:['Yes','No']}
    ]
  },
  climber: {
    label: 'Green Climber', icon: '🌳', table: 'green_climber_checks',
    machineLabel: 'Serial / Reference / Model / Reg No',
    machines: ['MDB LV 800 Green Climber'],
    fields: [
      {key:'used_since_last', label:'Has the machine been used since its last inspection?', options:['Yes','No']},
      {key:'mulching_teeth', label:'In what condition are the teeth on the mulching head?', options:['Good','Fair','Poor']},
      {key:'flail_teeth', label:'In what condition are the teeth on the flail head?', options:['Good','Fair','Poor']},
      {key:'greased', label:'Has the machine been greased in accordance with manufacturers instructions?', options:['Yes','No']},
      {key:'guards', label:'Are all the machine guards in place?', options:['Yes','No']},
      {key:'fasteners', label:'Are all retaining nuts, bolts and fasteners present and secure?', options:['Yes','No']},
      {key:'engine_oil', label:'Is the engine oil level correct?', options:['Yes','No']},
      {key:'engine_coolant', label:'Is the engine coolant level correct?', options:['Yes','No']},
      {key:'hydraulic_oil', label:'Is the hydraulic oil level correct?', options:['Yes','No']},
      {key:'hydraulic_leaks', label:'Have you checked for leaks or damages to hydraulic systems?', options:['Yes','No']},
      {key:'air_filter', label:'Has the dry air filter cartridge been cleaned out?', options:['Yes','No']},
      {key:'radiator_screen', label:'Is the radiator screen clear of debris and free from defects?', options:['Yes','No']},
      {key:'fuel', label:'Is there enough fuel in the machine for the intended tasks?', options:['Yes','No']},
      {key:'controller_clean', label:'Is the controller clean and free of debris?', options:['Yes','No']},
      {key:'controls', label:'Are the controls all working including lights?', options:['Yes','No']},
      {key:'stop_buttons', label:'Are all stop buttons and isolators working correctly on machine and controller?', options:['Yes','No']},
      {key:'tracks', label:'Where fitted, are tracks free from defect and correctly tensioned?', options:['Yes','No','N/A']},
      {key:'decals', label:'Are all warning decals present and clearly visible?', options:['Yes','No']}
    ]
  },
  handheld: {
    label: 'Hand Held Tools', icon: '🔧', table: 'handheld_tool_checks',
    machineLabel: 'Serial / Reference / Model / Reg No',
    machines: ['Hedgetrimmer', 'Brushcutter', 'Blower'],
    fields: [
      {key:'used_since_last', label:'Has this machine been used since its last inspection?', options:['Yes','No']},
      {key:'guards', label:'Are all the machine guards in place?', options:['Yes','No']},
      {key:'fasteners', label:'Are all retaining nuts, bolts and fasteners present and secure?', options:['Yes','No']},
      {key:'av_system', label:'AV system condition and/or function?', options:['Good','Fair','Poor']},
      {key:'exhaust', label:'Exhaust system condition and function?', options:['Good','Fair','Poor']},
      {key:'harness_point', label:'Harness attachment point secure?', options:['Yes','No','N/A']},
      {key:'warning_stickers', label:'Warning stickers present?', options:['Yes','No']},
      {key:'filler_caps', label:'No leaks from filler caps?', options:['Yes','No']},
      {key:'air_filter', label:'Air filter clean and undamaged?', options:['Yes','No']},
      {key:'cooling_ports', label:'Air cooling ports clear of debris?', options:['Yes','No']},
      {key:'starter_cord', label:'Starter cord and housing inspected and condition noted?', options:['Good','Fair','Poor']},
      {key:'throttle_interlock', label:'Throttle interlock and/or blade lock functions?', options:['Yes','No','Could not test at point of inspection']},
      {key:'onoff_switch', label:'Clearly marked on/off system which is operable?', options:['Yes','No']},
      {key:'blade_condition', label:'Overall blade condition?', options:['Good','Fair','Poor','N/A']},
      {key:'grease_levels', label:'Grease levels?', options:['Correct','Too Low','Topped Up','N/A']}
    ]
  },
  trailer: {
    label: 'Trailers', icon: '🚛', table: 'trailer_checks',
    machineLabel: 'Serial / Reference / Model / Reg No',
    machines: ['Brian James trailer', 'Ifor Williams Trailer', 'Ifor Williams 3.5t trailer', 'Ifor Williams Cage trailer', 'Ifor Williams GH27', 'Ifor Williams GH94', 'Towmate Trailer'],
    fields: [
      {key:'used_since_last', label:'Has this item of equipment been used since its last inspection?', options:['Yes','No']},
      {key:'tyres', label:'Tyre pressure and condition', options:['Good','Fair','Poor']},
      {key:'wheel_bearings', label:'Play in wheel bearings?', options:['Yes','No']},
      {key:'handbrake', label:'Handbrake operation?', options:['Functions correctly','Requires maintenance']},
      {key:'breakaway', label:'Snatch cable/breakaway?', options:['Intact and present','Damaged or missing']},
      {key:'jockey_wheel', label:'Jockey wheel condition/function?', options:['Functions correctly','Damaged and requires maintenance']},
      {key:'numberplate_light', label:'Number plate position and light?', options:['Correct numberplate and light works','Requires attention']},
      {key:'lights', label:'Lights in working order?', options:['Fully functioning and clean','Working but require maintenance','Not working']},
      {key:'towing_socket', label:'Towing socket or ring function?', options:['Intact and functioning','Damaged or requires attention']},
      {key:'general_condition', label:'General condition of sides and frame?', options:['Good','Fair','Poor']}
    ]
  },
  mewp: {
    label: 'MEWP', icon: '🏗️', table: 'mewp_checks',
    machineLabel: 'Select Machine',
    machines: ['Hinowa MEWP'],
    fields: [
      {key:'used_since_last', label:'Has the Machine been used since its last inspection?', options:['Yes','No']},
      {key:'thorough_exam', label:'Current thorough examination record (dated within six months)?', options:['Yes','No']},
      {key:'fasteners', label:'Are all retaining nuts, bolts and fasteners present and visually secure?', options:['Yes','No']},
      {key:'handbook', label:'Is the handbook/operators manual present?', options:['Yes','No']},
      {key:'tracks', label:'Where fitted, are tracks free from defect and correctly tensioned?', options:['Yes','No','N/A']},
      {key:'fluid_levels', label:'Fluid levels — engine oil, coolant level, hydraulic level?', options:['Yes','No']},
      {key:'battery', label:'Battery — electrolyte, security?', options:['Yes','No']},
      {key:'hydraulic_leaks', label:'Hydraulic leaks, pipe connections, rams, cylinders?', options:['Yes','No']},
      {key:'hoses_cables', label:'Hoses and cables security and condition?', options:['Yes','No']},
      {key:'cable_trays', label:'Power track cable trays?', options:['Yes','No']},
      {key:'outriggers', label:'Outriggers/stabilisers — general condition, misalignment, corrosion?', options:['Yes','No']},
      {key:'pins_chains', label:'Pins, retainers and chains?', options:['Yes','No']},
      {key:'platform_cage', label:'Platform/cage — steps for access/egress, secure, undamaged, clear?', options:['Yes','No']},
      {key:'entrance_gate_1', label:'Entrance gate, guard rail and retaining pins?', options:['Yes','No']},
      {key:'harness_anchor', label:'Harness anchor point?', options:['Yes','No']},
      {key:'entrance_gate_2', label:'Entrance gate, guard rail and retaining pins? (basket)', options:['Yes','No']},
      {key:'cage_clear', label:'Cage clear of rubbish, debris and obstructions?', options:['Yes','No']},
      {key:'id_plate_decals', label:'ID plate, safety, warning and information decals legible?', options:['Yes','No']},
      {key:'control_decals', label:'Controls — identification decals, directional arrows?', options:['Yes','No']},
      {key:'platform_loads', label:'Platform loads indicated — SWL and max wind speed?', options:['Yes','No']},
      {key:'platform_controls', label:'Function check of platform controls completed?', options:['Yes','No']},
      {key:'ground_controls', label:'Function check of ground controls completed?', options:['Yes','No']}
    ]
  },
  // Rigging Kit — sub-tabs reached from the Rigging Kit tile (group: 'riggingkit').
  // Each kit's items are checked individually below — no machine picker.
  rigging: {
    label: 'Large Rigging Kit', shortLabel: 'Large Rigging Kit', icon: '⛩️', table: 'rigging_kit_checks',
    group: 'riggingkit', hideMachine: true, machines: ['Large Rigging Kit'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'notch_harness_gv0162021', label:'Notch Harness - GV0162021', options:['Good','Fair','Poor']},
      {key:'art_ropeguide_032101484', label:'ART Ropeguide - 03.2101484', options:['Good','Fair','Poor']},
      {key:'isc_fig8_descender_211341770101', label:'ISC UK Figure 8 descender - 211341770101', options:['Good','Fair','Poor']},
      {key:'petzl_zigzag_2530649719968', label:'Petzl Zigzag - 2530649719968', options:['Good','Fair','Poor']},
      {key:'petzl_ok_krab_18g0147431547', label:'Petzl OK 3-Way Alu Krab - 18G0147431547', options:['Good','Fair','Poor']},
      {key:'petzl_ok_krab_21f0335559864', label:'Petzl OK 3-Way Alu Krab - 21F0335559864', options:['Good','Fair','Poor']},
      {key:'petzl_ok_krab_21f0335559821', label:'Petzl OK 3-Way Alu Krab - 21F0335559821', options:['Good','Fair','Poor']},
      {key:'dmm_ultra_o_krab_190022004e', label:'DMM Ultra O 3-Way Alu Krab - 190022004E', options:['Good','Fair','Poor']},
      {key:'isc_oval_krab_241887580022', label:'ISC UK Oval 3-way Alu Krab - 241887580022', options:['Good','Fair','Poor']},
      {key:'isc_oval_krab_241884990014', label:'ISC UK Oval 3-way Alu Krab - 241884990014', options:['Good','Fair','Poor']},
      {key:'notch_tool_lanyard_00457', label:'Notch Tool Lanyard - 00457', options:['Good','Fair','Poor']},
      {key:'bumblebee_flipline_rbl9blcoitn0747cw478', label:'Bumblebee Wire Core Flipline - RBL9BLCOITN0747CW478', options:['Good','Fair','Poor']}
    ]
  },
  riggingjason: {
    label: 'Small Rigging Kit – Jason and Team', shortLabel: 'Small Rigging Kit', subLabel: 'Jason and Team', icon: '⛩️', table: 'rigging_kit_jason_team_checks',
    group: 'riggingkit', hideMachine: true, machines: ['Small Rigging Kit – Jason and Team'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'courant_aka_rigging_line_rg20170', label:'Courant AKA Rigging Line - SN:RG20170', options:['Good','Fair','Poor']},
      {key:'courant_dead_eye_rg20166', label:'Courant Dead Eye - SN:RG20166', options:['Good','Fair','Poor']},
      {key:'teufelberger_trex_whoopie_rg20167', label:'Teufelberger T-REX Whoopie Sling - SN:RG20167', options:['Good','Fair','Poor']},
      {key:'steel_carabiner_263900361', label:'Steel Carabiner - SN:263900361', options:['Good','Fair','Poor']},
      {key:'steel_carabiner_263900381', label:'Steel Carabiner - SN:263900381', options:['Good','Fair','Poor']},
      {key:'stein_ld1250_friction_2601062', label:'Stein LD1250 Floating Friction Device - SN:26-01-062', options:['Good','Fair','Poor']},
      {key:'isc_pulley_rp056_262110980010', label:'ISC Pulley RP056 - SN:262110980010', options:['Good','Fair','Poor']}
    ]
  },
  riggingjack: {
    label: 'Small Rigging Kit – Jack and Team', shortLabel: 'Small Rigging Kit', subLabel: 'Jack and Team', icon: '⛩️', table: 'rigging_kit_jack_team_checks',
    group: 'riggingkit', hideMachine: true, machines: ['Small Rigging Kit – Jack and Team'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'courant_aka_rigging_line_rg20170', label:'Courant AKA Rigging Line - SN:RG20170', options:['Good','Fair','Poor']},
      {key:'courant_dead_eye_rg20166', label:'Courant Dead Eye - SN:RG20166', options:['Good','Fair','Poor']},
      {key:'teufelberger_trex_whoopie_rg20167', label:'Teufelberger T-REX Whoopie Sling - SN:RG20167', options:['Good','Fair','Poor']},
      {key:'steel_carabiner_263900361', label:'Steel Carabiner - SN:263900361', options:['Good','Fair','Poor']},
      {key:'steel_carabiner_263900381', label:'Steel Carabiner - SN:263900381', options:['Good','Fair','Poor']},
      {key:'stein_ld1250_friction_2601062', label:'Stein LD1250 Floating Friction Device - SN:26-01-062', options:['Good','Fair','Poor']},
      {key:'isc_pulley_rp056_262110980010', label:'ISC Pulley RP056 - SN:262110980010', options:['Good','Fair','Poor']}
    ]
  },
  // Climbing Kit — one sub-tab per climber, reached from the Climbing Kit tile
  // (group: 'climbingkit'). To add a climber, add another entry with the same
  // group plus its table (see supabase_climbing_kit_checks_2026-10-13.sql).
  climbjack: {
    label: 'Jack Fisher – Climbing Kit', shortLabel: 'Jack Fisher', icon: '🧗', table: 'climbing_kit_jack_fisher_checks',
    group: 'climbingkit', hideMachine: true, machines: ['Jack Fisher – Climbing Kit'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'notch_harness_gv0162021', label:'Notch Harness - GV0162021', options:['Good','Fair','Poor']},
      {key:'art_ropeguide_032101484', label:'ART Ropeguide - 03.2101484', options:['Good','Fair','Poor']},
      {key:'isc_fig8_descender_211341770101', label:'ISC UK Figure 8 descender - 211341770101', options:['Good','Fair','Poor']},
      {key:'petzl_zigzag_2530649719968', label:'Petzl Zigzag - 2530649719968', options:['Good','Fair','Poor']},
      {key:'petzl_ok_krab_18g0147431547', label:'Petzl OK 3-Way Alu Krab - 18G0147431547', options:['Good','Fair','Poor']},
      {key:'petzl_ok_krab_21f0335559864', label:'Petzl OK 3-Way Alu Krab - 21F0335559864', options:['Good','Fair','Poor']},
      {key:'petzl_ok_krab_21f0335559821', label:'Petzl OK 3-Way Alu Krab - 21F0335559821', options:['Good','Fair','Poor']},
      {key:'dmm_ultra_o_krab_190022004e', label:'DMM Ultra O 3-Way Alu Krab - 190022004E', options:['Good','Fair','Poor']},
      {key:'isc_oval_krab_241887580022', label:'ISC UK Oval 3-way Alu Krab - 241887580022', options:['Good','Fair','Poor']},
      {key:'isc_oval_krab_241884990014', label:'ISC UK Oval 3-way Alu Krab - 241884990014', options:['Good','Fair','Poor']},
      {key:'notch_tool_lanyard_00457', label:'Notch Tool Lanyard - 00457', options:['Good','Fair','Poor']},
      {key:'bumblebee_flipline_rbl9blcoitn0747cw478', label:'Bumblebee Wire Core Flipline - RBL9BLCOITN0747CW478', options:['Good','Fair','Poor']}
    ]
  },
  climbjames: {
    label: 'James Hilborne – Climbing Kit', shortLabel: 'James Hilborne', icon: '🧗', table: 'climbing_kit_james_hilborne_checks',
    group: 'climbingkit', hideMachine: true, machines: ['James Hilborne – Climbing Kit'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'teufelberger_harness_22110011931', label:'Harness Teufelberger Pro - 22/11-0011931', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852055760', label:'Edelrid Oval Carabiner - 852055760', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852050990', label:'Edelrid Oval Carabiner - 852050990', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852051011', label:'Edelrid Oval Carabiner - 852051011', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852055779', label:'Edelrid Oval Carabiner - 852055779', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852050815', label:'Edelrid Oval Carabiner - 852050815', options:['Good','Fair','Poor']},
      {key:'petzl_grillon_22l0455110490', label:'Petzl Grillon - 22L0455110490', options:['Good','Fair','Poor']},
      {key:'marlow_boa_loop_22k1348031', label:'Marlow Boa Loop - 22K1348-031', options:['Good','Fair','Poor']},
      {key:'yale_poison_ivy_rope_87789', label:'Rope - Yale Cordage Poison Ivy - 87789', options:['Good','Fair','Poor']},
      {key:'petzl_krab_23b0469989039', label:'Petzl Carabiner - 23B0469989039', options:['Good','Fair','Poor']},
      {key:'petzl_krab_23b0469988052', label:'Petzl Carabiner - 23B0469988052', options:['Good','Fair','Poor']},
      {key:'petzl_zigzag_plus_22l0452791381', label:'Petzl ZigZag Plus - 22L0452791381', options:['Good','Fair','Poor']},
      {key:'yale_poison_ivy_37m_rope_89096', label:'Yale Cordage Poison Ivy 37m rope - 89096', options:['Good','Fair','Poor']},
      {key:'camp_herbol_cambium_saver_h0353', label:'CAMP Herbol Cambium saver - H0353', options:['Good','Fair','Poor']},
      {key:'courant_ellipse_sling_itn08245t528', label:'Courant Ellipse webbing sling - ITN08245T 528', options:['Good','Fair','Poor']},
      {key:'courant_ellipse_sling_itn08245t525', label:'Courant Ellipse webbing sling - ITN08245T 525', options:['Good','Fair','Poor']},
      {key:'petzl_ok_triact_25l0701687332', label:'Petzl OK Triact - 25L0701687332', options:['Good','Fair','Poor']},
      {key:'petzl_ok_triact_25l0701687471', label:'Petzl OK Triact - 25L0701687471', options:['Good','Fair','Poor']},
      {key:'courant_bumblebee_flipline_alp8522178', label:'Courant Bumblebee Wire Core Flipline - ALP85-22178/3t', options:['Good','Fair','Poor']}
    ]
  },
  climbluke: {
    label: 'Luke Richardson – Climbing Kit', shortLabel: 'Luke Richardson', icon: '🧗', table: 'climbing_kit_luke_richardson_checks',
    group: 'climbingkit', hideMachine: true, machines: ['Luke Richardson – Climbing Kit'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'teufelberger_harness_22110011931', label:'Harness Teufelberger Pro - 22/11-0011931', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852055760', label:'Edelrid Oval Carabiner - 852055760', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852050990', label:'Edelrid Oval Carabiner - 852050990', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852051011', label:'Edelrid Oval Carabiner - 852051011', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852055779', label:'Edelrid Oval Carabiner - 852055779', options:['Good','Fair','Poor']},
      {key:'edelrid_oval_krab_852050815', label:'Edelrid Oval Carabiner - 852050815', options:['Good','Fair','Poor']},
      {key:'petzl_grillon_22l0455110490', label:'Petzl Grillon - 22L0455110490', options:['Good','Fair','Poor']},
      {key:'marlow_boa_loop_22k1348031', label:'Marlow Boa Loop - 22K1348-031', options:['Good','Fair','Poor']},
      {key:'yale_poison_ivy_rope_87789', label:'Rope - Yale Cordage Poison Ivy - 87789', options:['Good','Fair','Poor']},
      {key:'petzl_krab_23b0469989039', label:'Petzl Carabiner - 23B0469989039', options:['Good','Fair','Poor']},
      {key:'petzl_krab_23b0469988052', label:'Petzl Carabiner - 23B0469988052', options:['Good','Fair','Poor']},
      {key:'petzl_zigzag_plus_22l0452791381', label:'Petzl ZigZag Plus - 22L0452791381', options:['Good','Fair','Poor']},
      {key:'yale_poison_ivy_37m_rope_89096', label:'Yale Cordage Poison Ivy 37m rope - 89096', options:['Good','Fair','Poor']},
      {key:'camp_herbol_cambium_saver_h0353', label:'CAMP Herbol Cambium saver - H0353', options:['Good','Fair','Poor']},
      {key:'courant_ellipse_sling_itn08245t528', label:'Courant Ellipse webbing sling - ITN08245T 528', options:['Good','Fair','Poor']},
      {key:'courant_ellipse_sling_itn08245t525', label:'Courant Ellipse webbing sling - ITN08245T 525', options:['Good','Fair','Poor']}
    ]
  },
  climbdave: {
    label: 'Dave Norris – Climbing Kit', shortLabel: 'Dave Norris', icon: '🧗', table: 'climbing_kit_dave_norris_checks',
    group: 'climbingkit', hideMachine: true, machines: ['Dave Norris – Climbing Kit'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'harness_28486', label:'Harness - 28486', options:['Good','Fair','Poor']},
      {key:'steel_core_lanyard_0910808', label:'Steel Core Lanyard - 0910808', options:['Good','Fair','Poor']},
      {key:'tachyon_lanyard_4342', label:'Tachyon lanyard - 4342', options:['Good','Fair','Poor']},
      {key:'pulleysaver_2017832', label:'Pulleysaver - 2017-832', options:['Good','Fair','Poor']},
      {key:'sirius_loop_pinto_20170956', label:'Sirius Loop with Pinto - 2017-0956 and 171432060E', options:['Good','Fair','Poor']},
      {key:'od_loop_20172764', label:'OD Loop - 2017-2764', options:['Good','Fair','Poor']},
      {key:'sirius_loop_10mm_20171889', label:'10mm Sirius Loop - 2017-1889', options:['Good','Fair','Poor']},
      {key:'marlow_boa_loop_155634004', label:'Marlow Boa Loop - 155634-004', options:['Good','Fair','Poor']},
      {key:'marlow_boa_loop_155634001', label:'Marlow Boa Loop - 155634-001', options:['Good','Fair','Poor']},
      {key:'pantin_10049fu0505', label:'Pantin - 10049FU0505', options:['Good','Fair','Poor']},
      {key:'karabiner_dn01', label:'Karabiner - DN01', options:['Good','Fair','Poor']},
      {key:'karabiner_dn02', label:'Karabiner - DN02', options:['Good','Fair','Poor']},
      {key:'rope_43427', label:'Rope - 43427', options:['Good','Fair','Poor']},
      {key:'lanyard_1330746', label:'Lanyard - 1330746', options:['Good','Fair','Poor']},
      {key:'rope_grab_1451325043', label:'Rope Grab - 14/51325/043', options:['Good','Fair','Poor']},
      {key:'zigzag_16f0029400540', label:'Zigzag - 16F0029400540', options:['Good','Fair','Poor']},
      {key:'prusik_loop_18041075', label:'Prusik Loop - 18/04-1075', options:['Good','Fair','Poor']},
      {key:'maillon_c887007', label:'Maillon - C887007', options:['Good','Fair','Poor']},
      {key:'karabiner_1794684116', label:'Karabiner - 17/94684/116', options:['Good','Fair','Poor']},
      {key:'karabiner_h122242', label:'Karabiner - H/12/2242', options:['Good','Fair','Poor']},
      {key:'karabiner_h242510', label:'Karabiner - H/24/2510', options:['Good','Fair','Poor']}
    ]
  },
  climbjason: {
    label: 'Jason Hiscock – Climbing Kit', shortLabel: 'Jason Hiscock', icon: '🧗', table: 'climbing_kit_jason_hiscock_checks',
    group: 'climbingkit', hideMachine: true, machines: ['Jason Hiscock – Climbing Kit'],
    checksHeading: 'LOLER Interim Inspection',
    fields: [
      {key:'used_since_last', label:'Has the equipment been used since its last interim inspection?', options:['Yes','No']},
      {key:'harness_1805152', label:'Harness - 18/05-152', options:['Good','Fair','Poor']},
      {key:'rope_1711697', label:'Rope - 17-11697', options:['Good','Fair','Poor']},
      {key:'rope_32798', label:'Rope - 32798', options:['Good','Fair','Poor']},
      {key:'lanyard_33282', label:'Lanyard - 33282', options:['Good','Fair','Poor']},
      {key:'friction_saver_70310570', label:'Friction Saver - 70310570', options:['Good','Fair','Poor']},
      {key:'friction_cord_18080977', label:'Friction Cord - 18/08-0977', options:['Good','Fair','Poor']},
      {key:'friction_cord_663875042', label:'Friction Cord - 663875042', options:['Good','Fair','Poor']},
      {key:'friction_cord_163617018', label:'Friction Cord - 163617-018', options:['Good','Fair','Poor']},
      {key:'zigzag_18d0133144890', label:'Zigzag - 18D0133144890', options:['Good','Fair','Poor']},
      {key:'pulley_172473662e', label:'Pulley - 172473662E', options:['Good','Fair','Poor']},
      {key:'pantin_18a0119611118', label:'Pantin - 18A0119611118', options:['Good','Fair','Poor']},
      {key:'hitchclimber_182500795e', label:'Hitchclimber - 182500795E', options:['Good','Fair','Poor']},
      {key:'karabiner_181062638e', label:'Karabiner - 181062638E', options:['Good','Fair','Poor']},
      {key:'karabiner_181062507e', label:'Karabiner - 181062507E', options:['Good','Fair','Poor']},
      {key:'karabiner_173061274g', label:'Karabiner - 173061274G', options:['Good','Fair','Poor']},
      {key:'karabiner_180314165e', label:'Karabiner - 180314165E', options:['Good','Fair','Poor']},
      {key:'karabiner_172833546e', label:'Karabiner - 172833546E', options:['Good','Fair','Poor']}
    ]
  }
};

// Group tiles on the Checks home that open a sub-tab picker instead of a form
var CHECK_GROUPS = {
  climbingkit: { heading: 'Select climber', label: 'Climbing Kit' },
  riggingkit: { heading: 'Select kit', label: 'Rigging Kit' }
};

// Sub-tab picker for a group tile (e.g. Climbing Kit) — one tile per category
// whose group matches.
function renderCheckGroupPicker(group) {
  var root = document.getElementById('checksTab_' + group);
  if (!root) return;
  var tiles = Object.keys(CHECK_CATEGORIES).filter(function(k){ return CHECK_CATEGORIES[k].group === group; }).map(function(k) {
    var cfg = CHECK_CATEGORIES[k];
    return '<div class="dash-tile" style="text-align:center;padding:22px 16px;" onclick="switchChecksTab(\'' + k + '\')">'
      + '<div class="dash-tile-icon">' + cfg.icon + '</div>'
      + '<div class="dash-tile-name">' + (cfg.shortLabel || cfg.label) + '</div>'
      + (cfg.subLabel ? '<div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;">' + cfg.subLabel + '</div>' : '')
      + '</div>';
  }).join('');
  root.innerHTML =
    '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">' + CHECK_GROUPS[group].heading + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;">' + tiles + '</div>';
}

var _catState = {};
function catState(cat) {
  if (!_catState[cat]) _catState[cat] = { inspector: null, currentId: null, autoSaveTimer: null };
  return _catState[cat];
}
var _catDetailRecordId = {};

function catOptionClass(opt) {
  var o = opt.toLowerCase();
  if (/^n\/a$|not using on site/.test(o)) return 'active-na';
  if (/too low/.test(o)) return 'active-toolow';
  if (/topped up/.test(o)) return 'active-toppedup';
  if (/^yes$|^good$|^correct$|excellent|intact and (present|functioning)|functions correctly|fully functioning and clean|correct numberplate/.test(o)) return 'active-good';
  if (/^no\b|^poor$|damaged|requires maintenance|requires attention|not working|unsatisfactory/.test(o)) return 'active-poor';
  if (/^fair$|satisfactory|working but require maintenance|could not test/.test(o)) return 'active-fair';
  return 'active-' + o.replace(/\//g,'').replace(/[^a-z0-9]/g,'');
}

function catFieldRow(cat, f) {
  var btns = f.options.map(function(opt) {
    return '<button class="veh-btn" onclick="catFieldSel(\'' + cat + '\',\'' + f.key + '\',this,\'' + opt.replace(/'/g,"\\'") + '\')">' + opt + '</button>';
  }).join('');
  var rowCls = f.stack ? 'field-row stack' : 'field-row lw';
  return '<div class="' + rowCls + '"><div class="fc lbl">' + f.label + '</div><div class="fc veh-opts" id="catField_' + cat + '_' + f.key + '">' + btns + '</div></div>';
}

function catFieldSel(cat, key, btn, val) {
  var group = document.getElementById('catField_' + cat + '_' + key);
  group.querySelectorAll('.veh-btn').forEach(function(b){ b.className = 'veh-btn'; });
  btn.classList.add(catOptionClass(val));
  group.style.outline = '';
  catAutoSave(cat);
}

function catGetFieldVal(cat, key) {
  var group = document.getElementById('catField_' + cat + '_' + key);
  if (!group) return '';
  var btn = group.querySelector('.veh-btn[class*="active-"]');
  return btn ? btn.textContent.trim() : '';
}

function catRating(cat, btn, val) {
  var root = document.getElementById('catRating_' + cat);
  root.querySelectorAll('.veh-rating-btn').forEach(function(b){ b.className = 'veh-rating-btn'; });
  btn.classList.add('active-' + val.toLowerCase());
  root.style.outline = '';
  catAutoSave(cat);
}

function catGetRating(cat) {
  var btn = document.querySelector('#catRating_' + cat + ' .veh-rating-btn[class*="active-"]');
  return btn ? btn.textContent.trim().replace(/\n.*/,'').trim() : '';
}

function catMachineSelectHtml(cat, cfg) {
  var opts = cfg.machines.map(function(m){ return '<option>' + m + '</option>'; }).join('');
  var selStyle = "width:100%;border:none;border-bottom:1.5px solid var(--border);padding:6px 0;font-size:13px;font-family:'Barlow',sans-serif;outline:none;background:transparent;color:var(--dark);";
  var inpStyle = "width:100%;border:none;border-bottom:1.5px solid var(--border);padding:6px 0;font-size:13px;font-family:'Barlow',sans-serif;outline:none;background:transparent;margin-top:6px;display:none;";
  return '<select id="catMachine_' + cat + '" onchange="catMachineChange(\'' + cat + '\')" style="' + selStyle + '">'
    + '<option value="">— Select —</option>' + opts + '<option value="__other__">Other (type in below)</option></select>'
    + '<input id="catMachineOther_' + cat + '" placeholder="Enter reference" style="' + inpStyle + '" oninput="catAutoSave(\'' + cat + '\')">';
}

function catMachineChange(cat) {
  var sel = document.getElementById('catMachine_' + cat);
  var other = document.getElementById('catMachineOther_' + cat);
  if (other) other.style.display = (sel.value === '__other__') ? 'block' : 'none';
  catAutoSave(cat);
}

function catGetMachine(cat) {
  var sel = document.getElementById('catMachine_' + cat);
  if (!sel) return CHECK_CATEGORIES[cat].hideMachine ? CHECK_CATEGORIES[cat].machines[0] : '';
  if (sel.value === '__other__') {
    var other = document.getElementById('catMachineOther_' + cat);
    return other ? other.value : '';
  }
  return sel.value;
}

function renderCategoryPanel(cat) {
  var cfg = CHECK_CATEGORIES[cat];
  var root = document.getElementById('checksTab_' + cat);
  // Sub-tabs of a group tile (e.g. each climber's kit) have no container in
  // index.html — create one next to the group's.
  if (!root && cfg && cfg.group) {
    var groupEl = document.getElementById('checksTab_' + cfg.group);
    if (groupEl) {
      root = document.createElement('div');
      root.id = 'checksTab_' + cat;
      root.className = 'checks-tab-content';
      root.style.cssText = 'display:none;max-width:600px;margin:0 auto;padding:20px;';
      groupEl.parentNode.insertBefore(root, groupEl.nextSibling);
    }
  }
  if (!root || !cfg) return;

  var fieldsHtml = cfg.fields.map(function(f){ return catFieldRow(cat, f); }).join('');
  var mileageHtml = cfg.hasMileage
    ? '<div class="field-row lw"><div class="fc lbl">' + cfg.mileageLabel + '</div><div class="fc"><input id="catMileage_' + cat + '" type="number" step="any" placeholder="Enter value" style="width:100%;border:none;border-bottom:1.5px solid var(--border);padding:6px 0;font-size:13px;font-family:\'Barlow\',sans-serif;outline:none;background:transparent;" oninput="catAutoSave(\'' + cat + '\')"></div></div>'
    : '';
  // Free-text box straight after the last item (every form; comments column)
  var commentsHtml = '<div style="padding:12px 14px;border-top:1px solid #e0e0d8;"><div style="font-size:12px;color:var(--mid);font-weight:600;margin-bottom:6px;">Comments</div>'
    + '<textarea id="catComments_' + cat + '" rows="3" placeholder="Any comments..." style="width:100%;border:1px solid var(--border);border-radius:3px;padding:8px;font-size:13px;font-family:\'Barlow\',sans-serif;outline:none;resize:vertical;" oninput="catAutoSave(\'' + cat + '\')"></textarea></div>';

  root.innerHTML =
    '<div id="catListPanel_' + cat + '">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
    + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:2px;">Completed Checks</div>'
    + '<button onclick="showCatPinPanel(\'' + cat + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:8px 16px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">+ New Check</button>'
    + '</div>'
    + '<div id="catList_' + cat + '"><div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading...</div></div>'
    + '</div>'

    + '<div id="catPinPanel_' + cat + '" style="display:none;">'
    + '<div style="background:#2b2b2b;border-radius:8px;padding:24px;text-align:center;">'
    + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">&#128100; Inspector Sign-In</div>'
    + '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:16px;">Enter your employee PIN to begin</div>'
    + '<input id="catPin_' + cat + '" class="lock-inp" type="password" inputmode="numeric" maxlength="6" placeholder="••••" oninput="checkCatPin(\'' + cat + '\',this.value)" style="width:160px;margin:0 auto 12px;display:block;text-align:center;letter-spacing:4px;font-size:20px;">'
    + '<div id="catPinErr_' + cat + '" style="color:#ff6b6b;font-size:12px;min-height:16px;margin-bottom:8px;"></div>'
    + '<div id="catPinName_' + cat + '" style="display:none;background:rgba(126,200,32,.15);border:1px solid rgba(126,200,32,.4);border-radius:4px;padding:8px 16px;color:var(--lime);font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;"></div>'
    + '<button id="catPinConfirm_' + cat + '" onclick="confirmCatPin(\'' + cat + '\')" style="display:none;background:var(--lime);border:none;color:#1a3210;padding:10px 28px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">Confirm &amp; Begin &#8594;</button>'
    + '<button onclick="showCatList(\'' + cat + '\')" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;margin-top:12px;display:block;width:100%;">&#8592; Cancel</button>'
    + '</div></div>'

    + '<div id="catFormPanel_' + cat + '" style="display:none;">'
    + '<div style="background:rgba(126,200,32,.1);border:1px solid rgba(126,200,32,.3);border-radius:4px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:rgba(255,255,255,.7);line-height:1.6;">Inspector: <strong id="catInspectorDisplay_' + cat + '" style="color:var(--lime);"></strong> &nbsp;|&nbsp; Date: <strong id="catDateDisplay_' + cat + '" style="color:var(--lime);"></strong></div>'
    + (cfg.hideMachine ? '' :
      '<div style="background:white;border-radius:8px;margin-bottom:14px;overflow:hidden;">'
      + '<div style="background:#2d5218;padding:10px 16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">' + cfg.icon + ' ' + cfg.label + ' Details</div>'
      + '<div class="field-row lw"><div class="fc lbl">' + cfg.machineLabel + '</div><div class="fc">' + catMachineSelectHtml(cat, cfg) + '</div></div>'
      + mileageHtml
      + '</div>')
    + '<div style="background:white;border-radius:8px;margin-bottom:14px;overflow:hidden;">'
    + '<div style="background:#2d5218;padding:10px 16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">&#9989; ' + (cfg.checksHeading || 'Checks') + '</div>'
    + fieldsHtml
    + commentsHtml
    + '</div>'
    + '<div style="background:white;border-radius:8px;margin-bottom:14px;overflow:hidden;">'
    + '<div style="background:#2d5218;padding:10px 16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">&#11088; Overall Rating</div>'
    + '<div style="padding:14px;display:flex;gap:10px;" id="catRating_' + cat + '">'
    + '<button class="veh-rating-btn" onclick="catRating(\'' + cat + '\',this,\'Excellent\')">&#9989; Excellent<br><span style="font-size:9px;font-weight:400;text-transform:none;font-family:\'Barlow\',sans-serif;">No areas of non-compliance</span></button>'
    + '<button class="veh-rating-btn" onclick="catRating(\'' + cat + '\',this,\'Satisfactory\')">&#9888;&#65039; Satisfactory<br><span style="font-size:9px;font-weight:400;text-transform:none;font-family:\'Barlow\',sans-serif;">Minor non-compliance</span></button>'
    + '<button class="veh-rating-btn" onclick="catRating(\'' + cat + '\',this,\'Unsatisfactory\')">&#10060; Unsatisfactory<br><span style="font-size:9px;font-weight:400;text-transform:none;font-family:\'Barlow\',sans-serif;">Major non-compliance</span></button>'
    + '</div>'
    + '<div style="padding:0 14px 14px;"><div style="font-size:12px;color:var(--mid);font-weight:600;margin-bottom:6px;">Remedial maintenance / actions taken:</div>'
    + '<textarea id="catNotes_' + cat + '" rows="3" placeholder="Describe any remedial work or actions needed..." style="width:100%;border:1px solid var(--border);border-radius:3px;padding:8px;font-size:13px;font-family:\'Barlow\',sans-serif;outline:none;resize:vertical;" oninput="catAutoSave(\'' + cat + '\')"></textarea></div>'
    + '</div>'
    + defectBlockHtml('cat_' + cat)
    + '<div id="catSaveStatus_' + cat + '" style="text-align:center;font-size:12px;color:rgba(255,255,255,.4);padding:6px 0;font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.5px;min-height:22px;"></div>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end;padding-bottom:20px;">'
    + '<button onclick="showCatList(\'' + cat + '\')" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;padding:10px 20px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;">&#8592; Back</button>'
    + '<button onclick="saveCatCheck(\'' + cat + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:10px 24px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;">&#128190; Save &amp; Submit</button>'
    + '</div>'
    + '</div>'

    + '<div id="catDetailPanel_' + cat + '" style="display:none;">'
    + '<div class="veh-no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">'
    + '<button onclick="closeCatDetail(\'' + cat + '\')" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">&#8592; Back to List</button>'
    + '<div style="font-size:11px;color:rgba(255,255,255,.4);font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.5px;">MANAGER ACCESS</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="openSurveyReport(\'cat\',\'' + cat + '\')" style="background:#4a6fa5;border:none;color:white;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">&#128203; Survey Report</button>'
    + '<button onclick="printCatRecord(\'' + cat + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">&#128190; Download PDF</button>'
    + '<button onclick="downloadCatExcel(\'' + cat + '\')" style="background:#1d6f42;border:none;color:white;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">&#128202; Download Excel</button>'
    + '<button onclick="deleteCatRecord(\'' + cat + '\')" style="background:#c62828;border:none;color:white;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">&#128465; Delete</button>'
    + '</div></div>'
    + '<div id="catDetailContent_' + cat + '"></div>'
    + '</div>';
}

function showCatList(cat) {
  document.getElementById('catListPanel_' + cat).style.display = 'block';
  document.getElementById('catPinPanel_' + cat).style.display = 'none';
  document.getElementById('catFormPanel_' + cat).style.display = 'none';
  document.getElementById('checksView').scrollTop = 0;
}

function showCatPinPanel(cat) {
  _activeScheduledCheckId = null;
  _activeScheduledMachine = null;
  document.getElementById('catListPanel_' + cat).style.display = 'none';
  document.getElementById('catPinPanel_' + cat).style.display = 'block';
  document.getElementById('catFormPanel_' + cat).style.display = 'none';
  document.getElementById('catPin_' + cat).value = '';
  document.getElementById('catPinName_' + cat).style.display = 'none';
  document.getElementById('catPinConfirm_' + cat).style.display = 'none';
  document.getElementById('catPinErr_' + cat).textContent = '';
  document.getElementById('checksView').scrollTop = 0;
}

function checkCatPin(cat, val) {
  var nameEl = document.getElementById('catPinName_' + cat);
  var errEl = document.getElementById('catPinErr_' + cat);
  var confirmBtn = document.getElementById('catPinConfirm_' + cat);
  errEl.textContent = '';
  nameEl.style.display = 'none';
  confirmBtn.style.display = 'none';
  if (val.length >= 3) {
    var name = VEH_EMPLOYEES[val];
    if (name) {
      nameEl.textContent = '✓ ' + name;
      nameEl.style.display = 'block';
      confirmBtn.style.display = 'inline-block';
    } else if (val.length >= 4) {
      errEl.textContent = 'PIN not recognised — try again';
    }
  }
}

function confirmCatPin(cat) {
  var pinEl = document.getElementById('catPin_' + cat);
  var name = VEH_EMPLOYEES[pinEl.value];
  if (!name) return;
  var st = catState(cat);
  st.inspector = name;
  st.currentId = null;
  document.getElementById('catInspectorDisplay_' + cat).textContent = name;
  document.getElementById('catDateDisplay_' + cat).textContent = new Date().toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('catPinPanel_' + cat).style.display = 'none';
  document.getElementById('catFormPanel_' + cat).style.display = 'block';
  document.getElementById('checksView').scrollTop = 0;
  catClearForm(cat);
  if (_activeScheduledMachine) {
    var sel = document.getElementById('catMachine_' + cat);
    if (sel) {
      var hasOpt = Array.prototype.some.call(sel.options, function(o){ return o.value === _activeScheduledMachine; });
      if (hasOpt) {
        sel.value = _activeScheduledMachine;
      } else {
        sel.value = '__other__';
        var other = document.getElementById('catMachineOther_' + cat);
        if (other) { other.value = _activeScheduledMachine; other.style.display = 'block'; }
      }
    }
  }
}

function catClearForm(cat) {
  var sel = document.getElementById('catMachine_' + cat);
  if (sel) sel.value = '';
  var other = document.getElementById('catMachineOther_' + cat);
  if (other) { other.value = ''; other.style.display = 'none'; }
  var mileage = document.getElementById('catMileage_' + cat);
  if (mileage) mileage.value = '';
  var notes = document.getElementById('catNotes_' + cat);
  if (notes) notes.value = '';
  var comments = document.getElementById('catComments_' + cat);
  if (comments) comments.value = '';
  var root = document.getElementById('catFormPanel_' + cat);
  root.querySelectorAll('.veh-btn').forEach(function(b){ b.className = 'veh-btn'; });
  root.querySelectorAll('.veh-rating-btn').forEach(function(b){ b.className = 'veh-rating-btn'; });
  document.getElementById('catSaveStatus_' + cat).textContent = '';
  resetDefectState('cat_' + cat);
}

function catAutoSave(cat) {
  var st = catState(cat);
  clearTimeout(st.autoSaveTimer);
  var s = document.getElementById('catSaveStatus_' + cat);
  if (s) s.textContent = 'Saving…';
  st.autoSaveTimer = setTimeout(function(){ saveCatCheck(cat, true); }, 1200);
}

function saveCatCheck(cat, isAuto) {
  var cfg = CHECK_CATEGORIES[cat];
  var st = catState(cat);
  var s = document.getElementById('catSaveStatus_' + cat);

  if (!isAuto) {
    var missing = _unansweredCheckItems(document.getElementById('catFormPanel_' + cat));
    if (!catGetMachine(cat)) missing.unshift(cfg.machineLabel || 'Machine');
    var ratingRow = document.getElementById('catRating_' + cat);
    var hasRating = !!catGetRating(cat);
    if (ratingRow) ratingRow.style.outline = hasRating ? '' : '2px solid #ff6b6b';
    if (!hasRating) missing.push('Overall rating');
    if (missing.length) { _showCheckSubmitBlocked(s, missing); return; }
  }

  var payload = {
    inspector_name: st.inspector,
    machine: catGetMachine(cat),
    overall_rating: catGetRating(cat),
    remedial_notes: document.getElementById('catNotes_' + cat).value
  };
  if (cfg.hasMileage) {
    var mEl = document.getElementById('catMileage_' + cat);
    payload.mileage = (mEl && mEl.value) ? parseFloat(mEl.value) : null;
  }
  cfg.fields.forEach(function(f) { payload[f.key] = catGetFieldVal(cat, f.key); });
  payload.comments = document.getElementById('catComments_' + cat).value;
  var _defPayload = getDefectPayload('cat_' + cat);
  payload.has_defect = _defPayload.has_defect;
  payload.defect_comment = _defPayload.defect_comment;
  payload.defect_images = _defPayload.defect_images;

  var method = 'POST';
  var url = SUPA_URL + '/rest/v1/' + cfg.table;
  if (st.currentId) { method = 'PATCH'; url += '?id=eq.' + st.currentId; }

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + _authToken(),
      'Prefer': st.currentId ? 'return=minimal' : 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  .then(function(r) {
    if (!r.ok) {
      return r.json().catch(function(){ return null; }).then(function(body) {
        var reason = (body && (body.message || body.hint || body.code)) ? (body.message || body.hint || body.code) : ('HTTP ' + r.status);
        throw new Error(reason);
      });
    }
    if (r.status === 204) return null;
    return r.json().catch(function(){ return null; });
  })
  .then(function(d) {
    if (!st.currentId && Array.isArray(d) && d[0] && d[0].id) { st.currentId = d[0].id; }
    if (s) {
      s.style.color = 'var(--lime)';
      s.textContent = '✓ ' + (isAuto ? 'Auto-saved' : 'Saved successfully!');
      if (!isAuto) {
        if (_activeScheduledCheckId) { _markScheduledComplete(_activeScheduledCheckId); _activeScheduledCheckId = null; }
        else { _completeMatchingScheduled(cat, payload.machine); }
        setTimeout(function(){ showCatList(cat); fetchCatList(cat); }, 1000);
      }
      else { setTimeout(function(){ if (s) s.textContent = ''; }, 2000); }
    }
  })
  .catch(function(err) {
    console.error(cfg.table + ' save failed', err);
    if (s) { s.style.color = '#ff6b6b'; s.textContent = 'Save failed — ' + (err && err.message ? err.message : 'check connection'); }
  });
}

function fetchCatList(cat) {
  var cfg = CHECK_CATEGORIES[cat];
  var listEl = document.getElementById('catList_' + cat);
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading…</div>';
  fetch(SUPA_URL + '/rest/v1/' + cfg.table + '?order=created_at.desc&limit=50', {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      listEl.innerHTML = '<div style="color:rgba(255,255,255,.4);padding:40px;text-align:center;font-size:13px;">No checks yet — tap + New Check to begin</div>';
      return;
    }
    listEl.innerHTML = rows.map(function(r) {
      var rating = (r.overall_rating || '').toLowerCase();
      var badgeCls = rating.indexOf('excellent') !== -1 ? 'excellent' : rating.indexOf('unsatisfactory') !== -1 ? 'unsatisfactory' : 'satisfactory';
      var badgeIcon = badgeCls === 'excellent' ? '✅' : badgeCls === 'unsatisfactory' ? '❌' : '⚠️';
      var badgeHtml = _isUnfinishedCheck(r)
        ? '<span class="veh-list-badge" style="background:#5a5a50;color:#fff;">&#9203; Not finished</span>'
        : '<span class="veh-list-badge ' + badgeCls + '">' + badgeIcon + ' ' + r.overall_rating + '</span>';
      var dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : '';
      return '<div class="veh-list-entry" onclick="openCatRecord(\'' + cat + '\',\'' + r.id + '\')">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
        + '<span class="veh-list-reg">' + (r.machine || 'Unknown') + '</span>'
        + badgeHtml
        + '</div>'
        + '<div class="veh-list-meta">' + (r.inspector_name || '') + (dateStr ? ' · ' + dateStr : '') + '</div>'
        + '<div style="font-size:11px;color:rgba(126,200,32,.6);margin-top:4px;font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.5px;">🔒 Tap to view</div>'
        + '</div>';
    }).join('');
  })
  .catch(function() {
    listEl.innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;font-size:13px;">Could not load checks</div>';
  });
}

function openCatRecord(cat, id) {
  if (!id || id === 'null' || id === 'undefined') {
    alert('This record can\'t be opened — it\'s missing an ID. Please let the office know so it can be fixed.');
    return;
  }
  if (managerUnlocked) { loadCatRecord(cat, id); return; }
  _pendingManagerRecord = { kind: 'cat', cat: cat, id: id };
  var modal = document.getElementById('vehPassModal');
  if (modal) {
    modal.style.display = 'flex';
    var inp = document.getElementById('vehPassInp');
    if (inp) { inp.value = ''; inp.focus(); }
    document.getElementById('vehPassErr').textContent = '';
  }
}

var _catDetailData = {};

function catFieldRows(cat, d) {
  var cfg = CHECK_CATEGORIES[cat];
  var fieldRows = [];
  if (cfg.hasMileage) fieldRows.push([cfg.mileageLabel, (d.mileage != null && d.mileage !== '') ? d.mileage : '']);
  cfg.fields.forEach(function(f) { fieldRows.push([f.label, d[f.key]]); });
  // Third element marks free text, so it isn't coloured as a Good/Poor answer
  fieldRows.push(['Comments', d.comments, true]);
  return fieldRows;
}

function loadCatRecord(cat, id) {
  var cfg = CHECK_CATEGORIES[cat];
  _catDetailRecordId[cat] = id;
  _catDetailData[cat] = null;
  document.getElementById('catListPanel_' + cat).style.display = 'none';
  document.getElementById('catPinPanel_' + cat).style.display = 'none';
  document.getElementById('catDetailPanel_' + cat).style.display = 'block';
  document.getElementById('catDetailContent_' + cat).innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;">Loading…</div>';
  document.getElementById('checksView').scrollTop = 0;

  fetch(SUPA_URL + '/rest/v1/' + cfg.table + '?id=eq.' + id, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    var contentEl = document.getElementById('catDetailContent_' + cat);
    if (!rows || !rows[0]) {
      console.error(cfg.table + ' load failed for id=' + id, rows);
      var reason = (rows && (rows.message || rows.hint || rows.code)) ? (rows.message || rows.hint || rows.code) : 'No record returned';
      contentEl.innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;">Could not load record<br><span style="font-size:11px;opacity:.7;">' + reason + '</span></div>';
      return;
    }
    var d = rows[0];
    _catDetailData[cat] = d;
    var rating = (d.overall_rating || '').toLowerCase();
    var badgeCls = rating.indexOf('excellent') !== -1 ? 'excellent' : rating.indexOf('unsatisfactory') !== -1 ? 'unsatisfactory' : 'satisfactory';
    var dateStr = d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '';

    var fieldRows = catFieldRows(cat, d);

    var rows_html = fieldRows.map(function(f) {
      if (!f[1] && f[1] !== 0) return '';
      var val = f[1];
      var colour = '';
      if (f[2]) val = String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
      else if (/good|yes|correct|excellent/i.test(val)) colour = 'color:#2d5a1b;font-weight:700;';
      else if (/poor|no\b|unsatisfactory/i.test(val)) colour = 'color:#c62828;font-weight:700;';
      else if (/fair|low|satisfactory/i.test(val)) colour = 'color:#7a4d00;font-weight:700;';
      return '<div class="field-row lw"><div class="fc lbl">' + f[0] + '</div><div class="fc" style="padding:10px 14px;' + colour + '">' + val + '</div></div>';
    }).filter(Boolean).join('');

    contentEl.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding:0 4px;">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:22px;font-weight:800;color:white;">' + (d.machine || '') + '</div>'
      + '<span class="veh-list-badge ' + badgeCls + '">' + (d.overall_rating || '') + '</span>'
      + '</div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:16px;padding:0 4px;">' + (d.inspector_name || '') + (dateStr ? ' · ' + dateStr : '') + '</div>'
      + '<div style="background:white;border-radius:8px;overflow:hidden;margin-bottom:14px;">' + rows_html + '</div>'
      + (d.remedial_notes ? '<div style="background:#2b2b2b;border-radius:8px;padding:14px 16px;margin-bottom:14px;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Remedial Notes</div><div style="font-size:13px;color:white;line-height:1.6;">' + d.remedial_notes + '</div></div>' : '');
  })
  .catch(function() {
    document.getElementById('catDetailContent_' + cat).innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;">Failed to load</div>';
  });
}

function closeCatDetail(cat) {
  document.getElementById('catDetailPanel_' + cat).style.display = 'none';
  document.getElementById('catListPanel_' + cat).style.display = 'block';
  document.getElementById('checksView').scrollTop = 0;
  _catDetailRecordId[cat] = null;
}

function deleteCatRecord(cat) {
  var cfg = CHECK_CATEGORIES[cat];
  var id = _catDetailRecordId[cat];
  if (!id || id === 'null' || id === 'undefined') {
    alert('This record can\'t be deleted — it\'s missing an ID. Please let the office know so it can be fixed.');
    return;
  }
  if (!confirm('Delete this check record? This cannot be undone.')) return;
  fetch(SUPA_URL + '/rest/v1/' + cfg.table + '?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r) {
    if (!r.ok) {
      return r.json().catch(function(){ return null; }).then(function(body) {
        console.error(cfg.table + ' delete failed for id=' + id, r.status, body);
        var reason = (body && (body.message || body.hint || body.code)) ? (body.message || body.hint || body.code) : ('HTTP ' + r.status);
        throw new Error(reason);
      });
    }
    _catDetailRecordId[cat] = null;
    closeCatDetail(cat);
    fetchCatList(cat);
  })
  .catch(function(err) {
    alert('Could not delete record — ' + (err && err.message ? err.message : 'check connection and try again.'));
  });
}

function printCatRecord(cat) {
  var view = document.getElementById('checksView');
  view.classList.add('printing-veh');
  _printWithClass(function() { view.classList.remove('printing-veh'); });
}

function downloadCatExcel(cat) {
  var cfg = CHECK_CATEGORIES[cat];
  var d = _catDetailData[cat];
  if (!d) return;
  var dateStr = d.created_at ? new Date(d.created_at).toLocaleString('en-GB') : '';
  var meta = [
    ['Inspector', d.inspector_name || ''],
    ['Date', dateStr],
    ['Overall Rating', d.overall_rating || '']
  ];
  var filename = cfg.label.replace(/[^a-z0-9]+/gi,'_') + '_Check_' + safeFileSegment(d.machine) + '_' + safeFileSegment(dateStr) + '.xlsx';
  exportFieldsToExcel(filename, cfg.label + ' Check — ' + (d.machine || ''), meta, catFieldRows(cat, d));
}

