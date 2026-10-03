// Birthday Surprise API as a Netlify Function (v2). Storage: Netlify Blobs (no external DB needed).
import {getStore} from "@netlify/blobs"
import {randomBytes,randomUUID,createHash,timingSafeEqual} from "node:crypto"

export const config={path:["/api/*","/media/*"]}
const store=()=>globalThis.__STORE__||getStore({name:"birthday",consistency:"strong"})
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}})
const E=(s,m)=>J({detail:m},s)
const hash=t=>createHash("sha256").update(t).digest("hex")
const MAX_IMG=4*1024*1024,MAX_MEDIA=60
const TYPES=["intro","wish","letter","memories","gallery","messages","reasons","timeline","reveal","final"]
const clean=s=>s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"")
const oneOf=(v,list,d)=>v===undefined?d:list.includes(v)?v:null
const hex=(v,d)=>v===undefined?d:typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v)?v:null
const txt=(v,max,min=0)=>{if(v===undefined)return "";if(typeof v!=="string")return null;const c=clean(v).trim();return c.length>=min&&c.length<=max?c:null}

function walk(x,depth=0){
  if(depth>4)throw 0
  if(typeof x==="string"){if(x.length>8000)throw 0;return clean(x)}
  if(Array.isArray(x)){if(x.length>60)throw 0;return x.map(i=>walk(i,depth+1))}
  if(x&&typeof x==="object")return Object.fromEntries(Object.entries(x).map(([k,v])=>[k.slice(0,40),walk(v,depth+1)]))
  return typeof x==="number"||typeof x==="boolean"||x===null?x:String(x)
}
function validate(b){
  try{
    if(!b||typeof b!=="object")return null
    const t=b.theme||{},a=b.audio||{}
    const d={recipient_name:txt(b.recipient_name,80,1),creator_name:txt(b.creator_name,80),birthday_date:txt(b.birthday_date,40),relationship:txt(b.relationship,40),
      theme:{name:oneOf(t.name,["romantic","cute","elegant","minimal","colorful","dark","classic"],"romantic"),background:hex(t.background,"#fff1f2"),text:hex(t.text,"#3b0a1e"),accent:hex(t.accent,"#e11d48"),
        font:oneOf(t.font,["serif","sans","script","mono"],"serif"),button:oneOf(t.button,["pill","rounded","square"],"pill"),animation:oneOf(t.animation,["none","gentle","festive"],"gentle"),backdrop:oneOf(t.backdrop,["plain","hearts","confetti","stars"],"hearts")},
      audio:{enabled:a.enabled===true,url:typeof a.url==="string"&&a.url.length<=300&&/^(\/media\/|https:\/\/)/.test(a.url)?a.url:null,volume:typeof a.volume==="number"&&a.volume>=0&&a.volume<=1?a.volume:0.5}}
    if(Object.values(d).some(v=>v===null)||Object.values(d.theme).some(v=>v===null))return null
    if(!Array.isArray(b.sections)||b.sections.length>30)return null
    d.sections=b.sections.map(s=>{if(!s||!TYPES.includes(s.type))throw 0
      return{id:typeof s.id==="string"?s.id.replace(/[^\w-]/g,"").slice(0,32)||randomUUID().slice(0,8):randomUUID().slice(0,8),type:s.type,enabled:s.enabled!==false,data:walk(s.data&&typeof s.data==="object"&&!Array.isArray(s.data)?s.data:{})}})
    return d
  }catch{return null}
}
const defaults=n=>[
  ["intro",{title:`A little something for ${n}`,subtitle:"Today is your special day",button:"Open your surprise"}],
  ["wish",{title:"Happy Birthday",text:`Happy Birthday, ${n}!`}],["letter",{title:"A letter for you",text:`Dear ${n},\n\n`}],
  ["memories",{title:"Our memories",items:[]}],["messages",{title:"A few words",items:[]}],
  ["reveal",{teaser:"There's one more thing...",button:"Open",title:`Happy Birthday, ${n}!`,text:""}],
  ["final",{title:`Happy Birthday, ${n}`,text:"",replay:"Replay the journey"}]
].map(([type,data])=>({id:randomUUID().slice(0,8),type,enabled:true,data}))

const view=(p,id,origin)=>({id,data:p.data,public_id:p.publicId||null,published_at:p.publishedAt||null,
  has_unpublished_changes:!!p.publishedData&&JSON.stringify(p.publishedData)!==JSON.stringify(p.data),url:p.publicId?`${origin}/birthday/${p.publicId}`:null})
