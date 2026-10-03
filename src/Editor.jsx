import {useState,useEffect,useRef} from 'react'
import {api} from './api.js'
import {RecipientExperience} from './Experience.jsx'
const SCHEMA={
  intro:{label:'Intro',f:[['title','Title'],['subtitle','Subtitle'],['button','Button text']]},
  wish:{label:'Birthday wish',f:[['title','Title'],['text','Message','area']]},
  letter:{label:'Personal letter',f:[['title','Title'],['text','Write your letter','area']]},
  memories:{label:'Memories',f:[['title','Title']],items:'mem'},
  gallery:{label:'Photo gallery',f:[['title','Title']],items:'img'},
  messages:{label:'Special messages',f:[['title','Title']],items:'str'},
  reasons:{label:'Things I love',f:[['title','Title']],items:'str'},
  timeline:{label:'Timeline',f:[['title','Title']],items:'tl'},
  reveal:{label:'Final surprise',f:[['teaser','Teaser'],['button','Button text'],['title','Reveal title'],['text','Reveal message','area']]},
  final:{label:'Final screen',f:[['title','Title'],['text','Final message','area'],['replay','Replay button text']]}
}
const BLANK={mem:{title:'',description:'',date:'',image:'',alt:''},img:{image:'',alt:''},str:'',tl:{year:'',text:''}}
const uid=()=>Math.random().toString(36).slice(2,10)
const Field=({label,value,onChange,area})=><label className="fld"><span>{label}</span>{area?<textarea rows={7} value={value||''} onChange={e=>onChange(e.target.value)} maxLength={8000}/>:<input value={value||''} onChange={e=>onChange(e.target.value)} maxLength={300}/>}</label>
const Err=({e})=>e?<div className="err" role="alert">{e}</div>:null

export function Create(){
  const [f,setF]=useState({recipient_name:'',creator_name:'',birthday_date:'',relationship:''}),[busy,setB]=useState(false),[e,setE]=useState('')
  const submit=async ev=>{ev.preventDefault();setB(true);setE('')
    try{const r=await api.create(f);api.setToken(r.id,r.edit_token);go('/editor/'+r.id)}catch(x){setE(x.message);setB(false)}}
  return <div className="center create"><form onSubmit={submit}><h1>Create something special</h1><p className="muted">Build a birthday surprise, then send one link.</p>
    <Field label="Who is it for?" value={f.recipient_name} onChange={v=>setF({...f,recipient_name:v})}/>
    <Field label="Birthday date (optional)" value={f.birthday_date} onChange={v=>setF({...f,birthday_date:v})}/>
    <label className="fld"><span>Relationship (optional)</span><select value={f.relationship} onChange={e=>setF({...f,relationship:e.target.value})}><option value="">Skip</option>{['Friend','Best friend','Sister','Brother','Partner','Mother','Father','Other'].map(r=><option key={r}>{r}</option>)}</select></label>
    <Field label="Your name (optional)" value={f.creator_name} onChange={v=>setF({...f,creator_name:v})}/>
    <Err e={e}/><button className="pri" disabled={busy||!f.recipient_name.trim()}>{busy?'Creating…':'Start building'}</button></form></div>
}

function Items({kind,items=[],set,id,onErr}){
  const [up,setUp]=useState(false);const upd=(i,v)=>set(items.map((x,k)=>k===i?v:x))
  const pick=async(i,file)=>{if(!file)return;setUp(true);onErr('');try{const r=await api.upload(id,file);upd(i,{...items[i],image:r.url})}catch(e){onErr(e.message)}setUp(false)}
  const del=i=>confirm('Delete this item?')&&set(items.filter((_,k)=>k!==i))
  const addMany=async files=>{setUp(true);onErr('');const out=[];for(const fl of [...files]){try{out.push({...BLANK.img,image:(await api.upload(id,fl)).url})}catch(e){onErr(e.message)}}set([...items,...out]);setUp(false)}
  return <div className="items">
    {!items.length&&<p className="muted">{kind==='img'?'Add some photos to make this experience more personal.':kind==='mem'?'No memories added yet.':'Nothing added yet.'}</p>}
    {items.map((it,i)=><div className="item" key={i}>
      {kind==='str'&&<textarea rows={2} value={it} maxLength={500} onChange={e=>upd(i,e.target.value)} aria-label={`Item ${i+1}`}/>}
      {kind==='tl'&&<><input placeholder="Year" value={it.year} onChange={e=>upd(i,{...it,year:e.target.value})}/><textarea rows={2} value={it.text} onChange={e=>upd(i,{...it,text:e.target.value})} placeholder="What happened"/></>}
      {(kind==='mem'||kind==='img')&&<>{it.image&&<img className="th" src={it.image} alt=""/>}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>pick(i,e.target.files[0])} aria-label="Upload image"/>
        <input placeholder="Alt text (describe the photo)" value={it.alt} onChange={e=>upd(i,{...it,alt:e.target.value})}/></>}
      {kind==='mem'&&<><input placeholder="Title" value={it.title} onChange={e=>upd(i,{...it,title:e.target.value})}/><input placeholder="Date (optional)" value={it.date} onChange={e=>upd(i,{...it,date:e.target.value})}/><textarea rows={3} placeholder="Description" value={it.description} onChange={e=>upd(i,{...it,description:e.target.value})}/></>}
      <button className="sm danger" onClick={()=>del(i)}>Delete</button></div>)}
    {up&&<p className="muted">Uploading…</p>}
    <div className="row">{kind==='img'?<label className="sm btnlike">+ Add photos<input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>addMany(e.target.files)}/></label>
      :<button className="sm" onClick={()=>set([...items,typeof BLANK[kind]==='string'?'':{...BLANK[kind]}])}>+ Add {kind==='mem'?'memory':kind==='tl'?'event':'item'}</button>}</div></div>
}

