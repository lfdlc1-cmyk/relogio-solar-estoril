// RELOGIO SOLAR - LOCALIZACAO AUTOMATICA
// Executar primeiro na app Scriptable para autorizar a localizacao.
// Depois adicionar como widget GRANDE.

const widget = new ListWidget();
widget.backgroundColor = new Color("#000000");
widget.setPadding(8, 8, 8, 8);

const W = 338, H = 330;
const ctx = new DrawContext();
ctx.size = new Size(W, H);
ctx.opaque = true;
ctx.respectScreenScale = true;

const white = new Color("#FFFFFF");
const grey = new Color("#777777");
const yellow = new Color("#FFE52B");
const orange = new Color("#FFAE00");
const black = new Color("#000000");

function drawText(str, x, y, w, h, size, color, bold=false) {
  ctx.setTextColor(color);
  ctx.setFont(bold ? Font.boldSystemFont(size) : Font.lightSystemFont(size));
  ctx.drawTextInRect(String(str), new Rect(x,y,w,h));
}
function drawCircle(x,y,r,color) {
  ctx.setFillColor(color);
  ctx.fillEllipse(new Rect(x-r,y-r,r*2,r*2));
}
function drawLine(x1,y1,x2,y2,color,width) {
  const p = new Path(); p.move(new Point(x1,y1)); p.addLine(new Point(x2,y2));
  ctx.addPath(p); ctx.setStrokeColor(color); ctx.setLineWidth(width); ctx.strokePath();
}
function solar(date, lat, lon) {
  const day = Math.floor((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-Date.UTC(date.getFullYear(),0,0))/86400000);
  const g = 2*Math.PI/365*(day-1);
  const eq = 229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec = 0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const rad = Math.PI/180;
  const c = Math.cos(90.833*rad)/(Math.cos(lat*rad)*Math.cos(dec))-Math.tan(lat*rad)*Math.tan(dec);
  const ha = Math.acos(Math.max(-1,Math.min(1,c)));
  const noon = 720-4*lon-eq, offset = -date.getTimezoneOffset();
  function fmt(v) {
    const n=(Math.round(v+offset)+1440)%1440;
    return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  }
  return {rise:noon-4*ha/rad,set:noon+4*ha/rad,fmt};
}

let lat = 38.705, lon = -9.397, place = "LOCALIZACAO";
let locationStatus = "LOCALIZACAO NAO DISPONIVEL";

try {
  Location.setAccuracyToThreeKilometers();
  const loc = await Location.current();
  lat = loc.latitude;
  lon = loc.longitude;
  locationStatus = "LOCALIZACAO ACTUALIZADA";
  try {
    const results = await Location.reverseGeocode(lat,lon);
    if (results && results.length) {
      const r = results[0];
      place = r.locality || r.subLocality || r.subAdministrativeArea || r.administrativeArea || "LOCAL ACTUAL";
      place = String(place).toLocaleUpperCase("pt-PT");
    }
  } catch(e) {
    place = "LOCAL ACTUAL";
  }
} catch(e) {
  // Se a localizacao ainda nao estiver autorizada, usa Estoril como alternativa.
  place = "ESTORIL";
}

const now = new Date();
const sun = solar(now,lat,lon);
const minutes = now.getHours()*60+now.getMinutes();
const progress = Math.max(0,Math.min(1,(minutes-sun.rise)/(sun.set-sun.rise)));

ctx.setFillColor(black);
ctx.fillRect(new Rect(0,0,W,H));
const cx=169, cy=145, radius=126;
ctx.setStrokeColor(grey); ctx.setLineWidth(1.5);
ctx.strokeEllipse(new Rect(cx-radius,cy-radius,radius*2,radius*2));

const baseArc=new Path();
for(let i=0;i<=100;i++){
  const a=(-90+i*3.6)*Math.PI/180;
  const p=new Point(cx+radius*Math.cos(a),cy+radius*Math.sin(a));
  if(i===0) baseArc.move(p); else baseArc.addLine(p);
}
ctx.addPath(baseArc); ctx.setStrokeColor(new Color("#444444")); ctx.setLineWidth(5); ctx.strokePath();

const activeArc=new Path();
for(let i=0;i<=Math.round(progress*100);i++){
  const a=(-90+i*3.6)*Math.PI/180;
  const p=new Point(cx+radius*Math.cos(a),cy+radius*Math.sin(a));
  if(i===0) activeArc.move(p); else activeArc.addLine(p);
}
ctx.addPath(activeArc); ctx.setStrokeColor(orange); ctx.setLineWidth(5); ctx.strokePath();

const angle=(-90+progress*360)*Math.PI/180;
const sx=cx+radius*Math.cos(angle), sy=cy+radius*Math.sin(angle);
drawCircle(sx,sy,12,new Color("#664900")); drawCircle(sx,sy,6,yellow);

const time=now.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit",hour12:false});
const date=now.toLocaleDateString("pt-PT",{weekday:"short",day:"2-digit",month:"short"}).replace(/\\./g,"").toUpperCase();
drawText(time,55,119,228,52,53,white);
drawText(date,80,171,178,27,17,white);

drawText("☀",73,263,45,30,22,yellow);
drawText("☀",234,263,45,30,22,orange);
drawText(sun.fmt(sun.rise),40,286,100,34,23,white);
drawText(sun.fmt(sun.set),198,286,100,34,23,white);
drawLine(169,264,169,319,grey,1);
drawText(place,70,320,198,20,12,white,true);

widget.backgroundImage=ctx.getImage();
widget.refreshAfterDate=new Date(Date.now()+30*60*1000);
widget.url="scriptable:///run";
Script.setWidget(widget);
Script.complete();
