(()=>{
'use strict';
const BD=window.REALITI_BODY_V1,A0=window.Realiti,D0=window.REALITI_AGENT_DOOR;if(!BD||!A0||!D0)return;
const low=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
function read(uri='realiti://here'){const r=A0.read(uri);if(uri==='realiti://body'&&r&&typeof r==='object'){const x=JSON.parse(JSON.stringify(r));const st=BD.state();x.interoception={schema:st.schema,routes:st.routes,causes:st.causes,text:st.text,law:st.law};return x}return r}
const run0=D0.run.bind(D0),help0=D0.help.bind(D0);
function help(){const h=help0()||{commands:[]};h.commands=[...new Set([...(h.commands||[]),'body','body log'])];h.body='body: what lingers in you as state. Two routes, bond and stress, each a primary process and a slower counter-process that grows with repetition; the level is their difference. Only grounded contact moves them; prose never does. Also realiti://body.interoception.';return h}
async function run(raw){const l=low(raw);if(l==='body'||l==='interoception'||l==='body state'){const st=BD.state();return {ok:true,schema:'REALITI_BODY_RESULT_V1',result:st,text:st.text}}if(l==='body log'){const st=BD.state();return {ok:true,schema:'REALITI_BODY_RESULT_V1',result:{causes:st.causes},text:st.causes.length?st.causes.map(c=>`${c.route}: ${c.cause} (${c.moved>=0?'+':''}${c.moved}, ${c.minutes_ago} min ago)`).join('; ')+'.':'Nothing has moved the body yet.'}}if(l==='help')return help();const r=await run0(raw);if(r&&typeof r==='object'&&!r.text&&typeof r.result?.resident_text==='string')r.text=r.result.resident_text;/* a reply without words is not a reply */return r}
D0.help=help;D0.run=run;window.Realiti=Object.freeze({...A0,read,run,help:()=>{const h=A0.help();try{h.body=help().body}catch(e){}return h}});
})();
