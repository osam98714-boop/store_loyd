const {githubFile,writeGithubFile,isAdmin}=require("./_github");
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  try{
    if(req.method==="GET"){
      const {data}=await githubFile("products.json");
      return res.status(200).json(Array.isArray(data)?data:[]);
    }
    if(!isAdmin(req))return res.status(401).json({error:"يلزم تسجيل دخول المدير."});
    const {data,sha}=await githubFile("products.json");
    const products=Array.isArray(data)?data:[];
    if(req.method==="POST"){
      const p=req.body||{};
      if(!p.name||!p.category||!p.desc||!Number.isFinite(Number(p.price))||Number(p.price)<0)return res.status(400).json({error:"بيانات المنتج غير مكتملة."});
      if(products.some(x=>String(x.id)===String(p.id)))return res.status(409).json({error:"معرّف المنتج موجود مسبقًا."});
      products.push({id:String(p.id||("bot_"+Date.now())),name:String(p.name).slice(0,120),price:Number(p.price),category:String(p.category).slice(0,80),lang:String(p.lang||"").slice(0,80),tag:String(p.tag||"متوفر").slice(0,40),img:String(p.img||"").slice(0,1000),desc:String(p.desc).slice(0,2000)});
      await writeGithubFile("products.json",products,"LF BOTS: add product",sha);
      return res.status(200).json({ok:true,products});
    }
    if(req.method==="DELETE"){
      const id=String((req.body||{}).id||"");
      const updated=products.filter(p=>String(p.id)!==id);
      if(updated.length===products.length)return res.status(404).json({error:"المنتج غير موجود."});
      await writeGithubFile("products.json",updated,"LF BOTS: delete product",sha);
      return res.status(200).json({ok:true,products:updated});
    }
    res.setHeader("Allow","GET, POST, DELETE");return res.status(405).json({error:"Method not allowed"});
  }catch(e){return res.status(500).json({error:e.message||"حدث خطأ بالخادم."});}
};
