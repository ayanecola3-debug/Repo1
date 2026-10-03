const tok=id=>localStorage.getItem('bt:'+id)||''
async function req(path,{method='GET',body,id,raw}={}){
  let r
  try{r=await fetch(path,{method,headers:{...(id?{'X-Edit-Token':tok(id)}:{}),...(body?{'Content-Type':'application/json'}:{}),...(raw?{'Content-Type':raw.type}:{})},body:raw||(body?JSON.stringify(body):undefined)})}
  catch{throw new Error('Please check your connection and try again.')}
  if(r.status===204)return null
  const j=await r.json().catch(()=>({}))
  if(!r.ok)throw Object.assign(new Error(typeof j.detail==='string'?j.detail:'Something went wrong. Please check your input.'),{status:r.status})
  return j
}
async function shrink(file){ // resize + re-encode in the browser (also strips EXIF/GPS)
  let bmp;try{bmp=await createImageBitmap(file)}catch{throw new Error('Unsupported image. Use JPEG, PNG, WebP or GIF.')}
  const k=Math.min(1,1600/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas')
  c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k)
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height)
  const b=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.85));if(!b)throw new Error('Image upload failed.');return b
}
export const api={
  create:b=>req('/api/birthday',{method:'POST',body:b}),
  get:id=>req('/api/birthday/'+id,{id}),
  save:(id,d)=>req('/api/birthday/'+id,{method:'PUT',body:d,id}),
  publish:id=>req(`/api/birthday/${id}/publish`,{method:'POST',id}),
  remove:id=>req('/api/birthday/'+id,{method:'DELETE',id}),
  upload:async(id,file)=>{try{return await req(`/api/birthday/${id}/media`,{method:'POST',id,raw:await shrink(file)})}catch(e){throw new Error(e.message&&e.message!=='Something went wrong. Please check your input.'?e.message:'Image upload failed.')}},
  pub:p=>req('/api/public/birthday/'+p),
  setToken:(id,t)=>localStorage.setItem('bt:'+id,t)
}