function SectionCard({s,i,n,id,patch,move,dup,del,onErr}){
  const [open,setOpen]=useState(false);const sc=SCHEMA[s.type]
  return <div className={'sec'+(s.enabled?'':' off')}><div className="sech"><button className="lnk" aria-expanded={open} onClick={()=>setOpen(!open)}>{sc.label}</button>
    <span className="row"><button className="sm" disabled={i===0} onClick={()=>move(i,-1)} aria-label="Move up">↑</button><button className="sm" disabled={i===n-1} onClick={()=>move(i,1)} aria-label="Move down">↓</button>
    <label className="sm btnlike"><input type="checkbox" checked={s.enabled} onChange={e=>patch(i,{...s,enabled:e.target.checked})}/> On</label>
    <button className="sm" onClick={()=>dup(i)}>Duplicate</button><button className="sm danger" onClick={()=>del(i)}>Delete</button></span></div>
    {open&&<div className="secb">{sc.f.map(([k,l,t])=><Field key={k} label={l} area={t==='area'} value={s.data[k]} onChange={v=>patch(i,{...s,data:{...s.data,[k]:v}})}/>)}
      {sc.items&&<Items kind={sc.items} items={s.data.items} id={id} onErr={onErr} set={items=>patch(i,{...s,data:{...s.data,items}})}/>}</div>}</div>
}

