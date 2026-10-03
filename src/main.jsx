import {createRoot} from 'react-dom/client'
import {useState,useEffect} from 'react'
import './styles.css'
import {Create,Editor} from './Editor.jsx'
import {PublicPage} from './Public.jsx'
function App(){
  const [p,setP]=useState(location.pathname)
  useEffect(()=>{const f=()=>setP(location.pathname);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[])
  window.go=to=>{history.pushState(null,'',to);setP(to)}
  let m
  if((m=p.match(/^\/birthday\/([\w-]+)$/)))return <PublicPage pid={m[1]}/>
  if((m=p.match(/^\/editor\/([\w-]+)$/)))return <Editor id={m[1]}/>
  return <Create/>
}
createRoot(document.getElementById('root')).render(<App/>)
