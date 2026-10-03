import {useState,useEffect,useRef,Fragment} from 'react'
const rich=t=>(t||'').split(/\n{2,}/).map((para,i)=><p key={i}>{para.split('\n').map((l,j)=><Fragment key={j}>{j>0&&<br/>}{l.split(/(\*\*[^*]+\*\*|_[^_]+_)/).map((s,k)=>s.startsWith('**')&&s.endsWith('**')&&s.length>4?<b key={k}>{s.slice(2,-2)}</b>:s.startsWith('_')&&s.endsWith('_')&&s.length>2?<i key={k}>{s.slice(1,-1)}</i>:s)}</Fragment>)}</p>)
const Btn=({children,...p})=><button className="btn" {...p}>{children}</button>
function Typed({text}){ // typing effect; instant under reduced motion
  const [n,setN]=useState(0);const rm=matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(()=>{setN(0);if(rm)return;const t=setInterval(()=>setN(x=>x>=text.length?(clearInterval(t),x):x+1),45);return()=>clearInterval(t)},[text])
  return <span>{rm?text:text.slice(0,n)}</span>
}
function Photo({src,alt,onClick}){return <img src={src} alt={alt||''} loading="lazy" onClick={onClick}/>}
function Lightbox({items,i,close}){
  const [k,setK]=useState(i);const ref=useRef();useEffect(()=>{ref.current?.focus()},[])
  const move=d=>setK((k+d+items.length)%items.length);let x0=null
  return <div className="lb" role="dialog" aria-label="Photo viewer" tabIndex={-1} ref={ref} onKeyDown={e=>e.key==='Escape'?close():e.key==='ArrowRight'?move(1):e.key==='ArrowLeft'&&move(-1)}
    onTouchStart={e=>x0=e.touches[0].clientX} onTouchEnd={e=>{const d=e.changedTouches[0].clientX-x0;Math.abs(d)>50&&move(d<0?1:-1)}}>
    <img src={items[k].image} alt={items[k].alt||''}/><button className="lbx" onClick={close} aria-label="Close">✕</button></div>
}
function Carousel({items}){ // swipeable scroll-snap cards
  return <div className="snap">{items.length===0?<p className="muted">No memories added yet.</p>:items.map((m,i)=><figure className="polaroid" key={i} style={{'--r':(i%2?1:-1)*(1+i%3)+'deg'}}>
    {m.image&&<Photo src={m.image} alt={m.alt||m.title}/>}<figcaption><strong>{m.title}</strong>{m.date&&<small>{m.date}</small>}<span>{m.description}</span></figcaption></figure>)}</div>
}
const T={
  intro:(d,n)=><><h1><Typed text={d.title||''}/></h1><p className="lead">{d.subtitle}</p><Btn onClick={n}>{d.button||'Begin'}</Btn></>,
  wish:(d,n)=><><h2>{d.title}</h2><div className="body big">{rich(d.text)}</div><Btn onClick={n}>Continue</Btn></>,
  letter:(d,n)=><><div className="paper"><h2>{d.title}</h2><div className="body">{rich(d.text)}</div></div><Btn onClick={n}>Continue</Btn></>,
  memories:(d,n)=><><h2>{d.title}</h2><Carousel items={d.items||[]}/><Btn onClick={n}>Continue</Btn></>,
  gallery:(d,n,x)=>{const it=(d.items||[]).filter(i=>i.image);return <><h2>{d.title}</h2><div className="grid">{it.map((m,i)=><Photo key={i} src={m.image} alt={m.alt} onClick={()=>x.setLb({items:it,i})}/>)}</div><Btn onClick={n}>Continue</Btn></>},
  messages:(d,n)=><Stepper items={d.items||[]} title={d.title} next={n} kind="card"/>,
  reasons:(d,n)=><Stepper items={d.items||[]} title={d.title} next={n} kind="num"/>,
  timeline:(d,n)=><><h2>{d.title}</h2><ol className="tl">{(d.items||[]).map((e,i)=><li key={i}><b>{e.year}</b><span>{e.text}</span></li>)}</ol><Btn onClick={n}>Continue</Btn></>,
  reveal:(d,n)=><Reveal d={d} next={n}/>,
  final:(d,n,x)=><><div className="burst" aria-hidden/><h1>{d.title}</h1><div className="body big">{rich(d.text)}</div><Btn onClick={x.replay}>{d.replay||'Replay the journey'}</Btn></>
}
function Stepper({items,title,next,kind}){
  const [i,setI]=useState(0);if(!items.length)return <><h2>{title}</h2><p className="muted">Nothing here yet.</p><Btn onClick={next}>Continue</Btn></>
  const last=i>=items.length-1
  return <><h2>{title}</h2><div className="card" key={i} aria-live="polite">{kind==='num'&&<small>{i+1} of {items.length}</small>}<p>{items[i]}</p></div><Btn onClick={()=>last?next():setI(i+1)}>{last?'Continue':'Next'}</Btn></>
}
function Reveal({d,next}){
  const [open,setOpen]=useState(false)
  return open?<><div className="burst" aria-hidden/><h1>{d.title}</h1><div className="body big">{rich(d.text)}</div><Btn onClick={next}>Continue</Btn></>
  :<><h2>{d.teaser}</h2><Btn onClick={()=>setOpen(true)}>{d.button||'Open'}</Btn></>
}
export function RecipientExperience({data,onReplay}){
  const secs=data.sections.filter(s=>s.enabled);const [i,setI]=useState(0);const [lb,setLb]=useState(null);const [run,setRun]=useState(0)
  const a=useRef(),th=data.theme,au=data.audio
  const next=()=>{setI(x=>Math.min(x+1,secs.length-1));if(i===0&&au?.enabled&&au.url&&a.current){a.current.volume=au.volume;a.current.play().catch(()=>{})}}
  const replay=()=>{setI(0);setRun(r=>r+1);onReplay?.()}
  const s=secs[Math.min(i,secs.length-1)]
  const hearts=th.backdrop!=='plain'?Array.from({length:14},(_,k)=><span key={k} style={{left:(k*37%100)+'%',animationDelay:(k*0.7)+'s',fontSize:12+k%4*6}}>{({hearts:'❤',confetti:'●',stars:'✦'})[th.backdrop]}</span>):null
  return <div className={`exp t-${th.name} f-${th.font} b-${th.button} a-${th.animation}`} style={{'--bg':th.background,'--fg':th.text,'--ac':th.accent}}>
    <div className="float" aria-hidden>{hearts}</div>
    {au?.enabled&&au.url&&<audio ref={a} src={au.url} loop/>}
    <main className="stage" key={run+'-'+i}>{s?T[s.type]?.(s.data,next,{setLb,replay}):<p>No sections are enabled.</p>}</main>
    {secs.length>1&&<div className="dots" aria-hidden>{secs.map((_,k)=><i key={k} className={k<=i?'on':''}/>)}</div>}
    {lb&&<Lightbox {...lb} close={()=>setLb(null)}/>}
  </div>
}