export function Editor({id}){
  const [d,setD]=useState(null),[meta,setM]=useState({}),[err,setErr]=useState(''),[st,setSt]=useState(''),[dirty,setDirty]=useState(false),[done,setDone]=useState(false),[tab,setTab]=useState('content'),[copied,setC]=useState(false)
  useEffect(()=>{api.get(id).then(r=>{setD(r.data);setM(r)}).catch(e=>setErr(e.status===404?'Birthday experience not found.':e.message))},[id])
  useEffect(()=>{if(!dirty)return;const h=e=>e.preventDefault();addEventListener('beforeunload',h);return()=>removeEventListener('beforeunload',h)},[dirty])
  if(err&&!d)return <div className="center"><h1>{err}</h1><a href="/">Create a new one</a></div>
  if(!d)return <div className="center"><p>Loading…</p></div>
  const set=fn=>{setD(fn);setDirty(true)}
  const save=async()=>{setSt('Saving…');setErr('');try{const r=await api.save(id,d);setM(r);setDirty(false);setSt('Saved');return true}catch(e){setErr(e.status?'Unable to save your changes. Please try again.':e.message);setSt('');return false}}
  const publish=async()=>{if(!await save())return;setSt('Generating your link…');try{const r=await api.publish(id);setM({...r,url:location.origin+'/birthday/'+r.public_id});setSt('');setDone(true)}catch(e){setErr(e.message);setSt('')}}
  const patch=(i,s)=>set(x=>({...x,sections:x.sections.map((o,k)=>k===i?s:o)}))
  const move=(i,dl)=>set(x=>{const a=[...x.sections];[a[i],a[i+dl]]=[a[i+dl],a[i]];return{...x,sections:a}})
  const dup=i=>set(x=>{const a=[...x.sections];a.splice(i+1,0,{...JSON.parse(JSON.stringify(a[i])),id:uid()});return{...x,sections:a}})
  const del=i=>confirm('Delete this section?')&&set(x=>({...x,sections:x.sections.filter((_,k)=>k!==i)}))
  const th=(k,v)=>set(x=>({...x,theme:{...x.theme,[k]:v}}))
  const PRESETS={romantic:['#fff1f2','#3b0a1e','#e11d48'],cute:['#fdf4ff','#4a1d5c','#d946ef'],elegant:['#faf7f2','#2b2118','#a16207'],minimal:['#ffffff','#111827','#111827'],colorful:['#fef9c3','#1e1b4b','#f97316'],dark:['#0f0a1e','#f5f3ff','#a855f7'],classic:['#eff6ff','#1e293b','#2563eb']}
  const preset=n=>set(x=>({...x,theme:{...x.theme,name:n,background:PRESETS[n][0],text:PRESETS[n][1],accent:PRESETS[n][2]}}))
  const copy=async()=>{try{await navigator.clipboard.writeText(meta.url);setC(true);setTimeout(()=>setC(false),2000)}catch{prompt('Copy this link:',meta.url)}}
  const share=()=>navigator.share?navigator.share({title:'A birthday surprise',url:meta.url}).catch(()=>{}):copy()
  if(done)return <div className="center done"><h1>Your birthday surprise is ready! 🎉</h1><input readOnly value={meta.url} onFocus={e=>e.target.select()} aria-label="Birthday link"/>
    <div className="row"><button className="pri" onClick={copy}>Copy link</button><a className="pri" href={`/birthday/${meta.public_id}`} target="_blank" rel="noreferrer">Open experience</a><button className="pri" onClick={share}>Share</button>
    <a className="pri" href={`https://wa.me/?text=${encodeURIComponent(meta.url)}`} target="_blank" rel="noreferrer">WhatsApp</a></div>
    <p role="status">{copied?'Link copied!':''}</p><button className="lnk" onClick={()=>setDone(false)}>Back to editor</button></div>
  return <div className="ed"><header><b>Birthday editor</b><span className="muted" role="status">{st||(dirty?'Unsaved changes':meta.has_unpublished_changes?'Changes not published':'')}</span>
    <span className="row"><button onClick={()=>setShow(!show)} className="mobonly">{show?'Edit':'Preview'}</button><button onClick={save} disabled={!dirty}>Save</button><button className="pri" onClick={publish}>{meta.public_id?'Republish':'Generate link'}</button></span></header>
    <Err e={err}/>
    <div className={'cols'+(show?' showp':'')}><aside><nav className="tabs">{['general','content','design'].map(t=><button key={t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{t}</button>)}</nav>
      {tab==='general'&&<div className="panel"><Field label="Recipient name" value={d.recipient_name} onChange={v=>set(x=>({...x,recipient_name:v}))}/><Field label="Birthday date" value={d.birthday_date} onChange={v=>set(x=>({...x,birthday_date:v}))}/><Field label="Your name" value={d.creator_name} onChange={v=>set(x=>({...x,creator_name:v}))}/>
        <button className="danger" onClick={async()=>{if(confirm('Delete this whole project and its photos? This cannot be undone.')){try{await api.remove(id);go('/')}catch(e){setErr(e.message)}}}}>Delete project</button></div>}
      {tab==='content'&&<div className="panel">{d.sections.map((s,i)=><SectionCard key={s.id} {...{s,i,id,patch,move,dup,del}} n={d.sections.length} onErr={setErr}/>)}
        <label className="fld"><span>Add a section</span><select value="" onChange={e=>e.target.value&&set(x=>({...x,sections:[...x.sections,{id:uid(),type:e.target.value,enabled:true,data:{title:SCHEMA[e.target.value].label,items:[]}}]}))}><option value="">Choose…</option>{Object.entries(SCHEMA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label></div>}
      {tab==='design'&&<div className="panel"><label className="fld"><span>Theme</span><select value={d.theme.name} onChange={e=>preset(e.target.value)}>{Object.keys(PRESETS).map(k=><option key={k}>{k}</option>)}</select></label>
        {[['background','Background'],['text','Text'],['accent','Accent']].map(([k,l])=><label className="fld inl" key={k}><span>{l} colour</span><input type="color" value={d.theme[k]} onChange={e=>th(k,e.target.value)}/></label>)}
        {[['font','Font',['serif','sans','script','mono']],['button','Button style',['pill','rounded','square']],['animation','Animation',['none','gentle','festive']],['backdrop','Background',['plain','hearts','confetti','stars']]].map(([k,l,o])=><label className="fld" key={k}><span>{l}</span><select value={d.theme[k]} onChange={e=>th(k,e.target.value)}>{o.map(v=><option key={v}>{v}</option>)}</select></label>)}
        <p className="muted">Music upload isn't available yet.</p></div>}
    </aside><section className="pv" aria-label="Live preview"><div className="phone"><RecipientExperience data={d}/></div></section></div></div>
}