const sniff=b=>{const u=new Uint8Array(b.slice(0,12));
  if(u[0]===0xff&&u[1]===0xd8&&u[2]===0xff)return"image/jpeg"
  if(u[0]===0x89&&u[1]===0x50&&u[2]===0x4e&&u[3]===0x47)return"image/png"
  if(u[0]===0x47&&u[1]===0x49&&u[2]===0x46)return"image/gif"
  if(u[0]===0x52&&u[1]===0x49&&u[2]===0x46&&u[3]===0x46&&u[8]===0x57&&u[9]===0x45&&u[10]===0x42&&u[11]===0x50)return"image/webp"
  return null}

export default async function handler(req){
  const url=new URL(req.url),parts=url.pathname.split("/").filter(Boolean),m=req.method,S=store()
  try{
    if(parts[0]==="media"&&parts.length===2&&m==="GET"){ // /media/:mediaId (random, no project id)
      const r=await S.getWithMetadata(`m/${parts[1].slice(0,40)}`,{type:"arrayBuffer"})
      if(!r)return E(404,"Image not found.")
      return new Response(r.data,{headers:{"content-type":r.metadata?.type||"image/jpeg","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})
    }
    if(parts[0]!=="api")return E(404,"Not found.")
    if(parts[1]==="public"&&parts[2]==="birthday"&&parts[3]&&m==="GET"){
      const s=await S.get("pub/"+parts[3].slice(0,40),{type:"json"})
      return s?J({data:s.data}):E(404,"Birthday experience not found.")
    }
    if(parts[1]!=="birthday")return E(404,"Not found.")
    if(parts.length===2&&m==="POST"){
      const b=await req.json().catch(()=>null);const base=b&&{recipient_name:b.recipient_name,creator_name:b.creator_name,birthday_date:b.birthday_date,relationship:b.relationship}
      const n=base&&txt(base.recipient_name,80,1);if(!n)return E(422,"Please enter the recipient's name.")
      const d=validate({...base,sections:defaults(n)});if(!d)return E(422,"Please check your input.")
      const id=randomUUID(),token=randomBytes(24).toString("base64url")
      const p={tokenHash:hash(token),data:d,media:[]};await S.set("p/"+id,JSON.stringify(p))
      return J({...view(p,id,url.origin),edit_token:token},201)
    }
    const id=parts[2]
    if(!id)return E(404,"Not found.")
    const p=await S.get("p/"+id.slice(0,40),{type:"json"})
    const tok=req.headers.get("x-edit-token")||""
    const okTok=p&&(()=>{const a=Buffer.from(p.tokenHash),b=Buffer.from(hash(tok));return a.length===b.length&&timingSafeEqual(a,b)})()
    if(!okTok)return E(404,"Birthday experience not found.") // same error either way
    const save=()=>S.set("p/"+id,JSON.stringify(p))
    if(parts.length===3){
      if(m==="GET")return J(view(p,id,url.origin))
      if(m==="PUT"){const d=validate(await req.json().catch(()=>null));if(!d)return E(422,"Please check your input.");p.data=d;await save();return J(view(p,id,url.origin))}
      if(m==="DELETE"){for(const x of p.media)await S.delete(`m/${x}`);if(p.publicId)await S.delete("pub/"+p.publicId);await S.delete("p/"+id);return new Response(null,{status:204})}
    }
    if(parts[3]==="publish"&&m==="POST"){
      if(!p.publicId){for(;;){const c=randomBytes(9).toString("base64url").replace(/-/g,"x").replace(/_/g,"y").slice(0,12);if(!await S.get("pub/"+c)){p.publicId=c;break}}}
      p.publishedData=p.data;p.publishedAt=new Date().toISOString()
      await S.set("pub/"+p.publicId,JSON.stringify({data:p.data}));await save()
      return J(view(p,id,url.origin))
    }
    if(parts[3]==="media"){
      if(m==="POST"&&parts.length===4){
        if(p.media.length>=MAX_MEDIA)return E(400,"Photo limit reached for this project.")
        const buf=await req.arrayBuffer()
        if(buf.byteLength>MAX_IMG)return E(413,"Image is too large (max 4 MB).")
        const type=sniff(buf);if(!type)return E(400,"Unsupported image. Use JPEG, PNG, WebP or GIF.") // content sniffing, not extension
        const mid=randomBytes(16).toString("hex");await S.set(`m/${mid}`,buf,{metadata:{type}});p.media.push(mid);await save()
        const u=`/media/${mid}`;return J({id:mid,url:u,thumb_url:u},201)
      }
      if(m==="DELETE"&&parts[4]){if(!p.media.includes(parts[4]))return E(404,"Image not found.");await S.delete(`m/${parts[4]}`);p.media=p.media.filter(x=>x!==parts[4]);await save();return new Response(null,{status:204})}
    }
    return E(404,"Not found.")
  }catch(e){console.error(e);return E(500,"Unable to complete the request. Please try again.")}
}
