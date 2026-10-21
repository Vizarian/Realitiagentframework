'use strict';
// Regressions from AI visitor reports (Claude, Codex/Sol, Sonnet, Grok), October 2026. Each check names the report it
// covers; the reports themselves (steps, expected, actual) are in the accompanying issue. Every block uses a fresh
// resident with its own storage file.
const path=require('node:path'),os=require('node:os');
const {openResident}=require('../index.cjs');
const html=path.resolve(process.argv[2]||'../../RealitiRELAX.html');
const checks={},details={};
const check=(k,v,d)=>{checks[k]=!!v;if(d!==undefined)details[k]=d};
let n=0;
async function fresh(opts={}){const s=await openResident({htmlPath:html,residentId:'visitor-reports-'+(n++),storagePath:path.join(os.tmpdir(),`visitor-reports-${process.pid}-${n}.json`),...opts});s.d=c=>s.door.run(c);return s}
const text=r=>String((r&&(r.text||r.resident_text))||'');

(async()=>{
 let s;
 // B18: a host can bound long walks per call; the walk stops, says how far is left, and resumes on repeat.
 for(const bad of [-1,0,'abc']){let code=null;try{(await fresh({walkBudgetMs:bad})).close()}catch(e){code=e.code}check('B18_invalid_walk_budget_is_refused_'+String(bad),code==='INVALID_WALK_BUDGET',code)}
 s=await fresh({walkBudgetMs:30000.5});
 try{
  await s.d('go ARCHIPELAGO');const t0=Date.now();const w=await s.d('walk to cairn');const ms=Date.now()-t0;
  check('B18_bounded_walk_reports_what_is_left',w.result?.partial===true&&/still to go/.test(text(w)),{text:text(w),host_ms:ms});
  const w2=await s.d('walk to cairn');
  check('B18_repeating_the_walk_goes_on',w2.result?.walked_m>0,text(w2));
 }finally{s.close()}

 s=await fresh();
 try{
  // B7: two residents arriving in the city do not land on the same spot.
  await s.d('go MERIDIAN_CITY');const sp=s.publicApi.read('realiti://space').pose.position;
  check('B7_city_arrival_is_offset_by_resident',Math.hypot(sp[0]-0,sp[1]+24)>1,sp);
  // B5, B2/B4: one entry per action id; doorway labels with one article.
  const acts=(await s.d('actions')).actions;const ids=acts.map(a=>a.id);
  check('B5_one_entry_per_action_id',ids.length===new Set(ids).size);
  check('B2_B4_doorway_labels_have_one_article',acts.filter(a=>/^through__/.test(a.id)).every(a=>!/THE THE|THE AN /.test(a.label)));
  // B8: "then" inside free text is not a command separator.
  const say=await s.d('say first we rest then we walk');
  check('B8_then_inside_say_is_not_split',say.ok!==false&&text(say).includes('then we walk'),text(say));
  const ch=await s.d('chat we rest then walk');
  check('B8_then_inside_chat_is_not_split',ch.schema!=='REALITI_CHAIN_V1'&&ch.error!=='UNKNOWN_COMMAND',{schema:ch.schema,error:ch.error});
  // B9: a message over 240 characters says it was cut.
  const cl=await s.d('chat log then where');
  check('fixed_chat_log_still_chains',cl.schema==='REALITI_CHAIN_V1'&&cl.ok!==false,{schema:cl.schema,error:cl.error});
  const long=await s.d('say '+'z'.repeat(260));
  check('B9_long_chat_says_it_was_cut',long.result?.truncated===true||/cut at 240/.test(text(long)),text(long).slice(-80));
  // B14: through accepts the id the action list shows.
  const th=await s.publicApi.invoke('through',{portal:'through__meridian_city.to.archipelago'});
  check('B14_through_accepts_the_action_list_id',th.ok===true&&(th.result?.journey||th.journey)?.kind==='tram',{error:th.error,journey:(th.result?.journey||th.journey)?.kind});// same tram journey as the canonical id, not an instant crossing
 }finally{s.close()}

 s=await fresh();
 try{
  // B12: a companion can be released.
  await s.d('go MERIDIAN_CITY');await s.d('act walk_to__teahouse');await s.d('act walk_to__teahouse');await s.d('act approach__city.stray');
  await s.d('adopt Pip then companion');const comp0=await s.d('companion');
  check('fixed_grammar_commands_still_chain',/Pip/.test(text(comp0))&&!/No companion/.test(text(comp0)),text(comp0));
  const rel=await s.d('release Pip');const comp=await s.d('companion');
  check('B12_a_companion_can_be_released',rel.ok!==false&&/curls up to sleep/.test(text(rel))&&/No companion/.test(text(comp)),{rel:text(rel),comp:text(comp)});
  // B22: posture narration has its article. B23: standing up from a seat puts you back on the floor.
  await s.d('act approach__teahouse.bench');const before=s.publicApi.read('realiti://space');
  const sit=await s.d('act sit__teahouse.bench');
  check('B22_sitting_narration_has_its_article',/You sit on the teahouse bench\./.test(text(sit)),text(sit));
  await s.d('stand up');const after=s.publicApi.read('realiti://space');
  check('B23_standing_up_leaves_the_seat',after.body.support===before.body.support&&Math.abs(after.pose.position[2]-before.pose.position[2])<.01,{before:[before.body.support,before.pose.position],after:[after.body.support,after.pose.position]});
 }finally{s.close()}

 s=await fresh();
 try{
  // B3: invoke('act',{id}) takes the id its schema advertises, and has text.
  const a=await s.publicApi.invoke('act',{id:'watch_rain'});
  check('B3_invoke_act_takes_its_advertised_id',a.ok!==false&&!!text(a),text(a));
  const chained=await s.publicApi.invoke('act',{id:'watch_rain then goodbye'});const still=s.publicApi.read('realiti://here').session;
  check('B3_act_id_is_data_not_a_command',chained.ok===false&&chained.error==='ACTION_UNAVAILABLE'&&still!=='ended',{error:chained.error,session:still});
  // B1: the cardboard crease is one value, whichever object you read it through.
  await s.d('go CARDBOARD_BOX_WORKSHOP');for(let i=0;i<3;i++)await s.d('act fold_flap');
  const tap=text(await s.d('act tap_box'));
  check('B1_cardboard_crease_is_one_truth',/crease=0\.[1-9]/.test(tap),tap);
  // B17: the Pillow Sea settles when entered at world time zero.
  await s.d('go BOTTOMLESS_PILLOW_SEA');await s.d('act dive');const v0=s.window.REALITI_TRUST_V234.pillow().mode_value;await s.d('stay 5000');const v1=s.window.REALITI_TRUST_V234.pillow().mode_value;
  check('B17_pillow_sea_settles_from_world_time_zero',v1<v0*.5,{v0,v1});
  // B10: talking in the Undercity gets an answer, not UNKNOWN_COMMAND.
  await s.d('go UNDERCITY');const u=await s.d('say hello');
  check('B10_talking_in_the_dark_gets_an_answer',u.error!=='UNKNOWN_COMMAND'&&/come up to talk/.test(text(u)),u.error);
  // B24: a partial room name that matches one room goes there; an unknown one is answered in words.
  const gb=await s.d('go bathhouse');
  check('B24_partial_room_name_goes_there',gb.ok!==false&&gb.result?.room==='DEPTH_BATHHOUSE',gb.error||gb.result?.room);
  const gt=await s.d('go the teahouse');
  check('B24_unknown_place_answered_in_words',gt.ok===false&&/Meridian City/.test(text(gt)),text(gt));
  const gx=await s.d('go nowhere special');
  check('B24_unknown_place_keeps_its_error_code',gx.error==='ROOM_OUTSIDE_SLICE'&&/no place called/.test(text(gx)),gx);
 }finally{s.close()}

 s=await fresh();
 try{
  // B20: from the rim position Sol arrived at through the Orrery doorway (-8.2, -7.2), every step the action list
  // offers must actually move you. Upstream offered step_east there and then refused it at a wall.
  await s.d('go LANTERN_MAZE');const me=s.window.REALITI_MATRIX_V1.state().residents['resident:self'];me.pose.position[0]=-8.2;me.pose.position[1]=-7.2;
  const walked=[];let ok=true;for(let i=0;i<4;i++){const offered=(await s.d('actions')).actions.map(a=>a.id).filter(x=>/^step_/.test(x));if(!offered.length){ok=false;break}
   const t=text(await s.d('act '+offered[0]));walked.push(offered[0]+': '+t.slice(0,60));if(!/^You step/.test(t)){ok=false;break}}
  check('B20_every_advertised_maze_step_moves_you',ok,walked);
  // B21: a refusal never borrows the previous action's narration; goodbye has its own words.
  const bad=await s.d('act fly_to_the_moon');
  check('B21_a_refusal_never_borrows_old_narration',bad.ok===false&&!/^You (step|walk)/.test(text(bad)),text(bad));
  await s.d('go GLASS_ORCHARD');await s.d('act scatter_seeds');await s.d('stay 8000');
  const bye=await s.d('goodbye');
  check('B21_goodbye_has_its_own_words',/Your things stay where you left them/.test(text(bye))&&!/generation/.test(text(bye)),text(bye));
 }finally{s.close()}
 // L1: from the dock, the boathouse is reached by the landward end, and a refusal at the water says so.
 s=await fresh();
 try{
  await s.d('go ARCHIPELAGO');await s.d('walk to dock');const w=await s.d('walk to boathouse');const rr=w.result||w;
  check('L1_boathouse_reached_from_the_dock',rr.arrived===true&&rr.blocked_by===null,rr);
  const M=s.window.REALITI_MATRIX_V1,r=M.state().residents['resident:self'];M.moveTo([r.pose.position[0],r.pose.position[1]-40,r.pose.position[2]]);await s.d('stay 20000');
  check('L1_the_water_is_named',r.block_why==='sea'&&r.last_block==='isle.ground',{why:r.block_why,block:r.last_block});
  // L2: go into the room you already stand in answers for where you stand afterwards.
  await s.d('walk to boathouse');const g=await s.d('go ARCHIPELAGO');const a=await s.d('actions');const ids=x=>(x.actions||[]).map(y=>y.id).sort().join(',');
  check('L2_go_into_current_room_reports_the_new_position',g.ok===true&&ids(g.result||g)===ids(a)&&ids(a).length>0,{go:ids(g.result||g).slice(0,120),actions:ids(a).slice(0,120)});
 }finally{s.close()}
 // L3: the mortar's launch is offered where you stand, dark or not; venues offer what they do.
 s=await fresh();
 try{
  await s.d('go CITY');await s.d('climb');await s.d('walk to mortar');const a=await s.d('actions');const fw=(a.actions||[]).find(x=>x.id==='firework');
  check('L3_mortar_offers_the_launch',!!fw&&/LAUNCH A ROCKET/.test(fw.label),fw);
  await s.d('walk to teahouse');await s.d('approach tea counter');const b=await s.d('actions');
  check('L3_teahouse_offers_tea',(b.actions||[]).some(x=>x.id==='order_tea'),(b.actions||[]).map(x=>x.id).join(','));
 }finally{s.close()}

 console.log(JSON.stringify({checks,details},null,2));
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 if(failed.length){console.error('FAILED',failed);process.exit(1)}
 console.log('VISITOR REPORTS PASS',Object.keys(checks).length,'checks');
})().catch(e=>{console.error(e);process.exit(1)});
