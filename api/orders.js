const {githubFile,writeGithubFile,isAdmin}=require("./_github");
function id(){return "LF-"+Date.now().toString().slice(-8)+"-"+Math.random().toString(36).slice(2,6).toUpperCase();}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  try{
    if(req.method==="GET"){
      if(!isAdmin(req))return res.status(401).json({error:"يلزم تسجيل دخول المدير."});
      const {data}=await githubFile("orders.json");
      return res.status(200).json({orders:Array.isArray(data)?data:[]});
    }
    if(req.method==="POST"){
      const body=req.body||{};
      const clientName=String(body.clientName||"").trim(),clientPhone=String(body.clientPhone||"").trim(),clientNotes=String(body.clientNotes||"").trim();
      if(!clientName||!clientPhone||!body.productId)return res.status(400).json({error:"أدخل الاسم ورقم WhatsApp وتأكد من المنتج."});
      if(clientName.length>100||clientPhone.length>25||clientNotes.length>1000)return res.status(400).json({error:"بعض البيانات أطول من المسموح."});
      const prodResult=await githubFile("products.json");
      const products=Array.isArray(prodResult.data)?prodResult.data:[];
      const product=products.find(p=>String(p.id)===String(body.productId));
      if(!product)return res.status(404).json({error:"المنتج غير موجود أو لم يعد متاحًا."});
      const {data,sha}=await githubFile("orders.json");
      const orders=Array.isArray(data)?data:[];
      const order={id:id(),productId:String(product.id),productName:String(product.name),productPrice:`$${Number(product.price||0).toFixed(2)} USD`,clientName,clientPhone,clientNotes:clientNotes||"لا يوجد",date:new Date().toISOString(),status:"جديد",paymentStatus:"غير مدفوع"};
      orders.push(order);
      await writeGithubFile("orders.json",orders,"LF BOTS: new order "+order.id,sha);
      return res.status(201).json({ok:true,orderId:order.id});
    }
    if(req.method==="PATCH"){
      if(!isAdmin(req))return res.status(401).json({error:"يلزم تسجيل دخول المدير."});
      const body=req.body||{},orderId=String(body.id||"");
      const {data,sha}=await githubFile("orders.json");
      let orders=Array.isArray(data)?data:[];
      const index=orders.findIndex(o=>String(o.id)===orderId);
      if(index<0)return res.status(404).json({error:"الطلب غير موجود."});
      if(body.action==="confirm")orders[index].paymentStatus="تم التأكيد";
      else if(body.action==="delete")orders=orders.filter(o=>String(o.id)!==orderId);
      else return res.status(400).json({error:"الإجراء غير معروف."});
      await writeGithubFile("orders.json",orders,"LF BOTS: update order "+orderId,sha);
      return res.status(200).json({ok:true,orders});
    }
    res.setHeader("Allow","GET, POST, PATCH");return res.status(405).json({error:"Method not allowed"});
  }catch(e){return res.status(500).json({error:e.message||"حدث خطأ بالخادم."});}
};
