const {githubFile,writeGithubFile}=require("./_github");
const crypto=require("crypto");
const normEmail=s=>String(s||"").trim().toLowerCase();
const safeUser=u=>({id:u.id,username:u.username,email:u.email,phone:u.phone||"",referralCode:u.referralCode,points:Number(u.points||0),pointsEarned:Number(u.pointsEarned||0),pointsSpent:Number(u.pointsSpent||0),createdAt:u.createdAt});
function secret(){if(!process.env.SESSION_SECRET)throw new Error("أضف SESSION_SECRET في إعدادات Vercel.");return process.env.SESSION_SECRET;}
function b64(x){return Buffer.from(x).toString('base64url');}
function sign(payload){const data=b64(JSON.stringify(payload));return data+'.'+crypto.createHmac('sha256',secret()).update(data).digest('base64url');}
function verify(req){const h=String(req.headers.authorization||'');if(!h.startsWith('Bearer '))return null;const [data,sig]=h.slice(7).split('.');if(!data||!sig)return null;const expected=crypto.createHmac('sha256',secret()).update(data).digest();let got;try{got=Buffer.from(sig,'base64url')}catch{return null}if(got.length!==expected.length||!crypto.timingSafeEqual(got,expected))return null;let p;try{p=JSON.parse(Buffer.from(data,'base64url').toString())}catch{return null}if(!p.exp||p.exp<Date.now())return null;return p.uid;}
function hashPass(pass,salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.scryptSync(pass,salt,64).toString('hex');return {salt,hash};}
function checkPass(pass,u){const got=hashPass(pass,u.passwordSalt).hash;const a=Buffer.from(got,'hex'),b=Buffer.from(u.passwordHash||'','hex');return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function code(){return crypto.randomBytes(5).toString('hex').toUpperCase();}
function id(){return 'lf_'+crypto.randomBytes(12).toString('hex');}
async function load(path){const r=await githubFile(path);return {rows:Array.isArray(r.data)?r.data:[],sha:r.sha};}
async function save(path,rows,what,sha){return writeGithubFile(path,rows,'LF BOTS: '+what,sha);}
module.exports=async function(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}try{
 const b=req.body||{},action=String(b.action||'');let {rows:users,sha:userSha}=await load('users.json');
 if(action==='signup'){
  const username=String(b.username||'').trim(),email=normEmail(b.email),phone=String(b.phone||'').trim(),password=String(b.password||''),ref=String(b.referralCode||'').trim().toUpperCase();
  if(username.length<3||username.length>24)return res.status(400).json({error:'اسم المستخدم يجب أن يكون بين 3 و24 حرفًا.'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'أدخل بريدًا إلكترونيًا صحيحًا.'});
  if(password.length<8||password.length>200)return res.status(400).json({error:'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'});
  if(users.some(u=>u.email===email))return res.status(409).json({error:'هذا البريد مسجل مسبقًا.'});
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return res.status(409).json({error:'اسم المستخدم مستخدم بالفعل.'});
  const now=new Date().toISOString(),uid=id(),pw=hashPass(password);let inviter=null;
  if(ref){inviter=users.find(u=>u.referralCode===ref);if(!inviter)return res.status(400).json({error:'رمز الدعوة غير صحيح.'});}
  const user={id:uid,username,email,phone:phone.slice(0,24),referralCode:code(),points:0,pointsEarned:0,pointsSpent:0,passwordSalt:pw.salt,passwordHash:pw.hash,createdAt:now};
  const pointResult=await load('points.json'),pointRows=pointResult.rows;
  if(inviter){inviter.points=Number(inviter.points||0)+500;inviter.pointsEarned=Number(inviter.pointsEarned||0)+500;user.points=500;user.pointsEarned=500;pointRows.push({id:id(),userId:inviter.id,amount:500,reason:'مكافأة دعوة صديق',createdAt:now},{id:id(),userId:user.id,amount:500,reason:'مكافأة استخدام رمز دعوة',createdAt:now});}
  users.push(user);
  // Save user list first, then points log and referral log. A GitHub JSON store is not a multi-file transaction.
  await save('users.json',users,'create customer account',userSha);
  if(inviter){await save('points.json',pointRows,'referral bonus',pointResult.sha);const rr=await load('referrals.json');rr.rows.push({id:id(),referrerId:inviter.id,referredUserId:user.id,code:ref,bonusEach:500,createdAt:now});await save('referrals.json',rr.rows,'record referral',rr.sha);}
  const token=sign({uid:user.id,exp:Date.now()+7*24*60*60*1000});return res.status(201).json({ok:true,token,user:safeUser(user)});
 }
 if(action==='login'){
  const email=normEmail(b.email),pass=String(b.password||''),u=users.find(x=>x.email===email);if(!u||!checkPass(pass,u))return res.status(401).json({error:'البريد الإلكتروني أو كلمة المرور غير صحيحة.'});
  return res.status(200).json({ok:true,token:sign({uid:u.id,exp:Date.now()+7*24*60*60*1000}),user:safeUser(u)});
 }
 const uid=verify(req);if(!uid)return res.status(401).json({error:'انتهت الجلسة أو لم تسجّل الدخول. سجّل الدخول مجددًا.'});const u=users.find(x=>x.id===uid);if(!u)return res.status(401).json({error:'الحساب غير موجود.'});
 if(action==='me') {const {rows:points}=await load('points.json');return res.status(200).json({ok:true,user:safeUser(u),history:points.filter(p=>p.userId===uid).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30)});}
 if(action==='update'){
  const username=String(b.username||'').trim(),phone=String(b.phone||'').trim(),password=String(b.password||'');if(!checkPass(password,u))return res.status(403).json({error:'كلمة المرور الحالية غير صحيحة.'});if(username.length<3||username.length>24)return res.status(400).json({error:'اسم المستخدم يجب أن يكون بين 3 و24 حرفًا.'});if(users.some(x=>x.id!==uid&&x.username.toLowerCase()===username.toLowerCase()))return res.status(409).json({error:'اسم المستخدم مستخدم بالفعل.'});u.username=username;u.phone=phone.slice(0,24);await save('users.json',users,'update customer profile',userSha);return res.status(200).json({ok:true,user:safeUser(u)});
 }
 if(action==='spend'){
  const amount=Number(b.points);if(!Number.isSafeInteger(amount)||amount<1000||amount%1000!==0)return res.status(400).json({error:'يمكن استخدام النقاط بمضاعفات 1000 نقطة (كل 1000 نقطة = ريال واحد).'});if(Number(u.points||0)<amount)return res.status(400).json({error:'رصيد النقاط غير كافٍ.'});u.points-=amount;u.pointsSpent=Number(u.pointsSpent||0)+amount;await save('users.json',users,'spend store points',userSha);const pr=await load('points.json');pr.rows.push({id:id(),userId:uid,amount:-amount,reason:'استخدام نقاط في طلب متجر',createdAt:new Date().toISOString()});await save('points.json',pr.rows,'record points spend',pr.sha);return res.status(200).json({ok:true,user:safeUser(u),discountSAR:amount/1000});
 }
 return res.status(400).json({error:'الإجراء غير معروف.'});
 }catch(e){return res.status(500).json({error:e.message||'حدث خطأ بالخادم.'});}};
