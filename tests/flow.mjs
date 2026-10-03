import assert from "node:assert/strict"
const mem=new Map()
globalThis.__STORE__={async get(k,o){const v=mem.get(k);if(!v)return null;return o?.type==="json"?JSON.parse(v.v):v.v},async getWithMetadata(k){const v=mem.get(k);return v?{data:v.v,metadata:v.m}:null},async set(k,v,o){mem.set(k,{v,m:o?.metadata})},async delete(k){mem.delete(k)}}
const {default:h}=await import("../netlify/functions/api.mjs")
const O="https://site.test"
const call=async(m,p,{tok,body,raw,type}={})=>{const r=await h(new Request(O+p,{method:m,headers:{...(tok?{"x-edit-token":tok}:{}),...(body?{"content-type":"application/json"}:{}),...(raw?{"content-type":type}:{})},body:raw||(body?JSON.stringify(body):undefined)}));return{s:r.status,j:r.status===204||!(r.headers.get("content-type")||"").includes("json")?null:await r.json(),r}}
const jpg=()=>{const b=new Uint8Array(500);b.set([0xff,0xd8,0xff,0xe0]);return b}
const make=async(n,c)=>{const r=await call("POST","/api/birthday",{body:{recipient_name:n,creator_name:c,birthday_date:"October 10"}});assert.equal(r.s,201);return{id:r.j.id,tok:r.j.edit_token,d:r.j.data}}
const A=await make("Ananya","Imran"),B=await make("Sara","Ali")
for(const s of A.d.sections){
  if(s.type==="letter")s.data.text="Dear Ananya,\n\nI made this."
  if(s.type==="memories")for(let i=0;i<3;i++){const u=await call("POST",`/api/birthday/${A.id}/media`,{tok:A.tok,raw:jpg(),type:"image/jpeg"});assert.equal(u.s,201);s.data.items.push({title:"M"+i,image:u.j.url})}
  if(s.type==="messages")s.data.items=["a","b","c"]}
A.d.theme.name="dark";A.d.theme.accent="#a855f7"
assert.equal((await call("PUT","/api/birthday/"+A.id,{tok:A.tok,body:A.d})).s,200)
const pa=(await call("POST",`/api/birthday/${A.id}/publish`,{tok:A.tok})).j,pb=(await call("POST",`/api/birthday/${B.id}/publish`,{tok:B.tok})).j
assert.ok(pa.public_id.length>=10&&pa.public_id!==pb.public_id&&pa.url===`${O}/birthday/${pa.public_id}`)
assert.equal((await call("GET","/api/public/birthday/"+pa.public_id)).j.data.recipient_name,"Ananya")
assert.equal((await call("GET","/api/public/birthday/"+pb.public_id)).j.data.recipient_name,"Sara")
assert.equal((await call("GET","/api/public/birthday/nope")).s,404)
A.d.recipient_name="Changed";await call("PUT","/api/birthday/"+A.id,{tok:A.tok,body:A.d})
assert.equal((await call("GET","/api/public/birthday/"+pa.public_id)).j.data.recipient_name,"Ananya")   // snapshot until republish
assert.equal((await call("GET","/api/birthday/"+A.id,{tok:A.tok})).j.has_unpublished_changes,true)
const pubText=JSON.stringify((await call("GET","/api/public/birthday/"+pa.public_id)).j);assert.ok(!pubText.includes(A.id)&&!pubText.includes("tokenHash"))
assert.equal((await call("PUT","/api/birthday/"+A.id,{tok:B.tok,body:A.d})).s,404)
assert.equal((await call("GET","/api/birthday/"+A.id)).s,404)
const img=(await call("GET",A.d.sections.find(s=>s.type==="memories").data.items[0].image));assert.equal(img.s,200);assert.equal(img.r.headers.get("content-type"),"image/jpeg")
assert.equal((await call("POST",`/api/birthday/${A.id}/media`,{tok:A.tok,raw:new TextEncoder().encode("<script>alert(1)</script>"),type:"image/png"})).s,400)
assert.equal((await call("POST",`/api/birthday/${A.id}/media`,{tok:A.tok,raw:new Uint8Array(5*1024*1024),type:"image/jpeg"})).s,413)
assert.equal((await call("PUT","/api/birthday/"+A.id,{tok:A.tok,body:{...A.d,theme:{...A.d.theme,accent:"red;x"}}})).s,422)
assert.equal((await call("PUT","/api/birthday/"+A.id,{tok:A.tok,body:{...A.d,sections:[{type:"hack",data:{}}]}})).s,422)
assert.equal((await call("DELETE","/api/birthday/"+B.id,{tok:B.tok})).s,204)
assert.equal((await call("GET","/api/birthday/"+B.id,{tok:B.tok})).s,404)
console.log("ALL TESTS PASSED")
