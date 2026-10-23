const API = "https://api.github.com";
function config() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) throw new Error("إعدادات GitHub غير مكتملة في Vercel Environment Variables.");
  return { token:GITHUB_TOKEN, owner:GITHUB_OWNER, repo:GITHUB_REPO };
}
async function githubFile(path) {
  const c=config(), url=`${API}/repos/${c.owner}/${c.repo}/contents/${path}`;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),7000); let res; try { res=await fetch(url,{signal:controller.signal,headers:{Authorization:`Bearer ${c.token}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}}); } finally { clearTimeout(timer); }
  if(res.status===404)return {data:null,sha:null};
  if(!res.ok)throw new Error(`تعذر قراءة ${path} من GitHub.`);
  const file=await res.json();
  const decoded=Buffer.from(file.content.replace(/\n/g,""),"base64").toString("utf8");
  return {data:JSON.parse(decoded),sha:file.sha};
}
async function writeGithubFile(path,data,message,sha) {
  const c=config(),url=`${API}/repos/${c.owner}/${c.repo}/contents/${path}`;
  const body={message,content:Buffer.from(JSON.stringify(data,null,2)+"\n","utf8").toString("base64")};
  if(sha)body.sha=sha;
  const res=await fetch(url,{method:"PUT",headers:{Authorization:`Bearer ${c.token}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok){const details=await res.text();throw new Error(res.status===409||res.status===422?"تعارض أثناء الحفظ؛ أعد المحاولة بعد لحظة.":`تعذر حفظ البيانات في GitHub (${res.status}). ${details.slice(0,120)}`);}
  return true;
}
function isAdmin(req) { const expected=process.env.ADMIN_PASSWORD; const supplied=req.headers["x-admin-password"]; return Boolean(expected && supplied && supplied===expected); }
module.exports={githubFile,writeGithubFile,isAdmin};
