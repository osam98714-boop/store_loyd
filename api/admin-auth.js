module.exports=async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
  const {username,password} = req.body || {};
  if(!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD)return res.status(500).json({error:"أضف ADMIN_USER و ADMIN_PASSWORD في إعدادات Vercel."});
  if(String(username||"")!==process.env.ADMIN_USER || String(password||"")!==process.env.ADMIN_PASSWORD)return res.status(401).json({error:"بيانات الدخول غير صحيحة."});
  return res.status(200).json({ok:true});
};
