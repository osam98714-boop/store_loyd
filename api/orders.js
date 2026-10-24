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
      const basePrice=Number(product.price||0);
      if(!Number.isFinite(basePrice)||basePrice<0)return res.status(400).json({error:"سعر المنتج غير صالح."});
      let discount=0,couponCode="";
      const suppliedCode=String(body.couponCode||"").trim().toUpperCase();
      if(suppliedCode){
        const cr=await githubFile("coupons.json"),coupons=Array.isArray(cr.data)?cr.data:[];
        const coupon=coupons.find(c=>String(c.code||"").toUpperCase()===suppliedCode);
        if(!coupon||coupon.active===false||(coupon.expiresAt&&Date.parse(coupon.expiresAt)<=Date.now())||(coupon.maxUses&&Number(coupon.uses||0)>=Number(coupon.maxUses)))return res.status(400).json({error:"كود الخصم غير صالح أو منتهي أو استُنفدت استخداماته."});
        const value=Number(coupon.value||0);
        if(!Number.isFinite(value)||value<=0||(coupon.type==="percent"&&value>100))return res.status(400).json({error:"إعدادات كود الخصم غير صحيحة."});
        discount=coupon.type==="fixed"?Math.min(basePrice,value):basePrice*Math.min(value,100)/100;
        discount=Number(discount.toFixed(2));couponCode=suppliedCode;
        coupon.uses=Number(coupon.uses||0)+1;
        await writeGithubFile("coupons.json",coupons,"LF BOTS: redeem coupon "+suppliedCode,cr.sha);
      }
      const finalPrice=Number(Math.max(0,basePrice-discount).toFixed(2));
      const {data,sha}=await githubFile("orders.json");
      const orders=Array.isArray(data)?data:[];
      const order={id:id(),productId:String(product.id),productName:String(product.name),productPrice:`$${basePrice.toFixed(2)} USD`,priceValue:basePrice,discountValue:discount,finalPrice, couponCode,clientName,clientPhone,clientNotes:clientNotes||"لا يوجد",date:new Date().toISOString(),status:"جديد",paymentStatus:"غير مدفوع"};
      orders.push(order);
      await writeGithubFile("orders.json",orders,"LF BOTS: new order "+order.id,sha);
      return res.status(201).json({ok:true,orderId:order.id,basePrice,discount,finalPrice,couponCode});
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
