import {useState,useEffect} from 'react'
import {api} from './api.js'
import {RecipientExperience} from './Experience.jsx'
export function PublicPage({pid}){
  const [d,setD]=useState(null),[err,setErr]=useState('')
  useEffect(()=>{api.pub(pid).then(r=>setD(r.data)).catch(e=>setErr(e.message))},[pid])
  if(err)return <div className="center"><h1>{err}</h1></div>
  if(!d)return <div className="center"><p>Loading birthday experience…</p></div>
  return <RecipientExperience data={d}/>
}
